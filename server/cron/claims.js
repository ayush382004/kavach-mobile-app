/**
 * Zero-Touch Automated Claim Engine - KavachForWork
 * (IRDAI Guideline: Fairness and Zero-Touch Claims)
 * 
 * Runs hourly to check weather for all active users.
 * Automatically triggers payouts when dynamic thresholds are met for a sustained duration.
 */

const User = require('../models/User');
const Claim = require('../models/Claim');
const axios = require('axios');
const { getThreshold, getPayoutTier, getPayoutAmountForMax } = require('../utils/constants');
const { resolvePricing } = require('../utils/pricing');
const { processClaimPayout } = require('../utils/payouts');

async function processZeroTouchClaims(io) {
  console.log('[Zero-Touch] Starting automated claim check...');

  try {
    // 1. Find all users with active insurance
    const activeUsers = await User.find({
      isInsured: true,
      premiumUntil: { $gte: new Date() },
      insuranceActivationDate: { $lte: new Date(Date.now() - 48 * 60 * 60 * 1000) }
    });

    console.log(`[Zero-Touch] Checking weather for ${activeUsers.length} active users`);

    let claimsTriggered = 0;

    for (const user of activeUsers) {
      try {
        // Use last known location or registered city
        const lat = user.lastLocation?.lat || 26.9124; // Jaipur fallback
        const lng = user.lastLocation?.lng || 75.7873;
        const state = user.state || 'Rajasthan';

        // 2. Fetch real-time weather from Trusted Public source (Open-Meteo)
        const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
          params: {
            latitude: lat,
            longitude: lng,
            current: 'temperature_2m,relative_humidity_2m,apparent_temperature',
            timezone: 'auto'
          },
          timeout: 8000
        });

        const currentTemp = response.data?.current?.temperature_2m;
        const humidity = response.data?.current?.relative_humidity_2m;
        const feelsLike = response.data?.current?.apparent_temperature;
        const threshold = getThreshold(state);

        // 3. Buffer Logic: Check if threshold exceeded
        if (currentTemp >= threshold) {
          user.heatwaveExceedanceCount = (user.heatwaveExceedanceCount || 0) + 1;
          console.log(`[Zero-Touch] User ${user.name} in ${state}: ${currentTemp}°C >= ${threshold}°C (Count: ${user.heatwaveExceedanceCount})`);
        } else {
          // Temperature dropped below threshold, we keep count for the day or reset?
          // Guidelines usually imply "sustained" heat. We'll reset if it drops significantly, 
          // but maybe stay persistent if it's just a small dip.
          if (currentTemp < threshold - 2) {
            user.heatwaveExceedanceCount = 0;
          }
        }

        // 4. Trigger Claim if duration reached (e.g. 3 hours)
        // Ensure only one auto-claim per day
        const today = new Date().toISOString().split('T')[0];
        const lastClaimDate = user.lastAutoClaimDate ? user.lastAutoClaimDate.toISOString().split('T')[0] : null;

        if (user.heatwaveExceedanceCount >= 3 && lastClaimDate !== today) {
          console.log(`[Zero-Touch] !!! TRIGGERING CLAIM for ${user.name} !!!`);

          const pricing = resolvePricing(state, user.city);
          const payoutTier = getPayoutTier(currentTemp, state);
          const payoutAmount = getPayoutAmountForMax(pricing.maxPayout, currentTemp, state);

          // Create Automated Claim
          const claim = await Claim.create({
            user: user._id,
            weather: {
              ambientTemp: currentTemp,
              feelsLike,
              humidity,
              city: user.city || 'Local Area',
              condition: 'Heatwave (Auto-Triggered)',
            },
            location: {
              lat,
              lng,
              city: user.city,
              state: user.state
            },
            status: 'approved',
            payoutAmount,
            payoutMethod: user.defaultPayoutMethod || 'wallet',
            payoutStatus: 'pending',
            payoutTier,
            pricingSnapshot: pricing,
            heatwaveTriggered: true,
            triggerTemp: currentTemp,
            isAutomated: true // Mark as Zero-Touch
          });

          // Process Payout
          if (payoutAmount > 0) {
            await processClaimPayout({
              user,
              claim,
              amount: payoutAmount,
              io
            });
          }

          user.lastAutoClaimDate = new Date();
          user.heatwaveExceedanceCount = 0; // Reset after successful claim
          user.totalClaimsSubmitted += 1;
          claimsTriggered++;

          io?.emit(`claim_update_${user._id}`, {
            status: 'approved',
            message: `Zero-Touch Claim Triggered! ₹${payoutAmount} auto-payout processed due to sustained heatwave (${currentTemp}°C).`,
            payoutAmount
          });
        }

        await user.save();

      } catch (userErr) {
        console.error(`[Zero-Touch] Error processing user ${user._id}:`, userErr.message);
      }
    }

    console.log(`[Zero-Touch] Finished. Triggered ${claimsTriggered} automated claims.`);
    
    io?.to('admin_room').emit('cron_complete', {
      type: 'zero_touch_claims',
      processedCount: activeUsers.length,
      claimsTriggered,
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.error('[Zero-Touch] Fatal error:', err);
  }
}

module.exports = { processZeroTouchClaims };
