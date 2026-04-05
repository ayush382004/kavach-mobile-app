const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Claim = require('../models/Claim');

function resolveDestination(user, requestedMethod) {
  const payoutMethod = requestedMethod || user.defaultPayoutMethod || 'wallet';

  if (payoutMethod === 'bank' && !user?.payoutMethod?.bank?.verified) {
    return 'wallet';
  }

  if (payoutMethod === 'upi' && !user?.payoutMethod?.upi?.verified) {
    return 'wallet';
  }

  return payoutMethod;
}

async function processClaimPayout({ user, claim, amount, io, requestedMethod }) {
  const payoutMethod = resolveDestination(user, requestedMethod);

  let updatedUser = user;
  let description = `Claim payout received (ID: ${claim._id.toString().slice(-6)})`;
  let message = `Claim approved! Rs ${amount} credited to your wallet.`;
  let notificationMessage = message;
  let transactionStatus = 'completed';
  let method = undefined;

  if (payoutMethod === 'wallet') {
    updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $inc: { 'wallet.balance': amount, totalPayoutsReceived: amount } },
      { new: true }
    );
    description = `Claim payout credited to wallet (ID: ${claim._id.toString().slice(-6)})`;
    message = `Claim approved! Rs ${amount} credited to your wallet.`;
    notificationMessage = message;
  } else if (payoutMethod === 'bank') {
    updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $inc: { totalPayoutsReceived: amount } },
      { new: true }
    );
    method = 'bank_transfer';
    description = `Claim payout sent to bank account ending ${user.payoutMethod.bank.accountNumber.slice(-4)}`;
    message = `Claim approved! Rs ${amount} sent to your bank account.`;
    notificationMessage = message;
  } else {
    updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $inc: { totalPayoutsReceived: amount } },
      { new: true }
    );
    method = 'upi';
    description = `Claim payout sent to UPI ${user.payoutMethod.upi.upiId}`;
    message = `Claim approved! Rs ${amount} sent to your UPI account.`;
    notificationMessage = message;
  }

  await Transaction.create({
    user: user._id,
    type: 'claim_payout',
    method,
    amount: +amount,
    balanceAfter: updatedUser.wallet?.balance ?? user.wallet?.balance ?? 0,
    description,
    claim: claim._id,
    status: transactionStatus,
    reference: `PAY-${claim._id}-${payoutMethod.toUpperCase()}`,
  });

  await Claim.findByIdAndUpdate(claim._id, {
    status: 'paid',
    payoutAmount: amount,
    payoutMethod,
    payoutStatus: 'completed',
    paidAt: new Date(),
  });

  io?.emit(`wallet_update_${user._id}`, {
    newBalance: updatedUser.wallet?.balance ?? user.wallet?.balance ?? 0,
    payout: amount,
    category: payoutMethod === 'wallet' ? 'payout' : 'withdrawal',
    message: notificationMessage,
  });

  return {
    payoutMethod,
    updatedUser,
    message,
  };
}

module.exports = {
  processClaimPayout,
  resolveDestination,
};
