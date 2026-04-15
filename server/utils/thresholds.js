/**
 * Dynamic Weather Thresholds - KavachForWork
 * Based on IRDAI fairness guidelines and regional climate variations.
 */

const SEASONS = {
  SUMMER: 'summer',
  MONSOON: 'monsoon',
  WINTER: 'winter'
};

/**
 * Gets the current season in India
 * Summer: March - June
 * Monsoon: July - September
 * Winter: October - February
 */
function getCurrentSeason() {
  const month = new Date().getMonth() + 1; // 1-12
  if (month >= 3 && month <= 6) return SEASONS.SUMMER;
  if (month >= 7 && month <= 9) return SEASONS.MONSOON;
  return SEASONS.WINTER;
}

const THRESHOLD_MAP = {
  'rajasthan': 40,
  'delhi': 44,
  'nct of delhi': 44,
  'punjab': 43,
  'haryana': 43,
  'uttar pradesh': 43,
  'bihar': 42,
  'madhya pradesh': 42,
  'gujarat': 43,
  'maharashtra': 40,
  'chhattisgarh': 41,
  'jharkhand': 41,
  'west bengal': 39,
  'odisha': 40,
  'andhra pradesh': 40,
  'telangana': 41,
  'tamil nadu': 38,
  'karnataka': 37,
  'kerala': 35,
  'goa': 36,
  'assam': 37,
  'meghalaya': 30,
  'arunachal pradesh': 32,
  'manipur': 32,
  'mizoram': 32,
  'nagaland': 32,
  'tripura': 35,
  'sikkim': 28,
  'himachal pradesh': 30,
  'uttarakhand': 30,
  'jammu & kashmir': 30,
  'jammu and kashmir': 30,
  'ladakh': 25,
  'andaman & nicobar': 35,
  'andaman and nicobar islands': 35,
  'puducherry': 38,
  'pondicherry': 38,
  'chandigarh': 42,
  'default': 40
};

/**
 * Returns the temperature threshold for a specific state and season.
 */
function getThreshold(state = 'default', season = getCurrentSeason()) {
  const normalized = (state || 'default').toLowerCase().trim();
  
  // Seasonal adjustments
  let base = THRESHOLD_MAP[normalized] || THRESHOLD_MAP['default'];
  
  if (season === SEASONS.MONSOON) base -= 5; // Higher humidity = lower temp needed for stress
  if (season === SEASONS.WINTER) base -= 8;  // Winter heatwaves are rare, triggered lower
  
  return base;
}

module.exports = {
  SEASONS,
  getCurrentSeason,
  getThreshold
};
