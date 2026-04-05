/**
 * Claim Model - KavachForWork
 * Heatwave insurance claim with AI fraud detection result
 */

const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  weather: {
    ambientTemp: { type: Number, required: true },
    feelsLike: Number,
    humidity: Number,
    windSpeed: Number,
    condition: String,
    city: String,
    country: { type: String, default: 'IN' },
    weatherIcon: String,
  },

  sensorData: {
    deviceTemp: Number,
    isCharging: { type: Boolean, default: false },
    batteryDrainRate: { type: Number, default: 0.3 },
    brightnessLevel: { type: Number, default: 0.5 },
    networkType: { type: String, default: 'mobile' },
    networkTypeEncoded: { type: Number, default: 2 },
    jitter: { type: Number, default: 0.5 },
    altitudeVariance: { type: Number, default: 0.1 },
    isMockLocation: { type: Boolean, default: false },
    locationVerified: { type: Boolean, default: true },
    hardwareHeartbeat: { type: Boolean, default: false },
    batteryTempStatic: { type: Boolean, default: false },
    motionIdle: { type: Boolean, default: false },
    motionSamples: { type: Number, default: 0 },
  },

  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    accuracy: Number,
    city: String,
    state: String,
  },

  aqi: {
    value: Number,
    category: String,
    pm25: Number,
  },

  fraudAnalysis: {
    fraudScore: { type: Number, min: 0, max: 100 },
    fraudProbability: Number,
    legitimacyProbability: Number,
    isLegit: Boolean,
    signals: {
      tempMatch: Boolean,
      outdoorBattery: Boolean,
      networkOutdoor: Boolean,
      motionDetected: Boolean,
      brightnessHigh: Boolean,
      mockLocationSafe: Boolean,
      locationVerified: Boolean,
      hardwareHeartbeat: Boolean,
      batteryNotStatic: Boolean,
      movementDetected: Boolean,
    },
    modelVersion: { type: String, default: 'sentry_v1' },
    analyzedAt: { type: Date, default: Date.now },
  },

  weatherOracle: {
    enabled: { type: Boolean, default: false },
    oracleScore: Number,
    heatwaveProbability: Number,
    isHeatwave: Boolean,
    rawPrediction: Number,
    modelVersion: String,
    evaluatedAt: { type: Date, default: Date.now },
  },

  payoutAmount: { type: Number, default: 0 },
  payoutMethod: {
    type: String,
    enum: ['wallet', 'bank', 'upi'],
    default: 'wallet',
  },
  payoutStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
  },
  payoutTier: {
    type: String,
    enum: ['none', 'mild', 'severe', 'extreme'],
    default: 'none',
  },
  pricingSnapshot: {
    label: String,
    category: String,
    weeklyPremium: Number,
    maxPayout: Number,
    avgDailyWageRef: String,
    state: String,
    city: String,
  },

  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'paid', 'flagged'],
    default: 'pending',
    index: true,
  },
  rejectionReason: String,
  adminNote: String,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  paidAt: Date,

  heatwaveTriggered: { type: Boolean, default: false },
  triggerTemp: Number,
}, {
  timestamps: true,
});

claimSchema.index({ user: 1, createdAt: -1 });
claimSchema.index({ heatwaveTriggered: 1 });

claimSchema.statics.getAdminStats = async function () {
  const [totals] = await this.aggregate([
    {
      $group: {
        _id: null,
        totalClaims: { $sum: 1 },
        approvedClaims: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
        rejectedClaims: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
        flaggedClaims: { $sum: { $cond: [{ $eq: ['$status', 'flagged'] }, 1, 0] } },
        paidClaims: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
        totalPayouts: { $sum: '$payoutAmount' },
        avgFraudScore: { $avg: '$fraudAnalysis.fraudScore' },
      },
    },
  ]);
  return totals || {};
};

module.exports = mongoose.model('Claim', claimSchema);
