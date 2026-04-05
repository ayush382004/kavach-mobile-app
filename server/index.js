/**
 * KavachForWork - Main Server Entry Point
 * Node.js + Express + Socket.io + MongoDB
 */

const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const { resolveMongoUri } = require('./utils/mongoUri');

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const claimRoutes = require('./routes/claims');
const adminRoutes = require('./routes/admin');
const weatherRoutes = require('./routes/weather');
const walletRoutes = require('./routes/wallet');
const paymentRoutes = require('./routes/payments');
const payoutRoutes = require('./routes/payouts');
const chatbotRoutes = require('./routes/chatbot');

// Cron jobs
const { deductWeeklyPremiums } = require('./cron/premiums');

const app = express();
const server = http.createServer(app);

// Render sits behind a proxy, so trust the forwarded client IP for rate limiting and auth logs.
app.set('trust proxy', 1);

// ─── Socket.io Setup ─────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const allowed = [
        /^https:\/\/[a-z0-9-]+\.onrender\.com$/,
        'capacitor://localhost', 'https://localhost', 'http://localhost',
        'http://localhost:5173', 'http://localhost:5174',
      ];
      if (allowed.some(o => typeof o === 'string' ? o === origin : o.test(origin))) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Expose io to routes for real-time admin sync
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  socket.on('join_admin', () => {
    socket.join('admin_room');
    console.log(`[Socket] Admin joined: ${socket.id}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// ─── Middleware ───────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  // Live Render frontend (any subdomain on onrender.com)
  /^https:\/\/[a-z0-9-]+\.onrender\.com$/,
  // Capacitor Android app origins
  'capacitor://localhost',
  'https://localhost',
  'http://localhost',
  // Vite dev server
  'http://localhost:5173',
  'http://localhost:5174',
  // LAN access from phones during development
  /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
  /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
  /^http:\/\/172\.\d+\.\d+\.\d+:\d+$/,
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, cURL)
    if (!origin) return callback(null, true);
    const allowed = ALLOWED_ORIGINS.some(o =>
      typeof o === 'string' ? o === origin : o.test(origin)
    );
    if (allowed) return callback(null, true);
    console.warn('[CORS] Blocked origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Global rate limiter - 100 requests per 15 min per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'KavachForWork API',
    timestamp: new Date().toISOString(),
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/chatbot', chatbotRoutes);

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ─── MongoDB Connection ───────────────────────────────────────────────────────
const MONGODB_URI = resolveMongoUri();

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('[DB] Connected to MongoDB');
    startServer();
  })
  .catch((err) => {
    console.error('[DB] Connection failed:', err.message);
    process.exit(1);
  });

function startServer() {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`[Server] KavachForWork running on port ${PORT}`);
    console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  // ─── Cron Jobs ──────────────────────────────────────────────────────────────
  // Every Monday at 6:00 AM IST — deduct weekly premium ₹29 from active users
  cron.schedule('0 6 * * 1', () => {
    console.log('[Cron] Running weekly premium deduction...');
    deductWeeklyPremiums(io);
  }, { timezone: 'Asia/Kolkata' });

  console.log('[Cron] Weekly premium scheduler active (Mondays 6AM IST)');
}

module.exports = { app, io };
