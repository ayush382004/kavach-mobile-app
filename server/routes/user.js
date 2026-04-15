/**
 * User Routes - KavachForWork
 * GET  /api/user/profile
 * PUT  /api/user/profile
 * POST /api/user/activate-insurance
 * GET  /api/user/transactions
 */

const router = require('express').Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { resolvePricing } = require('../utils/pricing');

router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ user: user.toPublic() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

router.put('/profile', protect, async (req, res) => {
  try {
    const allowed = ['name', 'city', 'state', 'workerType', 'email'];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const nextState = updates.state ?? req.user.state;
    const nextCity = updates.city ?? req.user.city;
    const pricing = resolvePricing(nextState, nextCity);

    updates.weeklyPremium = pricing.weeklyPremium;
    updates.maxPayout = pricing.maxPayout;
    updates.pricingCategory = pricing.category;
    updates.pricingLabel = pricing.label;
    updates.avgDailyWageRef = pricing.avgDailyWageRef;

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ message: 'Profile updated', user: user.toPublic() });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Update failed.' });
  }
});

router.post('/activate-insurance', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const premium = user.weeklyPremium || 29;

    if (user.wallet.balance < premium) {
      return res.status(400).json({
        error: `Insufficient balance. Need ₹${premium}, have ₹${user.wallet.balance}. Please top up your wallet.`,
        code: 'INSUFFICIENT_BALANCE',
      });
    }

    const now = new Date();
    const currentExpiry = user.premiumUntil && user.premiumUntil > now ? user.premiumUntil : now;
    const newExpiry = new Date(currentExpiry.getTime() + 7 * 24 * 60 * 60 * 1000);

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        $inc: { 'wallet.balance': -premium, totalPremiumPaid: premium },
        isInsured: true,
        premiumUntil: newExpiry,
        insuranceActivationDate: now,
      },
      { new: true }
    );

    await Transaction.create({
      user: user._id,
      type: 'premium_deduction',
      amount: -premium,
      balanceAfter: updatedUser.wallet.balance,
      description: `Weekly Kavach insurance premium - valid until ${newExpiry.toLocaleDateString('en-IN')}`,
      status: 'completed',
      reference: `PREM-${Date.now()}`,
    });

    res.json({
      message: `Insurance activated! ₹${premium} deducted. Covered until ${newExpiry.toLocaleDateString('en-IN')}.`,
      isInsured: true,
      premiumUntil: newExpiry,
      walletBalance: updatedUser.wallet.balance,
      weeklyPremium: premium,
    });
  } catch (err) {
    console.error('[Insurance] Activation error:', err);
    res.status(500).json({ error: 'Failed to activate insurance.' });
  }
});

const { getThreshold } = require('../utils/constants');
const axios = require('axios');

router.post('/deactivate-insurance', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.isInsuranceActive()) {
      return res.status(400).json({
        error: 'Your insurance is already inactive or expired.',
        code: 'INSURANCE_ALREADY_INACTIVE',
      });
    }

    // Block deactivation during active heatwave conditions to prevent misuse
    try {
      // Use Open-Meteo as a reliable public source to check current conditions
      const lat = user.lastLocation?.lat || 26.9124; // fallback to Jaipur
      const lng = user.lastLocation?.lng || 75.7873;
      
      const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
        params: {
          latitude: lat,
          longitude: lng,
          current: 'temperature_2m',
          timezone: 'auto'
        },
        timeout: 5000
      });

      const currentTemp = response.data?.current?.temperature_2m;
      const threshold = getThreshold(user.state);

      if (currentTemp && currentTemp >= threshold) {
        return res.status(403).json({
          error: `Deactivation blocked: Extreme heat condition detected (${currentTemp}°C) in your region. IRDAI guidelines prevent coverage deactivation during active heatwave events to ensure continuous protection.`,
          code: 'HEATWAVE_ACTIVE',
          currentTemp,
          threshold
        });
      }
    } catch (weatherErr) {
      console.warn('[Insurance] Could not verify heatwave status during deactivation:', weatherErr.message);
      // If weather check fails, we might want to allow it or stick to safe side. 
      // For fairness/safety, we'll allow deactivation if we can't prove a heatwave is happening.
    }

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        isInsured: false,
        premiumUntil: null,
      },
      { new: true }
    );

    res.json({
      message: 'Insurance coverage has been deactivated.',
      isInsured: false,
      premiumUntil: null,
    });
  } catch (err) {
    console.error('[Insurance] Deactivation error:', err);
    res.status(500).json({ error: 'Failed to deactivate insurance.' });
  }
});

router.get('/transactions', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const [transactions, total] = await Promise.all([
      Transaction.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('claim', 'status triggerTemp weather.city'),
      Transaction.countDocuments({ user: req.user._id }),
    ]);

    res.json({
      transactions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transactions.' });
  }
});

module.exports = router;
