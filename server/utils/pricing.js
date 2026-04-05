/**
 * Location-based pricing for KavachForWork.
 * State / UT based risk pricing table.
 */

const LOCATION_PRICING = [
  { state: 'Delhi', label: 'Delhi (NCT)', category: 'Ultra High', weeklyPremium: 55, maxPayout: 1800, avgDailyWageRef: 'N/A' },
  { state: 'Maharashtra', label: 'Maharashtra', category: 'High (Monsoon)', weeklyPremium: 50, maxPayout: 1600, avgDailyWageRef: 'N/A' },
  { state: 'Gujarat', label: 'Gujarat', category: 'High (Heat)', weeklyPremium: 48, maxPayout: 1500, avgDailyWageRef: 'N/A' },
  { state: 'Rajasthan', label: 'Rajasthan', category: 'High (Heatwave)', weeklyPremium: 45, maxPayout: 1400, avgDailyWageRef: 'N/A' },
  { state: 'Karnataka', label: 'Karnataka', category: 'Moderate', weeklyPremium: 35, maxPayout: 1300, avgDailyWageRef: 'N/A' },
  { state: 'Tamil Nadu', label: 'Tamil Nadu', category: 'High (Cyclonic)', weeklyPremium: 42, maxPayout: 1400, avgDailyWageRef: 'N/A' },
  { state: 'Telangana', label: 'Telangana', category: 'Moderate', weeklyPremium: 38, maxPayout: 1300, avgDailyWageRef: 'N/A' },
  { state: 'West Bengal', label: 'West Bengal', category: 'High (Flood)', weeklyPremium: 40, maxPayout: 1200, avgDailyWageRef: 'N/A' },
  { state: 'Uttar Pradesh', label: 'Uttar Pradesh', category: 'Moderate', weeklyPremium: 36, maxPayout: 1200, avgDailyWageRef: 'N/A' },
  { state: 'Haryana', label: 'Haryana', category: 'Moderate', weeklyPremium: 38, maxPayout: 1250, avgDailyWageRef: 'N/A' },
  { state: 'Punjab', label: 'Punjab', category: 'Moderate', weeklyPremium: 37, maxPayout: 1200, avgDailyWageRef: 'N/A' },
  { state: 'Andhra Pradesh', label: 'Andhra Pradesh', category: 'High (Coastal)', weeklyPremium: 41, maxPayout: 1300, avgDailyWageRef: 'N/A' },
  { state: 'Kerala', label: 'Kerala', category: 'Moderate (Rain)', weeklyPremium: 32, maxPayout: 1200, avgDailyWageRef: 'N/A' },
  { state: 'Bihar', label: 'Bihar', category: 'High (Flood)', weeklyPremium: 29, maxPayout: 1000, avgDailyWageRef: 'N/A' },
  { state: 'Odisha', label: 'Odisha', category: 'High (Cyclonic)', weeklyPremium: 34, maxPayout: 1100, avgDailyWageRef: 'N/A' },
  { state: 'Madhya Pradesh', label: 'Madhya Pradesh', category: 'Moderate', weeklyPremium: 33, maxPayout: 1100, avgDailyWageRef: 'N/A' },
  { state: 'Jharkhand', label: 'Jharkhand', category: 'Moderate', weeklyPremium: 31, maxPayout: 1050, avgDailyWageRef: 'N/A' },
  { state: 'Chhattisgarh', label: 'Chhattisgarh', category: 'Moderate', weeklyPremium: 30, maxPayout: 1000, avgDailyWageRef: 'N/A' },
  { state: 'Assam', label: 'Assam', category: 'Ultra High (Flood)', weeklyPremium: 44, maxPayout: 1200, avgDailyWageRef: 'N/A' },
  { state: 'Uttarakhand', label: 'Uttarakhand', category: 'High (Terrain)', weeklyPremium: 39, maxPayout: 1300, avgDailyWageRef: 'N/A' },
  { state: 'Himachal Pradesh', label: 'Himachal Pradesh', category: 'High (Terrain)', weeklyPremium: 38, maxPayout: 1300, avgDailyWageRef: 'N/A' },
  { state: 'Jammu & Kashmir', label: 'Jammu & Kashmir (UT)', category: 'High', weeklyPremium: 35, maxPayout: 1200, avgDailyWageRef: 'N/A' },
  { state: 'Goa', label: 'Goa', category: 'Low', weeklyPremium: 25, maxPayout: 900, avgDailyWageRef: 'N/A' },
  { state: 'Arunachal Pradesh', label: 'Arunachal Pradesh', category: 'High (Rain)', weeklyPremium: 32, maxPayout: 1100, avgDailyWageRef: 'N/A' },
  { state: 'Manipur', label: 'Manipur', category: 'Moderate', weeklyPremium: 30, maxPayout: 1000, avgDailyWageRef: 'N/A' },
  { state: 'Meghalaya', label: 'Meghalaya', category: 'Ultra High (Rain)', weeklyPremium: 42, maxPayout: 1100, avgDailyWageRef: 'N/A' },
  { state: 'Tripura', label: 'Tripura', category: 'Moderate', weeklyPremium: 29, maxPayout: 1000, avgDailyWageRef: 'N/A' },
  { state: 'Nagaland', label: 'Nagaland', category: 'Moderate', weeklyPremium: 28, maxPayout: 1000, avgDailyWageRef: 'N/A' },
  { state: 'Mizoram', label: 'Mizoram', category: 'Moderate', weeklyPremium: 28, maxPayout: 1000, avgDailyWageRef: 'N/A' },
  { state: 'Sikkim', label: 'Sikkim', category: 'Moderate', weeklyPremium: 30, maxPayout: 1100, avgDailyWageRef: 'N/A' },
  { state: 'Ladakh', label: 'Ladakh (UT)', category: 'Extreme (Cold)', weeklyPremium: 45, maxPayout: 1500, avgDailyWageRef: 'N/A' },
  { state: 'Puducherry', label: 'Puducherry (UT)', category: 'Low', weeklyPremium: 24, maxPayout: 900, avgDailyWageRef: 'N/A' },
  { state: 'Chandigarh', label: 'Chandigarh (UT)', category: 'Low', weeklyPremium: 26, maxPayout: 1000, avgDailyWageRef: 'N/A' },
  { state: 'Andaman & Nicobar Islands', label: 'Andaman & Nicobar', category: 'High (Storm)', weeklyPremium: 40, maxPayout: 1200, avgDailyWageRef: 'N/A' },
  { state: 'Dadra and Nagar Haveli and Daman and Diu', label: 'DNH & Daman Diu', category: 'Moderate', weeklyPremium: 32, maxPayout: 1100, avgDailyWageRef: 'N/A' },
  { state: 'Lakshadweep', label: 'Lakshadweep', category: 'Moderate', weeklyPremium: 30, maxPayout: 1000, avgDailyWageRef: 'N/A' },
];

const STATE_ALIASES = {
  'Delhi (NCT)': 'Delhi',
  'NCT of Delhi': 'Delhi',
  'Jammu and Kashmir': 'Jammu & Kashmir',
  'Andaman and Nicobar Islands': 'Andaman & Nicobar Islands',
  'Andaman & Nicobar': 'Andaman & Nicobar Islands',
  'Dadra & Nagar Haveli and Daman & Diu': 'Dadra and Nagar Haveli and Daman and Diu',
  'DNH & Daman Diu': 'Dadra and Nagar Haveli and Daman and Diu',
  'Pondicherry': 'Puducherry',
};

const DEFAULT_PRICING = {
  label: 'India (Default)',
  category: 'Moderate',
  weeklyPremium: 35,
  maxPayout: 1200,
  avgDailyWageRef: 'N/A',
};

function canonicalizeState(state = '') {
  const normalized = state.toString().trim();
  return STATE_ALIASES[normalized] || normalized;
}

function resolvePricing(state, city = '') {
  const canonicalState = canonicalizeState(state || 'Rajasthan');
  const pricing = LOCATION_PRICING.find((entry) => entry.state === canonicalState) || DEFAULT_PRICING;

  return {
    state: canonicalState,
    city: city || '',
    label: pricing.label,
    category: pricing.category,
    weeklyPremium: pricing.weeklyPremium,
    maxPayout: pricing.maxPayout,
    avgDailyWageRef: pricing.avgDailyWageRef,
  };
}

module.exports = {
  LOCATION_PRICING,
  DEFAULT_PRICING,
  resolvePricing,
  canonicalizeState,
};
