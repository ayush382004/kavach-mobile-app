/**
 * Weekly Premium Cron Job - KavachForWork
 * Runs every Monday 6AM IST
 * Deducts each user's configured weekly premium
 * Deactivates coverage if wallet balance is insufficient
 */

const User = require('../models/User');
const Transaction = require('../models/Transaction');

async function deductWeeklyPremiums(io) {
  console.log('[Cron] Starting weekly premium deduction...');

  try {
    const insuredUsers = await User.find({
      isInsured: true,
      premiumUntil: { $gte: new Date() },
    });

    console.log(`[Cron] Processing ${insuredUsers.length} insured users`);

    let successCount = 0;
    let failCount = 0;
    let totalCollected = 0;

    for (const user of insuredUsers) {
      try {
        const weeklyPremium = user.weeklyPremium || 29;

        if (user.wallet.balance >= weeklyPremium) {
          const newExpiry = new Date(user.premiumUntil.getTime() + 7 * 24 * 60 * 60 * 1000);

          const updatedUser = await User.findByIdAndUpdate(
            user._id,
            {
              $inc: { 'wallet.balance': -weeklyPremium, totalPremiumPaid: weeklyPremium },
              premiumUntil: newExpiry,
            },
            { new: true }
          );

          await Transaction.create({
            user: user._id,
            type: 'premium_deduction',
            amount: -weeklyPremium,
            balanceAfter: updatedUser.wallet.balance,
            description: `Auto weekly Kavach premium - valid until ${newExpiry.toLocaleDateString('en-IN')}`,
            status: 'completed',
            reference: `AUTO-PREM-${Date.now()}-${user._id}`,
          });

          io?.emit(`wallet_update_${user._id}`, {
            newBalance: updatedUser.wallet.balance,
            deducted: weeklyPremium,
            message: `₹${weeklyPremium} auto-deducted for Kavach weekly coverage`,
          });

          successCount++;
          totalCollected += weeklyPremium;
        } else {
          await User.findByIdAndUpdate(user._id, {
            isInsured: false,
            premiumUntil: null,
          });

          io?.emit(`wallet_update_${user._id}`, {
            newBalance: user.wallet.balance,
            message: 'Insurance deactivated - insufficient balance. Please top up and reactivate.',
            alert: true,
          });

          failCount++;
          console.log(`[Cron] Deactivated insurance for ${user.name} (insufficient balance: ₹${user.wallet.balance})`);
        }
      } catch (userErr) {
        console.error(`[Cron] Error processing user ${user._id}:`, userErr.message);
        failCount++;
      }
    }

    console.log('[Cron] Premium deduction complete:');
    console.log(`  Success: ${successCount} users | ₹${totalCollected} collected`);
    console.log(`  Failed/Deactivated: ${failCount} users`);

    io?.to('admin_room').emit('cron_complete', {
      type: 'weekly_premium',
      successCount,
      failCount,
      totalCollected,
      timestamp: new Date().toISOString(),
    });

    return { successCount, failCount, totalCollected };
  } catch (err) {
    console.error('[Cron] Fatal error in premium deduction:', err);
    throw err;
  }
}

module.exports = { deductWeeklyPremiums };
