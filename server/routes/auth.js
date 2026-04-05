const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { resolvePricing, canonicalizeState } = require('../utils/pricing');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

router.post(
  '/register',
  authLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
    body('phone').matches(/^[6-9]\d{9}$/).withMessage('Valid Indian mobile number required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('workerType').isIn(['delivery_driver', 'construction_worker', 'street_vendor', 'other']),
    body('state').trim().notEmpty().withMessage('State is required'),
    body('city').trim().notEmpty().withMessage('City is required'),
    body('termsAccepted').custom((value) => value === true).withMessage('You must accept the terms and conditions.'),
    body('locationVerification.latitude').isFloat().withMessage('Live location latitude is required'),
    body('locationVerification.longitude').isFloat().withMessage('Live location longitude is required'),
    body('locationVerification.detectedState').trim().notEmpty().withMessage('Detected state is required'),
    body('locationVerification.detectedCity').trim().notEmpty().withMessage('Detected city is required'),
    body('locationVerification.verifiedAt').notEmpty().withMessage('Location verification timestamp is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        name,
        phone,
        email,
        password,
        workerType,
        city,
        state,
        termsAccepted,
        locationVerification,
      } = req.body;

      const selectedState = canonicalizeState(state || 'Rajasthan');
      const detectedState = canonicalizeState(locationVerification?.detectedState || '');
      const pricing = resolvePricing(selectedState, city);

      if (selectedState !== detectedState) {
        return res.status(400).json({
          error: `Selected state ${selectedState} does not match detected location ${detectedState}.`,
          code: 'LOCATION_STATE_MISMATCH',
        });
      }

      const existingUser = await User.findOne({
        $or: [{ phone }, ...(email ? [{ email }] : [])],
      });
      if (existingUser) {
        return res.status(409).json({ error: 'Account with this phone or email already exists.' });
      }

      const verifiedAt = new Date(locationVerification.verifiedAt);

      const user = await User.create({
        name,
        phone,
        email,
        password,
        workerType,
        city,
        state: selectedState,
        weeklyPremium: pricing.weeklyPremium,
        maxPayout: pricing.maxPayout,
        pricingCategory: pricing.category,
        pricingLabel: pricing.label,
        avgDailyWageRef: pricing.avgDailyWageRef,
        wallet: { balance: 100 },
        termsAccepted: !!termsAccepted,
        termsAcceptedAt: verifiedAt,
        lastLocation: {
          lat: locationVerification.latitude,
          lng: locationVerification.longitude,
          city: locationVerification.detectedCity,
          state: detectedState,
          accuracy: locationVerification.accuracy,
          provider: locationVerification.provider || 'browser_geolocation',
          verifiedAt,
          source: 'registration_location_api',
          updatedAt: verifiedAt,
        },
      });

      const token = generateToken(user._id);

      res.status(201).json({
        message: 'Account created successfully! Rs 100 signup bonus added to wallet.',
        token,
        user: user.toPublic(),
      });
    } catch (err) {
      console.error('[Auth] Register error:', err.message);
      res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
  }
);

router.post(
  '/login',
  authLimiter,
  [
    body('phone').matches(/^[6-9]\d{9}$/).withMessage('Valid phone number required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { phone, password } = req.body;
      const user = await User.findOne({ phone, role: 'user' }).select('+password');
      if (!user) {
        return res.status(401).json({ error: 'Invalid phone number or password.' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid phone number or password.' });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: 'Account deactivated. Contact support.' });
      }

      user.lastLogin = new Date();
      await user.save();

      const token = generateToken(user._id);
      res.json({
        message: 'Login successful',
        token,
        user: user.toPublic(),
      });
    } catch (err) {
      console.error('[Auth] Login error:', err.message);
      res.status(500).json({ error: 'Login failed. Please try again.' });
    }
  }
);

router.post(
  '/admin/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;
      const admin = await User.findOne({ email: email.toLowerCase(), role: 'admin' }).select('+password');
      if (!admin) {
        return res.status(401).json({ error: 'Invalid credentials.' });
      }

      const isMatch = await admin.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials.' });
      }

      const token = generateToken(admin._id);
      res.json({
        message: 'Admin login successful',
        token,
        user: admin.toPublic(),
      });
    } catch (err) {
      console.error('[Auth] Admin login error:', err.message);
      res.status(500).json({ error: 'Admin login failed.' });
    }
  }
);

router.post(
  '/forgot-password',
  authLimiter,
  [body('phone').matches(/^[6-9]\d{9}$/).withMessage('Valid Indian mobile number required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { phone } = req.body;
      const user = await User.findOne({ phone, role: 'user' });
      if (!user) return res.status(404).json({ error: 'No account found with this number.' });

      // Generate 6 digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.otp = otp;
      user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await user.save();

      const sms = require('../utils/sms');
      const smsRes = await sms.sendOTP(phone, otp);

      res.json({
        message: 'OTP sent successfully',
        mock: smsRes.mock,
        _mock_otp: smsRes.mock ? otp : undefined // Return OTP to client only if mock for local testing
      });
    } catch (err) {
      console.error('[Auth] Forgot password error:', err.message);
      res.status(500).json({ error: 'Failed to process request.' });
    }
  }
);

router.post(
  '/verify-reset',
  [
    body('phone').matches(/^[6-9]\d{9}$/).withMessage('Valid phone number required'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { phone, otp, password } = req.body;
      const user = await User.findOne({ phone, role: 'user' }).select('+otp +otpExpiry');
      
      if (!user || user.otp !== otp) {
        return res.status(400).json({ error: 'Invalid or expired OTP.' });
      }

      if (new Date() > user.otpExpiry) {
        return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
      }

      // Update password (pre-save hook hashes it)
      user.password = password;
      user.otp = undefined;
      user.otpExpiry = undefined;
      await user.save();

      res.json({ message: 'Password reset successfully. You can now login.' });
    } catch (err) {
      console.error('[Auth] Reset password error:', err.message);
      res.status(500).json({ error: 'Failed to reset password.' });
    }
  }
);

router.get('/me', protect, async (req, res) => {
  res.json({ user: req.user.toPublic() });
});

module.exports = router;
