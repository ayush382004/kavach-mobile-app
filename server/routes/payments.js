/**
 * Mock Payment System - KavachForWork
 * Handles: UPI, Credit Card, Debit Card with Razorpay integration
 * Routes: /api/payments/*
 */

const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// ─── Mock Payment Provider Responses ──────────────────────────────────────────

class MockPaymentProvider {
  /**
   * Simulate successful payment processing
   * In production: Actual Razorpay API call
   */
  static processPayment(orderId, paymentData) {
    // Simulate network delay
    const isSuccessful = Math.random() > 0.02; // 98% success rate for demo

    if (!isSuccessful) {
      return {
        status: 'failed',
        message: 'Payment declined. Please try again.',
        code: 'PAYMENT_DECLINED',
      };
    }

    // Generate mock payment ID (like Razorpay: pay_LjAmbkbhT23O1R)
    const paymentId = `pay_${crypto.randomBytes(12).toString('hex').toUpperCase()}`;

    return {
      status: 'success',
      orderId,
      paymentId,
      timestamp: new Date().toISOString(),
      message: 'Payment processed successfully',
    };
  }

  /**
   * Verify payment signature (Razorpay webhook security)
   * In production: Verify actual Razorpay signature
   */
  static verifySignature(orderId, paymentId, signature, secret) {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(`${orderId}|${paymentId}`);
    const signatureGenerated = hmac.digest('hex');
    return signatureGenerated === signature;
  }

  /**
   * Generate mock payment signature
   * Used for testing payment flows
   */
  static generateSignature(orderId, paymentId, secret) {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(`${orderId}|${paymentId}`);
    return hmac.digest('hex');
  }
}

// ─── Payment Method: UPI ──────────────────────────────────────────────────────
/**
 * POST /api/payments/upi/initiate
 * Initiates UPI payment (Google Pay, PhonePe, Paytm)
 */
router.post('/upi/initiate', protect, [
  body('amount').isFloat({ min: 24, max: 10000 }).withMessage('Amount ₹24-₹10,000'),
  body('upiId').matches(/^[a-zA-Z0-9._-]+@[a-zA-Z]+$/).withMessage('Invalid UPI ID (e.g. user@okhdfcbank)'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, upiId } = req.body;

    // Create order for payment tracking
    const orderId = `order_${crypto.randomBytes(12).toString('hex').toUpperCase()}`;

    res.json({
      status: 'pending',
      orderId,
      amount,
      upiId,
      message: 'UPI payment link generated. Scan with Google Pay/PhonePe/Paytm',
      upiDeepLink: `upi://pay?pa=${upiId}&pn=KavachForWork&am=${amount}&tr=${orderId}&tn=KavachInsurance`,
      expiresIn: '10 minutes',
      // In production: This would be a real Razorpay UPI link
    });
  } catch (err) {
    console.error('[UPI] Initiate error:', err);
    res.status(500).json({ error: 'Failed to initiate UPI payment' });
  }
});

/**
 * POST /api/payments/upi/verify
 * Verify UPI payment completion
 */
router.post('/upi/verify', protect, [
  body('orderId').notEmpty(),
  body('paymentId').notEmpty(),
  body('signature').notEmpty(),
], async (req, res) => {
  try {
    const { orderId, paymentId, signature, amount } = req.body;
    const secret = process.env.RAZORPAY_KEY_SECRET || 'test_secret_key';

    // Verify payment signature
    const isValid = MockPaymentProvider.verifySignature(orderId, paymentId, signature, secret);

    if (!isValid) {
      return res.status(400).json({
        error: 'Payment verification failed. Invalid signature.',
        code: 'SIGNATURE_MISMATCH',
      });
    }

    // Process payment
    const paymentResult = MockPaymentProvider.processPayment(orderId, {
      paymentId,
      amount,
      method: 'upi',
    });

    if (paymentResult.status === 'failed') {
      return res.status(400).json({
        error: paymentResult.message,
        code: paymentResult.code,
      });
    }

    // Update wallet in database
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { 'wallet.balance': amount } },
      { new: true }
    );

    // Record transaction
    await Transaction.create({
      user: req.user._id,
      type: 'topup',
      method: 'upi',
      amount: +amount,
      balanceAfter: updatedUser.wallet.balance,
      description: `UPI payment via ${req.body.upiId || 'Google Pay/PhonePe/Paytm'}`,
      status: 'completed',
      reference: paymentId,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
    });

    res.json({
      message: `✓ ₹${amount} added via UPI!`,
      status: 'success',
      balance: updatedUser.wallet.balance,
      paymentId,
      orderId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[UPI] Verify error:', err);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

// ─── Payment Method: Credit Card ──────────────────────────────────────────────
/**
 * POST /api/payments/card/initiate
 * Initiates credit/debit card payment
 */
router.post('/card/initiate', protect, [
  body('amount').isFloat({ min: 24, max: 50000 }).withMessage('Amount ₹24-₹50,000'),
  body('cardNumber').matches(/^\d{4}\s?\d{4}\s?\d{4}\s?\d{4}$|^\d{16}$/).withMessage('Invalid card number'),
  body('cardholderName').notEmpty().trim(),
  body('expiryMonth').matches(/^(\d{2})$/).withMessage('Invalid month (MM)'),
  body('expiryYear').matches(/^(\d{2})$/).withMessage('Invalid year (YY)'),
  body('cvv').matches(/^\d{3,4}$/).withMessage('Invalid CVV'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, cardNumber, cardholderName, expiryMonth, expiryYear } = req.body;

    // Validate card expiry
    const expiryDate = new Date(`20${expiryYear}-${expiryMonth}-01`);
    if (expiryDate < new Date()) {
      return res.status(400).json({ error: 'Card has expired' });
    }

    // Create order
    const orderId = `order_${crypto.randomBytes(12).toString('hex').toUpperCase()}`;

    // Mock card processing
    const cardLast4 = cardNumber.replace(/\s/g, '').slice(-4);

    res.json({
      status: 'pending',
      orderId,
      amount,
      cardLast4,
      cardholderName,
      message: 'Card payment initiated. Enter OTP on your bank app.',
      otp: '**** (Simulated - In production: Actual OTP from bank)',
      expiresIn: '5 minutes',
      // Next step: /api/payments/card/verify with OTP
    });
  } catch (err) {
    console.error('[Card] Initiate error:', err);
    res.status(500).json({ error: 'Failed to initiate card payment' });
  }
});

/**
 * POST /api/payments/card/verify
 * Verify card payment with OTP
 */
router.post('/card/verify', protect, [
  body('orderId').notEmpty(),
  body('otp').matches(/^\d{6}$/).withMessage('OTP must be 6 digits'),
  body('amount').isFloat({ min: 24 }),
], async (req, res) => {
  try {
    const { orderId, otp, amount } = req.body;
    const secret = process.env.RAZORPAY_KEY_SECRET || 'test_secret_key';

    // Mock OTP verification (In production: Verify with bank)
    // For demo: Accept any 6-digit OTP with 95% success rate
    const isOtpValid = /^\d{6}$/.test(otp) && Math.random() > 0.05;

    if (!isOtpValid) {
      return res.status(400).json({
        error: 'Invalid OTP. Payment declined.',
        code: 'OTP_INVALID',
        attemptsLeft: 2,
      });
    }

    // Generate payment ID (simulated)
    const paymentId = `pay_${crypto.randomBytes(12).toString('hex').toUpperCase()}`;
    const signature = MockPaymentProvider.generateSignature(orderId, paymentId, secret);

    // Process payment
    const paymentResult = MockPaymentProvider.processPayment(orderId, {
      paymentId,
      amount,
      method: 'card',
    });

    if (paymentResult.status === 'failed') {
      return res.status(400).json({
        error: paymentResult.message,
        code: paymentResult.code,
      });
    }

    // Update wallet
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { 'wallet.balance': amount } },
      { new: true }
    );

    // Record transaction
    await Transaction.create({
      user: req.user._id,
      type: 'topup',
      method: 'card',
      amount: +amount,
      balanceAfter: updatedUser.wallet.balance,
      description: `Card payment (****${req.body.cardLast4 || '****'})`,
      status: 'completed',
      reference: paymentId,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
    });

    res.json({
      message: `✓ ₹${amount} added via Card!`,
      status: 'success',
      balance: updatedUser.wallet.balance,
      paymentId,
      orderId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Card] Verify error:', err);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

// ─── Payment Method: Debit Card ───────────────────────────────────────────────
/**
 * POST /api/payments/debit/initiate
 * Initiates debit card payment
 */
router.post('/debit/initiate', protect, [
  body('amount').isFloat({ min: 24, max: 50000 }).withMessage('Amount ₹24-₹50,000'),
  body('cardNumber').matches(/^\d{16}$|^\d{4}\s\d{4}\s\d{4}\s\d{4}$/).withMessage('Invalid card'),
  body('pin').matches(/^\d{4}$/).withMessage('PIN must be 4 digits'),
  body('cardholderName').notEmpty().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, cardNumber, cardholderName } = req.body;
    const orderId = `order_${crypto.randomBytes(12).toString('hex').toUpperCase()}`;
    const cardLast4 = cardNumber.replace(/\s/g, '').slice(-4);

    res.json({
      status: 'pending',
      orderId,
      amount,
      cardLast4,
      cardholderName,
      message: 'Debit card payment authenticated. Processing...',
      processingTime: '3-5 seconds',
      // In production: Verify PIN with bank
    });
  } catch (err) {
    console.error('[Debit] Initiate error:', err);
    res.status(500).json({ error: 'Failed to initiate debit payment' });
  }
});

/**
 * POST /api/payments/debit/verify
 * Complete debit card payment
 */
router.post('/debit/verify', protect, [
  body('orderId').notEmpty(),
  body('amount').isFloat({ min: 24 }),
], async (req, res) => {
  try {
    const { orderId, amount } = req.body;
    const secret = process.env.RAZORPAY_KEY_SECRET || 'test_secret_key';

    // Mock debit processing (97% success rate)
    const isSuccessful = Math.random() > 0.03;

    if (!isSuccessful) {
      return res.status(400).json({
        error: 'Card declined by bank. Please try another card or payment method.',
        code: 'CARD_DECLINED',
      });
    }

    const paymentId = `pay_${crypto.randomBytes(12).toString('hex').toUpperCase()}`;
    const signature = MockPaymentProvider.generateSignature(orderId, paymentId, secret);

    const paymentResult = MockPaymentProvider.processPayment(orderId, {
      paymentId,
      amount,
      method: 'debit',
    });

    if (paymentResult.status === 'failed') {
      return res.status(400).json({
        error: paymentResult.message,
        code: paymentResult.code,
      });
    }

    // Update wallet
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { 'wallet.balance': amount } },
      { new: true }
    );

    // Record transaction
    await Transaction.create({
      user: req.user._id,
      type: 'topup',
      method: 'debit_card',
      amount: +amount,
      balanceAfter: updatedUser.wallet.balance,
      description: `Debit card payment (****${req.body.cardLast4 || '****'})`,
      status: 'completed',
      reference: paymentId,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
    });

    res.json({
      message: `✓ ₹${amount} added via Debit Card!`,
      status: 'success',
      balance: updatedUser.wallet.balance,
      paymentId,
      orderId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Debit] Verify error:', err);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

// ─── Payment Status & History ─────────────────────────────────────────────────
/**
 * GET /api/payments/status/:orderId
 * Check status of a payment
 */
router.get('/status/:orderId', protect, async (req, res) => {
  try {
    const { orderId } = req.params;

    const transaction = await Transaction.findOne({
      user: req.user._id,
      razorpayOrderId: orderId,
    });

    if (!transaction) {
      return res.status(404).json({
        error: 'Payment not found',
        orderId,
      });
    }

    res.json({
      orderId,
      paymentId: transaction.razorpayPaymentId,
      status: transaction.status,
      method: transaction.method,
      amount: transaction.amount,
      timestamp: transaction.createdAt,
      reference: transaction.reference,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payment status' });
  }
});

/**
 * GET /api/payments/history
 * Get payment history
 */
router.get('/history', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const [transactions, total] = await Promise.all([
      Transaction.find({
        user: req.user._id,
        type: 'topup',
      })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Transaction.countDocuments({
        user: req.user._id,
        type: 'topup',
      }),
    ]);

    res.json({
      payments: transactions.map(t => ({
        orderId: t.razorpayOrderId,
        paymentId: t.razorpayPaymentId,
        method: t.method,
        amount: t.amount,
        status: t.status,
        timestamp: t.createdAt,
        description: t.description,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

// ─── Razorpay Webhook Handler ────────────────────────────────────────────────
/**
 * POST /api/payments/webhook
 * Razorpay webhook for asynchronous payment updates
 * In production: Verify webhook signature
 */
router.post('/webhook', async (req, res) => {
  try {
    const { event, payload } = req.body;

    console.log(`[Webhook] Received event: ${event}`);

    // Handle different webhook events
    switch (event) {
      case 'payment.authorized':
        console.log(`[Webhook] Payment authorized: ${payload.payment.id}`);
        break;

      case 'payment.failed':
        console.log(`[Webhook] Payment failed: ${payload.payment.id}`);
        // Update transaction status in DB
        break;

      case 'payment.captured':
        console.log(`[Webhook] Payment captured: ${payload.payment.id}`);
        // Payment is confirmed and captured
        break;

      default:
        console.log(`[Webhook] Unhandled event: ${event}`);
    }

    res.json({ status: 'received' });
  } catch (err) {
    console.error('[Webhook] Error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;
