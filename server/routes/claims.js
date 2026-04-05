const router = require('express').Router();
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { protect } = require('../middleware/auth');
const Claim = require('../models/Claim');
const User = require('../models/User');
const { getPayoutTier, getPayoutAmountForMax } = require('../utils/constants');
const { resolvePricing } = require('../utils/pricing');
const { processClaimPayout } = require('../utils/payouts');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_WEATHER_ORACLE_ENABLED = process.env.AI_WEATHER_ORACLE_ENABLED === 'true';

const claimLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  message: { error: 'You can only submit 3 claims per day.' },
});

function evaluateSensorIntegrity(sensorData = {}) {
  const isMockLocation = !!sensorData.isMockLocation;
  const locationVerified = sensorData.locationVerified !== false;
  const hardwareHeartbeat = !!sensorData.hardwareHeartbeat;
  const batteryTempStatic = !!sensorData.batteryTempStatic;
  const motionIdle = !!sensorData.motionIdle;

  return {
    isMockLocation,
    locationVerified,
    hardwareHeartbeat,
    batteryTempStatic,
    motionIdle,
    verified: !isMockLocation && locationVerified && hardwareHeartbeat && !batteryTempStatic && !motionIdle,
  };
}

router.post(
  '/submit',
  protect,
  claimLimiter,
  [
    body('location.lat').isFloat({ min: 6, max: 37.5 }).withMessage('Your GPS location is outside India. Claims can only be filed from within India.'),
    body('location.lng').isFloat({ min: 68, max: 97.5 }).withMessage('Your GPS location is outside India. Claims can only be filed from within India.'),
    body('weather.ambientTemp').isFloat({ min: 30, max: 60 }).withMessage('Invalid temperature'),
    body('sensorData.deviceTemp').optional().isFloat({ min: 20, max: 65 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const firstError = errors.array()[0].msg;
        return res.status(400).json({
          error: firstError,
          code: firstError.includes('outside India') ? 'OUTSIDE_INDIA' : 'VALIDATION_ERROR',
        });
      }

      const user = req.user;
      if (!user.isInsuranceActive()) {
        return res.status(403).json({
          error: 'Your insurance is not active. Please activate weekly coverage first.',
          code: 'INSURANCE_INACTIVE',
        });
      }

      // State mismatch check: if claim location state != registered state, block it
      const claimState = req.body.location?.state || req.body.weather?.state || '';
      const userState = (user.state || '').toLowerCase().trim();
      const claimStateLower = claimState.toLowerCase().trim();
      if (claimStateLower && userState && claimStateLower !== userState) {
        return res.status(403).json({
          error: `You are currently in ${claimState} but your insurance is registered for ${user.state}. ` +
            `State-based coverage does not transfer automatically. ` +
            `Please deactivate and re-activate your insurance to cover your new state (pricing may differ).`,
          code: 'STATE_MISMATCH',
          registeredState: user.state,
          currentState: claimState,
        });
      }

      const ambientTemp = req.body.weather.ambientTemp;
      if (ambientTemp < 45) {
        return res.status(400).json({
          error: `Temperature ${ambientTemp}C is below heatwave threshold (45C). Claim not applicable.`,
          code: 'BELOW_THRESHOLD',
        });
      }

      const { location, weather, sensorData, aqi } = req.body;

      let fraudAnalysis = {
        fraudScore: 10,
        isLegit: true,
        modelVersion: 'sentry_v1_fallback',
        reviewRequired: false,
      };

      let weatherOracle = null;

      try {
        const aiResponse = await axios.post(
          `${AI_SERVICE_URL}/verify-claim`,
          {
            ambient_temp: ambientTemp,
            device_temp: sensorData?.deviceTemp || 40,
            jitter: sensorData?.jitter || 0.5,
            is_charging: sensorData?.isCharging ? 1 : 0,
            network_type_encoded: sensorData?.networkTypeEncoded || 2,
            battery_drain_rate: sensorData?.batteryDrainRate || 0.4,
            brightness_level: sensorData?.brightnessLevel || 0.7,
            altitude_variance: sensorData?.altitudeVariance || 0.2,
          },
          { timeout: 5000 }
        );

        fraudAnalysis = aiResponse.data;
      } catch (aiErr) {
        console.error('[Claims] AI service error:', aiErr.message);
        fraudAnalysis = {
          ...fraudAnalysis,
          reviewRequired: true,
          degradedMode: true,
          signals: {
            aiOfflineFallback: true,
          },
        };
      }

      if (AI_WEATHER_ORACLE_ENABLED) {
        try {
          const oracleResponse = await axios.post(
            `${AI_SERVICE_URL}/oracle/predict`,
            {
              features: {
                temperature_c: ambientTemp,
                humidity: weather.humidity || 0,
                wind_speed_ms: weather.windSpeed || 0,
                precipitation_mm: weather.precipitation || 0,
              },
            },
            { timeout: 5000 }
          );
          weatherOracle = oracleResponse.data;
        } catch (oracleErr) {
          console.error('[Claims] Weather oracle error:', oracleErr.message);
        }
      }

      const pricing = resolvePricing(user.state, weather.city || location.city || user.city);
      const payoutTier = getPayoutTier(ambientTemp);
      const payoutAmount = getPayoutAmountForMax(pricing.maxPayout, ambientTemp);
      const sensorIntegrity = evaluateSensorIntegrity(sensorData);

      let status = 'pending';
      if (weatherOracle?.is_heatwave === false || payoutTier === 'none') {
        status = 'rejected';
      } else if (!sensorIntegrity.verified) {
        status = 'rejected';
        fraudAnalysis.reviewRequired = true;
        fraudAnalysis.fraudScore = Math.max(fraudAnalysis.fraudScore || 0, sensorIntegrity.isMockLocation ? 100 : 50);
      } else if (!fraudAnalysis.degradedMode && (fraudAnalysis.fraudScore || 0) >= 50) {
        status = 'rejected';
      } else if (!fraudAnalysis.degradedMode && (fraudAnalysis.fraudScore || 0) >= 20) {
        status = 'flagged';
        fraudAnalysis.reviewRequired = true;
      } else {
        status = 'approved';
      }

      const claim = await Claim.create({
        user: user._id,
        weather: {
          ambientTemp,
          feelsLike: weather.feelsLike,
          humidity: weather.humidity,
          windSpeed: weather.windSpeed,
          precipitation: weather.precipitation || 0,
          condition: weather.condition,
          city: weather.city || location.city,
          weatherIcon: weather.weatherIcon,
        },
        sensorData: {
          deviceTemp: sensorData?.deviceTemp,
          isCharging: sensorData?.isCharging || false,
          batteryDrainRate: sensorData?.batteryDrainRate || 0.3,
          brightnessLevel: sensorData?.brightnessLevel || 0.5,
          networkType: sensorData?.networkType || 'mobile',
          networkTypeEncoded: sensorData?.networkTypeEncoded || 2,
          jitter: sensorData?.jitter || 0.5,
          altitudeVariance: sensorData?.altitudeVariance || 0.1,
          isMockLocation: sensorData?.isMockLocation || false,
          locationVerified: sensorData?.locationVerified !== false,
          hardwareHeartbeat: sensorData?.hardwareHeartbeat || false,
          batteryTempStatic: sensorData?.batteryTempStatic || false,
          motionIdle: sensorData?.motionIdle || false,
          motionSamples: sensorData?.motionSamples || 0,
        },
        location,
        aqi: aqi || {},
        fraudAnalysis: {
          fraudScore: fraudAnalysis.fraudScore,
          fraudProbability: fraudAnalysis.fraud_probability,
          legitimacyProbability: fraudAnalysis.legit_probability,
          isLegit: (fraudAnalysis.fraudScore || 0) < 20 && sensorIntegrity.verified,
          signals: {
            ...(fraudAnalysis.signals || {}),
            mockLocationSafe: !sensorIntegrity.isMockLocation,
            locationVerified: sensorIntegrity.locationVerified,
            hardwareHeartbeat: sensorIntegrity.hardwareHeartbeat,
            batteryNotStatic: !sensorIntegrity.batteryTempStatic,
            movementDetected: !sensorIntegrity.motionIdle,
          },
          modelVersion: 'sentry_v1',
        },
        payoutAmount: status === 'approved' ? payoutAmount : 0,
        payoutMethod: user.defaultPayoutMethod || 'wallet',
        payoutStatus: status === 'approved' ? 'pending' : 'failed',
        payoutTier,
        pricingSnapshot: pricing,
        status,
        weatherOracle: {
          enabled: AI_WEATHER_ORACLE_ENABLED,
          oracleScore: weatherOracle?.oracle_score ?? null,
          heatwaveProbability: weatherOracle?.heatwave_probability ?? null,
          isHeatwave: weatherOracle?.is_heatwave ?? null,
          rawPrediction: weatherOracle?.raw_prediction ?? null,
          modelVersion: weatherOracle?.model_version || 'weather_oracle_v1',
        },
        heatwaveTriggered: ambientTemp >= 45,
        triggerTemp: ambientTemp,
      });

      let payoutMessage = null;
      let finalPayoutMethod = claim.payoutMethod;
      if (status === 'approved' && payoutAmount > 0) {
        const payoutResult = await processClaimPayout({
          user,
          claim,
          amount: payoutAmount,
          io: req.app.get('io'),
        });
        payoutMessage = payoutResult.message;
        finalPayoutMethod = payoutResult.payoutMethod;
      }

      const io = req.app.get('io');
      io?.to('admin_room').emit('new_claim', {
        claimId: claim._id,
        userId: user._id,
        userName: user.name,
        status,
        fraudScore: fraudAnalysis.fraudScore,
        payoutAmount: status === 'approved' ? payoutAmount : 0,
        city: weather.city,
        temp: ambientTemp,
      });

      await User.findByIdAndUpdate(user._id, {
        $inc: { totalClaimsSubmitted: 1 },
      });

      res.status(201).json({
        message:
          status === 'approved'
            ? payoutMessage || `Claim approved! Rs ${payoutAmount} processed.`
            : status === 'flagged'
              ? 'Claim requires manual review before any payout.'
              : 'Claim blocked due to fraud or failed sensor verification.',
        claim: {
          _id: claim._id,
          status,
          fraudScore: fraudAnalysis.fraudScore,
          payoutAmount: status === 'approved' ? payoutAmount : 0,
          payoutMethod: finalPayoutMethod,
          payoutTier,
          pricing: pricing.label,
          temperature: ambientTemp,
          city: weather.city,
        },
      });
    } catch (err) {
      console.error('[Claims] Submit error:', err);
      res.status(500).json({ error: 'Failed to submit claim. Please try again.' });
    }
  }
);

router.get('/my', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const [claims, total] = await Promise.all([
      Claim.find({ user: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit).select('-__v'),
      Claim.countDocuments({ user: req.user._id }),
    ]);

    res.json({
      claims,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch claims.' });
  }
});

router.get('/ai-status', protect, async (req, res) => {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/health`, { timeout: 3000 });
    res.json({
      online: true,
      serviceUrl: AI_SERVICE_URL,
      fraudModelReady: !!response.data?.fraud_model_ready,
      weatherModelReady: !!response.data?.weather_model_ready,
      status: response.data?.status || 'ok',
    });
  } catch (err) {
    res.json({
      online: false,
      serviceUrl: AI_SERVICE_URL,
      fraudModelReady: false,
      weatherModelReady: false,
      status: 'offline',
      detail: err.code || err.message,
    });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const claim = await Claim.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!claim) {
      return res.status(404).json({ error: 'Claim not found.' });
    }

    res.json({ claim });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch claim.' });
  }
});

module.exports = router;
