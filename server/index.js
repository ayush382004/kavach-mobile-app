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
  /\.onrender\.com$/,
  // Mobile app origins
  'capacitor://localhost',
  'https://localhost',
  'http://localhost',
  'http://localhost:5173',
  'http://localhost:5174',
  /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
  /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
  /^http:\/\/172\.\d+\.\d+\.\d+:\d+$/,
];

// Add specific CLIENT_URL if defined in environment
if (process.env.CLIENT_URL) {
  ALLOWED_ORIGINS.push(process.env.CLIENT_URL);
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) return callback(null, true);
    
    const isRender = origin.endsWith('.onrender.com');
    const isLocal = origin.includes('localhost') || origin.includes('192.168.') || origin.includes('10.') || origin.includes('172.');
    const isCustomClient = process.env.CLIENT_URL && origin === process.env.CLIENT_URL;

    if (isRender || isLocal || isCustomClient) {
      return callback(null, true);
    }
    
    // Return false instead of Error to avoid crashing the request chain
    return callback(null, false);
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

// ─── Root Route ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>KavachForWork API | Online</title>
        <style>
            body { 
                margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                background: #0f172a; color: white; display: flex; align-items: center; 
                justify-content: center; min-height: 100vh; overflow: hidden;
            }
            .container { 
                text-align: center; background: rgba(30, 41, 59, 0.7); 
                padding: 3rem; border-radius: 20px; border: 1px solid rgba(251, 146, 60, 0.2);
                backdrop-filter: blur(10px); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                max-width: 90%; width: 500px;
            }
            .logo { font-size: 4rem; margin-bottom: 1rem; }
            h1 { color: #fb923c; margin: 0; font-size: 2rem; letter-spacing: -0.5px; }
            p { color: #94a3b8; margin: 1rem 0 2rem; line-height: 1.6; }
            .status-badge {
                display: inline-flex; align-items: center; background: rgba(34, 197, 94, 0.1);
                color: #4ade80; padding: 0.5rem 1rem; border-radius: 9999px;
                font-size: 0.875rem; font-weight: 600; border: 1px solid rgba(34, 197, 94, 0.2);
                margin-bottom: 2rem;
            }
            .status-dot { width: 8px; height: 8px; background: #4ade80; border-radius: 50%; margin-right: 8px; box-shadow: 0 0 10px #4ade80; }
            .btn {
                display: inline-block; background: #2563eb; color: white; 
                padding: 0.75rem 1.5rem; border-radius: 10px; text-decoration: none;
                font-weight: 600; transition: all 0.2s; border: none; cursor: pointer;
            }
            .btn:hover { background: #1d4ed8; transform: translateY(-2px); }
            .footer { margin-top: 2rem; font-size: 0.75rem; color: #475569; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">🛡️</div>
            <div class="status-badge"><span class="status-dot"></span>Online</div>
            <h1>KavachForWork API</h1>
            <p>The backend shield is active. All systems are monitoring extreme heat data and protecting workers across India.</p>
            <a href="/health" class="btn">View API Health</a>
            <div class="footer">Environment: ${process.env.NODE_ENV || 'production'} | Node: ${process.versions.node}</div>
        </div>
    </body>
    </html>
  `);
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'KavachForWork API',
    timestamp: new Date().toISOString(),
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
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

// ─── Temporary Admin Setup ────────────────────────────────────────────────────
app.get('/api/admin-setup', async (req, res) => {
  try {
    const User = require('./models/User');
    const { resolvePricing } = require('./utils/pricing');
    const existing = await User.findOne({ role: 'admin' });
    if (existing) return res.json({ message: 'Admin already seeded.' });
    
    const adminPricing = resolvePricing('Maharashtra', 'Mumbai');
    await User.create({
      name: 'Kavach Admin',
      phone: '9999999999',
      email: 'admin@kavachforwork.in',
      password: process.env.ADMIN_PASSWORD || 'Admin@Kavach2024',
      role: 'admin',
      city: 'Mumbai',
      state: 'Maharashtra',
      weeklyPremium: adminPricing.weeklyPremium,
      maxPayout: adminPricing.maxPayout,
      pricingCategory: adminPricing.category,
      pricingLabel: adminPricing.label,
      avgDailyWageRef: adminPricing.avgDailyWageRef,
      wallet: { balance: 0 },
    });
    res.json({ message: 'Admin seeded successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
