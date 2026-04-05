/**
 * Shared constants - KavachForWork
 * Payout tiers, thresholds, business logic
 */

const HEATWAVE_THRESHOLD = 45; // degrees C

const PAYOUT_TIER_MULTIPLIERS = {
  none: 0,
  mild: 0.4,
  severe: 0.7,
  extreme: 1,
};

function getPayoutTier(temp) {
  if (temp >= 50) return 'extreme';
  if (temp >= 47) return 'severe';
  if (temp >= HEATWAVE_THRESHOLD) return 'mild';
  return 'none';
}

function roundToNearestTen(amount) {
  return Math.round(amount / 10) * 10;
}

function getPayoutAmountForMax(maxPayout, temp) {
  const tier = getPayoutTier(temp);
  return roundToNearestTen((maxPayout || 0) * PAYOUT_TIER_MULTIPLIERS[tier]);
}

module.exports = {
  HEATWAVE_THRESHOLD,
  PAYOUT_TIER_MULTIPLIERS,
  getPayoutTier,
  getPayoutAmountForMax,
};
