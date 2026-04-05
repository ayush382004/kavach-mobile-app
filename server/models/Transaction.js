/**
 * Transaction Model - KavachForWork
 * Wallet transactions: premiums, payouts, top-ups
 */

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['premium_deduction', 'payout', 'claim_payout', 'topup', 'refund', 'bank_withdrawal'],
    required: true,
  },
  method: {
    type: String,
    enum: ['upi', 'card', 'debit_card', 'bank_transfer'],
  },
  amount: { type: Number, required: true },
  balanceAfter: { type: Number, required: true },
  description: { type: String, required: true },
  claim: { type: mongoose.Schema.Types.ObjectId, ref: 'Claim' }, // linked claim if payout
  status: {
    type: String,
    enum: ['completed', 'pending', 'failed'],
    default: 'completed',
  },
  reference: String,
  razorpayOrderId: String,
  razorpayPaymentId: String,
  razorpayTransferId: String,
  upiTxnId: String,
}, {
  timestamps: true,
});

transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ razorpayPaymentId: 1 });
transactionSchema.index({ razorpayTransferId: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
