const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

router.get('/balance', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      'wallet premiumUntil isInsured weeklyPremium maxPayout pricingCategory pricingLabel avgDailyWageRef payoutMethod defaultPayoutMethod'
    );

    res.json({
      balance: user.wallet.balance,
      currency: 'INR',
      isInsured: user.isInsured,
      premiumUntil: user.premiumUntil,
      isInsuranceActive: user.isInsuranceActive(),
      weeklyPremium: user.weeklyPremium,
      maxPayout: user.maxPayout,
      pricingCategory: user.pricingCategory,
      pricingLabel: user.pricingLabel,
      avgDailyWageRef: user.avgDailyWageRef,
      defaultPayoutMethod: user.defaultPayoutMethod || 'wallet',
      bankConfigured: !!user.payoutMethod?.bank?.verified,
      upiConfigured: !!user.payoutMethod?.upi?.verified,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch balance.' });
  }
});

router.post(
  '/topup',
  protect,
  [body('amount').isFloat({ min: 24, max: 10000 }).withMessage('Amount must be between Rs 24 and Rs 10,000')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { amount, paymentReference } = req.body;

      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { $inc: { 'wallet.balance': amount } },
        { new: true }
      );

      await Transaction.create({
        user: req.user._id,
        type: 'topup',
        amount: +amount,
        balanceAfter: updatedUser.wallet.balance,
        description: 'Wallet top-up via UPI or card',
        status: 'completed',
        reference: paymentReference || `TOPUP-${Date.now()}`,
      });

      const io = req.app.get('io');
      io?.emit(`wallet_update_${req.user._id}`, {
        newBalance: updatedUser.wallet.balance,
        message: `Rs ${amount} added to your wallet.`,
        category: 'topup',
      });

      res.json({
        message: `Rs ${amount} added to your wallet!`,
        balance: updatedUser.wallet.balance,
      });
    } catch (err) {
      console.error('[Wallet] Topup error:', err);
      res.status(500).json({ error: 'Top-up failed. Please try again.' });
    }
  }
);

router.post(
  '/withdraw-bank',
  protect,
  [body('amount').isFloat({ min: 100, max: 50000 }).withMessage('Amount must be between Rs 100 and Rs 50,000')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { amount } = req.body;
      const user = await User.findById(req.user._id);

      if (!user?.payoutMethod?.bank?.verified) {
        return res.status(400).json({ error: 'Please link a verified bank account first.', code: 'BANK_NOT_CONFIGURED' });
      }

      if (user.wallet.balance < amount) {
        return res.status(400).json({
          error: `Insufficient wallet balance. Available: Rs ${user.wallet.balance}.`,
          code: 'INSUFFICIENT_BALANCE',
        });
      }

      const updatedUser = await User.findByIdAndUpdate(
        user._id,
        { $inc: { 'wallet.balance': -amount } },
        { new: true }
      );

      const transferRef = `BANK-${Date.now()}`;
      await Transaction.create({
        user: user._id,
        type: 'bank_withdrawal',
        method: 'bank_transfer',
        amount: -amount,
        balanceAfter: updatedUser.wallet.balance,
        description: `Wallet withdrawal to bank account ending ${user.payoutMethod.bank.accountNumber.slice(-4)}`,
        status: 'completed',
        reference: transferRef,
      });

      const io = req.app.get('io');
      io?.emit(`wallet_update_${user._id}`, {
        newBalance: updatedUser.wallet.balance,
        message: `Rs ${amount} sent to your bank account.`,
        category: 'withdrawal',
        amount,
      });

      res.json({
        message: `Rs ${amount} sent to your bank account.`,
        balance: updatedUser.wallet.balance,
        transferReference: transferRef,
      });
    } catch (err) {
      console.error('[Wallet] Bank withdrawal error:', err);
      res.status(500).json({ error: 'Bank transfer failed. Please try again.' });
    }
  }
);
router.post(
  '/withdraw-upi',
  protect,
  [body('amount').isFloat({ min: 100, max: 20000 }).withMessage('Amount must be between Rs 100 and Rs 20,000')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { amount } = req.body;
      const user = await User.findById(req.user._id);

      if (!user?.payoutMethod?.upi?.verified) {
        return res.status(400).json({ error: 'Please link a verified UPI ID first.', code: 'UPI_NOT_CONFIGURED' });
      }

      if (user.wallet.balance < amount) {
        return res.status(400).json({
          error: `Insufficient wallet balance. Available: Rs ${user.wallet.balance}.`,
          code: 'INSUFFICIENT_BALANCE',
        });
      }

      const updatedUser = await User.findByIdAndUpdate(
        user._id,
        { $inc: { 'wallet.balance': -amount } },
        { new: true }
      );

      const transferRef = `UPI-${Date.now()}`;
      await Transaction.create({
        user: user._id,
        type: 'bank_withdrawal',
        method: 'upi',
        amount: -amount,
        balanceAfter: updatedUser.wallet.balance,
        description: `Wallet withdrawal to UPI ID: ${user.payoutMethod.upi.upiId}`,
        status: 'completed',
        reference: transferRef,
      });

      const io = req.app.get('io');
      io?.emit(`wallet_update_${user._id}`, {
        newBalance: updatedUser.wallet.balance,
        message: `Rs ${amount} sent to your UPI address.`,
        category: 'withdrawal',
        amount,
      });

      res.json({
        message: `Rs ${amount} sent to your UPI address.`,
        balance: updatedUser.wallet.balance,
        transferReference: transferRef,
      });
    } catch (err) {
      console.error('[Wallet] UPI withdrawal error:', err);
      res.status(500).json({ error: 'UPI transfer failed. Please try again.' });
    }
  }
);

module.exports = router;
