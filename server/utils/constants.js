/**
 * Shared constants - KavachForWork
 * Payout tiers, thresholds, business logic
 */

const { getThreshold } = require('./thresholds');

const PAYOUT_TIER_MULTIPLIERS = {
  none: 0,
  mild: 0.4,
  severe: 0.7,
  extreme: 1,
};

function getPayoutTier(temp, state = 'Rajasthan') {
  const threshold = getThreshold(state);
  if (temp >= threshold + 5) return 'extreme';
  if (temp >= threshold + 2) return 'severe';
  if (temp >= threshold) return 'mild';
  return 'none';
}

function roundToNearestTen(amount) {
  return Math.round(amount / 10) * 10;
}

function getPayoutAmountForMax(maxPayout, temp, state = 'Rajasthan') {
  const tier = getPayoutTier(temp, state);
  return roundToNearestTen((maxPayout || 0) * PAYOUT_TIER_MULTIPLIERS[tier]);
}

module.exports = {
  PAYOUT_TIER_MULTIPLIERS,
  getPayoutTier,
  getPayoutAmountForMax,
  getThreshold
};
