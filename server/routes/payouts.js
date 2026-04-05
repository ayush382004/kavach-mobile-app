/**
 * Payout System - KavachForWork
 * Handles claim payouts via Bank Transfer, UPI, Wallet
 * Routes: /api/payouts/*
 */

const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const { protect, adminOnly } = require('../middleware/auth');
const User = require('../models/User');
const Claim = require('../models/Claim');
const Transaction = require('../models/Transaction');

// ─── Mock Payout Provider ─────────────────────────────────────────────────────

class MockPayoutProvider {
  /**
   * Process payout to user account
   * Simulates bank transfer, UPI, or wallet credit
   */
  static processPayout(userId, payoutData) {
    // Simulate 99.5% success rate (realistic for production)
    const isSuccessful = Math.random() > 0.005;

    if (!isSuccessful) {
      return {
        status: 'failed',
        message: 'Payout processing failed. Will retry automatically.',
        code: 'PAYOUT_FAILED',
      };
    }

    // Generate payout reference ID
    const payoutId = `payout_${crypto.randomBytes(12).toString('hex').toUpperCase()}`;

    return {
      status: 'success',
      payoutId,
      timestamp: new Date().toISOString(),
      message: 'Payout initiated successfully',
    };
  }

  /**
   * Verify payout status from bank/gateway
   * In production: Check with bank API
   */
  static async verifyPayoutStatus(payoutId) {
    // Simulate 98% payouts processed within 5 minutes
    const processingTimeMs = Math.floor(Math.random() * 300000); // 0-5 minutes

    return {
      status: processingTimeMs < 300000 ? 'processed' : 'pending',
      payoutId,
      estimatedTime: processingTimeMs / 1000,
      message: 'Payout in progress',
    };
  }
}

// ─── Payout Methods Setup ─────────────────────────────────────────────────────

const PAYOUT_METHODS = {
  bank: {
    name: 'Bank Transfer',
    icon: '🏦',
    processingTime: '2-4 hours',
    fee: 0, // Free
  },
  upi: {
    name: 'UPI Transfer',
    icon: '📱',
    processingTime: '1-2 minutes',
    fee: 0, // Free for UPI
  },
  wallet: {
    name: 'Instant Wallet Credit',
    icon: '💳',
    processingTime: 'Instant',
    fee: 0,
  },
};

// ─── Get Available Payout Methods ──────────────────────────────────────────────
/**
 * GET /api/payouts/methods
 * List available payout methods
 */
router.get('/methods', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // Return available methods with user's stored info
    const methods = Object.entries(PAYOUT_METHODS).map(([key, method]) => ({
      id: key,
      ...method,
      configured: key === 'wallet' ? true : !!user.payoutMethod?.[key]?.verified, // Wallet always available
    }));

    res.json({
      methods,
      default: user.defaultPayoutMethod || 'wallet',
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payout methods' });
  }
});

// ─── Configure Bank Account for Payout ────────────────────────────────────────
/**
 * POST /api/payouts/bank-account/configure
 * Add/update bank account for payouts
 */
router.post('/bank-account/configure', protect, [
  body('accountHolderName').notEmpty().trim(),
  body('accountNumber').matches(/^\d{9,18}$/).withMessage('Invalid account number'),
  body('ifscCode').matches(/^[A-Z]{4}0[A-Z0-9]{6}$/).withMessage('Invalid IFSC code'),
  body('bankName').notEmpty().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { accountHolderName, accountNumber, ifscCode, bankName } = req.body;

    // Store bank details (in production: encrypt these fields)
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        'payoutMethod.bank': {
          accountHolderName,
          accountNumber: accountNumber.slice(-4).padStart(accountNumber.length, '*'),
          ifscCode,
          bankName,
          verified: true,
          addedAt: new Date(),
        },
      },
      { new: true }
    );

    res.json({
      message: 'Bank account saved and verified for demo payouts.',
      payout_method: {
        type: 'bank',
        detail: `${bankName} - Account ending in ${accountNumber.slice(-4)}`,
        verified: true,
      },
    });
  } catch (err) {
    console.error('[Payout] Bank config error:', err);
    res.status(500).json({ error: 'Failed to configure bank account' });
  }
});

// ─── Configure UPI for Payout ──────────────────────────────────────────────────
/**
 * POST /api/payouts/upi/configure
 * Add/update UPI ID for payouts
 */
router.post('/upi/configure', protect, [
  body('upiId').matches(/^[a-zA-Z0-9._-]+@[a-zA-Z]+$/).withMessage('Invalid UPI ID'),
], async (req, res) => {
  try {
    const { upiId } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        'payoutMethod.upi': {
          upiId,
          verified: true, // UPI is verified if it's in correct format
          addedAt: new Date(),
        },
      },
      { new: true }
    );

    res.json({
      message: 'UPI ID configured successfully',
      payout_method: {
        type: 'upi',
        detail: upiId,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to configure UPI' });
  }
});

// ─── Set Default Payout Method ────────────────────────────────────────────────
/**
 * POST /api/payouts/default
 * Set default payout method
 */
router.post('/default', protect, [
  body('method').isIn(['bank', 'upi', 'wallet']).withMessage('Invalid payout method'),
], async (req, res) => {
  try {
    const { method } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { defaultPayoutMethod: method },
      { new: true }
    );

    res.json({
      message: `Default payout method set to ${method}`,
      default: user.defaultPayoutMethod,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to set default payout method' });
  }
});

// ─── Process Payout (Admin only) ──────────────────────────────────────────────
/**
 * POST /api/payouts/process
 * Admin: Process payout for approved claim
 */
router.post('/process', protect, adminOnly, [
  body('claimId').notEmpty(),
  body('payoutAmount').isFloat({ min: 100, max: 10000 }),
  body('payoutMethod').isIn(['bank', 'upi', 'wallet']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { claimId, payoutAmount, payoutMethod } = req.body;

    // Verify claim exists and is approved
    const claim = await Claim.findById(claimId).populate('user');
    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    if (claim.status !== 'approved') {
      return res.status(400).json({
        error: 'Only approved claims can be paid out',
        currentStatus: claim.status,
      });
    }

    if (claim.payoutAmount !== undefined && claim.payoutAmount > 0) {
      return res.status(400).json({
        error: 'Payout already processed for this claim',
        payoutAmount: claim.payoutAmount,
      });
    }

    // Get user payout method
    const user = claim.user;
    const methodConfig = user.payoutMethod?.[payoutMethod];

    if (payoutMethod !== 'wallet' && !methodConfig?.verified) {
      return res.status(400).json({
        error: `${payoutMethod} payout method not configured or verified`,
        code: 'METHOD_NOT_CONFIGURED',
      });
    }

    // Process payout
    const payoutResult = MockPayoutProvider.processPayout(user._id, {
      claimId,
      amount: payoutAmount,
      method: payoutMethod,
    });

    if (payoutResult.status === 'failed') {
      return res.status(400).json({
        error: payoutResult.message,
        code: payoutResult.code,
      });
    }

    // Handle different payout methods
    let updateData = {
      status: 'paid_out',
      payoutAmount,
      payoutMethod,
      payoutId: payoutResult.payoutId,
      payoutDate: new Date(),
    };

    // For wallet payouts: Instant credit
    if (payoutMethod === 'wallet') {
      await User.findByIdAndUpdate(
        user._id,
        { $inc: { 'wallet.balance': payoutAmount } }
      );

      // Create wallet transaction
      await Transaction.create({
        user: user._id,
        type: 'claim_payout',
        amount: payoutAmount,
        balanceAfter: user.wallet.balance + payoutAmount,
        description: `Claim payout received (ID: ${claimId.toString().slice(-6)})`,
        status: 'completed',
        reference: payoutResult.payoutId,
        claim: claimId,
      });

      updateData.payoutStatus = 'completed';
    } else {
      // For bank/UPI: Pending processing
      updateData.payoutStatus = 'processing';

      // Create transaction record
      await Transaction.create({
        user: user._id,
        type: 'claim_payout',
        amount: payoutAmount,
        balanceAfter: user.wallet.balance, // Not credited to wallet
        description: `Claim payout via ${payoutMethod} (ID: ${claimId.toString().slice(-6)})`,
        status: 'pending',
        reference: payoutResult.payoutId,
        claim: claimId,
      });
    }

    // Update claim with payout info
    const updatedClaim = await Claim.findByIdAndUpdate(claimId, updateData, { new: true });

    // Update user stats
    await User.findByIdAndUpdate(user._id, {
      $inc: { totalPayoutsReceived: payoutAmount },
    });

    res.json({
      message: `Payout of ₹${payoutAmount} processed successfully`,
      payout: {
        claimId,
        payoutId: payoutResult.payoutId,
        amount: payoutAmount,
        method: payoutMethod,
        status: updateData.payoutStatus,
        processingTime: PAYOUT_METHODS[payoutMethod].processingTime,
        timestamp: new Date().toISOString(),
      },
      claim: {
        status: updatedClaim.status,
        payoutAmount: updatedClaim.payoutAmount,
      },
    });
  } catch (err) {
    console.error('[Payout] Process error:', err);
    res.status(500).json({ error: 'Failed to process payout' });
  }
});

// ─── Get Payout History ───────────────────────────────────────────────────────
/**
 * GET /api/payouts/history
 * Get user's payout history
 */
router.get('/history', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const [transactions, total] = await Promise.all([
      Transaction.find({
        user: req.user._id,
        type: 'claim_payout',
      })
        .populate('claim', 'status weather.city weather.ambientTemp')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Transaction.countDocuments({
        user: req.user._id,
        type: 'claim_payout',
      }),
    ]);

    res.json({
      payouts: transactions.map(t => ({
        payoutId: t.reference,
        amount: t.amount,
        status: t.status,
        timestamp: t.createdAt,
        claim: t.claim ? {
          id: t.claim._id,
          city: t.claim.weather?.city,
          temperature: t.claim.weather?.ambientTemp,
        } : null,
      })),
      stats: {
        totalPayouts: transactions.reduce((sum, t) => sum + t.amount, 0),
        payoutCount: total,
        completedCount: transactions.filter(t => t.status === 'completed').length,
        processingCount: transactions.filter(t => t.status === 'pending').length,
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payout history' });
  }
});

// ─── Admin: Payout Status Dashboard ────────────────────────────────────────────
/**
 * GET /api/payouts/admin/status
 * Admin: View all pending/processing payouts
 */
router.get('/admin/status', protect, adminOnly, async (req, res) => {
  try {
    const [pendingPayouts, totalPayouts, successRate] = await Promise.all([
      Transaction.find({
        type: 'claim_payout',
        status: { $in: ['pending', 'processing'] },
      })
        .populate('user', 'name phone')
        .populate('claim', 'status weather.city')
        .sort({ createdAt: -1 })
        .limit(20),
      Transaction.countDocuments({ type: 'claim_payout' }),
      Transaction.aggregate([
        { $match: { type: 'claim_payout' } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            total: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    const successMetrics = successRate.reduce((acc, item) => {
      acc[item._id] = { count: item.count, total: item.total };
      return acc;
    }, {});

    res.json({
      pendingPayouts: pendingPayouts.length,
      pendingAmount: pendingPayouts.reduce((sum, p) => sum + p.amount, 0),
      details: pendingPayouts.map(p => ({
        transactionId: p._id,
        payoutId: p.reference,
        user: p.user.name,
        userPhone: p.user.phone,
        amount: p.amount,
        status: p.status,
        claim: p.claim?.weather?.city,
        timestamp: p.createdAt,
      })),
      metrics: {
        totalPayouts,
        successfulPayouts: successMetrics.completed?.count || 0,
        totalPayoutAmount: Object.values(successMetrics).reduce((sum, item) => sum + (item.total || 0), 0),
        avgPayoutAmount: Object.values(successMetrics).length > 0 
          ? (Object.values(successMetrics).reduce((sum, item) => sum + (item.total || 0), 0) / 
             Object.values(successMetrics).reduce((sum, item) => sum + (item.count || 0), 0)).toFixed(2)
          : 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payout status' });
  }
});

module.exports = router;
