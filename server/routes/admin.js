const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/auth');
const User = require('../models/User');
const Claim = require('../models/Claim');
const Transaction = require('../models/Transaction');
const { getPayoutTier, getPayoutAmountForMax } = require('../utils/constants');
const { resolvePricing } = require('../utils/pricing');
const { processClaimPayout } = require('../utils/payouts');

router.use(protect, adminOnly);

router.get('/stats', async (req, res) => {
  try {
    const [userCount, claimStats, totalRevenue, recentActivity] = await Promise.all([
      User.aggregate([
        { $match: { role: 'user' } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: ['$isInsured', 1, 0] } },
            totalWalletBalance: { $sum: '$wallet.balance' },
          },
        },
      ]),
      Claim.getAdminStats(),
      Transaction.aggregate([
        { $match: { type: 'premium_deduction' } },
        { $group: { _id: null, total: { $sum: { $abs: '$amount' } } } },
      ]),
      Claim.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('user', 'name phone workerType city')
        .select('status fraudAnalysis.fraudScore weather.city weather.ambientTemp payoutAmount createdAt sensorData rejectionReason weatherOracle'),
    ]);

    const users = userCount[0] || { total: 0, active: 0, totalWalletBalance: 0 };
    const revenue = totalRevenue[0]?.total || 0;
    const totalPayouts = claimStats.totalPayouts || 0;

    res.json({
      overview: {
        totalUsers: users.total,
        activeInsured: users.active,
        totalClaims: claimStats.totalClaims || 0,
        approvedClaims: claimStats.approvedClaims || 0,
        rejectedClaims: claimStats.rejectedClaims || 0,
        flaggedClaims: claimStats.flaggedClaims || 0,
        totalRevenue: revenue,
        totalPayouts,
        netProfit: revenue - totalPayouts,
        avgFraudScore: Math.round(claimStats.avgFraudScore || 0),
      },
      recentActivity,
    });
  } catch (err) {
    console.error('[Admin] Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

router.get('/revenue', async (req, res) => {
  try {
    const weeks = parseInt(req.query.weeks, 10) || 8;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - weeks * 7);

    const [premiumData, payoutData] = await Promise.all([
      Transaction.aggregate([
        { $match: { type: 'premium_deduction', createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              week: { $week: '$createdAt' },
            },
            total: { $sum: { $abs: '$amount' } },
          },
        },
        { $sort: { '_id.year': 1, '_id.week': 1 } },
      ]),
      Transaction.aggregate([
        { $match: { type: { $in: ['payout', 'claim_payout'] }, createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              week: { $week: '$createdAt' },
            },
            total: { $sum: '$amount' },
          },
        },
        { $sort: { '_id.year': 1, '_id.week': 1 } },
      ]),
    ]);

    res.json({ chartData: buildWeeklyChartData(premiumData, payoutData, weeks), weeks });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch revenue data.' });
  }
});

router.get('/claims', async (req, res) => {
  try {
    const { status, page = 1, limit = 20, flaggedOnly } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (flaggedOnly === 'true') filter.status = 'flagged';

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const [claims, total] = await Promise.all([
      Claim.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate('user', 'name phone workerType city'),
      Claim.countDocuments(filter),
    ]);

    res.json({
      claims,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch claims.' });
  }
});

router.put('/claims/:id', async (req, res) => {
  try {
    const { action, adminNote } = req.body;
    const claim = await Claim.findById(req.params.id).populate('user');

    if (!claim) return res.status(404).json({ error: 'Claim not found.' });
    if (['paid', 'rejected'].includes(claim.status)) {
      return res.status(400).json({ error: 'Claim already finalized.' });
    }

    if (action === 'approve') {
      if (claim.status !== 'flagged') {
        return res.status(400).json({ error: 'Only manually reviewed claims can be approved.' });
      }

      const pricing =
        claim.pricingSnapshot ||
        resolvePricing(claim.location?.state || claim.user?.state, claim.location?.city || claim.weather?.city || claim.user?.city);
      const tier = getPayoutTier(claim.triggerTemp);
      const amount = getPayoutAmountForMax(pricing.maxPayout, claim.triggerTemp);

      await Claim.findByIdAndUpdate(claim._id, {
        status: 'approved',
        payoutAmount: amount,
        payoutTier: tier,
        pricingSnapshot: pricing,
        adminNote,
        reviewedBy: req.user._id,
        reviewedAt: new Date(),
        payoutStatus: 'pending',
      });

      const payoutResult = await processClaimPayout({
        user: claim.user,
        claim,
        amount,
        io: req.app.get('io'),
      });

      req.app.get('io')?.to('admin_room').emit('claim_updated', { claimId: claim._id, status: 'paid', amount });
      return res.json({ message: payoutResult.message });
    }

    if (action === 'reject') {
      await Claim.findByIdAndUpdate(claim._id, {
        status: 'rejected',
        rejectionReason: adminNote || 'Rejected by admin',
        reviewedBy: req.user._id,
        reviewedAt: new Date(),
        payoutStatus: 'failed',
      });

      req.app.get('io')?.to('admin_room').emit('claim_updated', { claimId: claim._id, status: 'rejected' });
      return res.json({ message: 'Claim rejected.' });
    }

    res.status(400).json({ error: 'Invalid action. Use approve or reject.' });
  } catch (err) {
    console.error('[Admin] Claim update error:', err);
    res.status(500).json({ error: 'Failed to update claim.' });
  }
});

router.get('/workers/map', async (req, res) => {
  try {
    const workers = await User.find({
      role: 'user',
      'lastLocation.lat': { $exists: true },
    })
      .select('name workerType city isInsured lastLocation wallet.balance')
      .limit(200);

    res.json({ workers });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch worker locations.' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const [users, total] = await Promise.all([
      User.find({ role: 'user' })
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .select('-password -aadhaar'),
      User.countDocuments({ role: 'user' }),
    ]);

    res.json({ users, pagination: { page: pageNum, limit: limitNum, total } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

router.get('/fraud-stats', async (req, res) => {
  try {
    const stats = await Claim.aggregate([
      {
        $group: {
          _id: null,
          totalAnalyzed: { $sum: 1 },
          flaggedFraud: { $sum: { $cond: [{ $gte: ['$fraudAnalysis.fraudScore', 50] }, 1, 0] } },
          suspectedFraud: {
            $sum: {
              $cond: [
                { $and: [{ $gte: ['$fraudAnalysis.fraudScore', 20] }, { $lt: ['$fraudAnalysis.fraudScore', 50] }] },
                1,
                0,
              ],
            },
          },
          legitimate: { $sum: { $cond: [{ $lt: ['$fraudAnalysis.fraudScore', 20] }, 1, 0] } },
          avgFraudScore: { $avg: '$fraudAnalysis.fraudScore' },
          moneySaved: {
            $sum: {
              $cond: [{ $gte: ['$fraudAnalysis.fraudScore', 50] }, '$payoutAmount', 0],
            },
          },
        },
      },
    ]);

    res.json(stats[0] || { totalAnalyzed: 0, flaggedFraud: 0, legitimate: 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch fraud stats.' });
  }
});

function buildWeeklyChartData(premiumData, payoutData, weeks) {
  const labels = [];
  const premiums = [];
  const payouts = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i * 7);
    const weekNum = getWeekNumber(date);
    const year = date.getFullYear();
    const label = `W${weekNum}`;

    labels.push(label);
    premiums.push(premiumData.find((item) => item._id.week === weekNum && item._id.year === year)?.total || 0);
    payouts.push(payoutData.find((item) => item._id.week === weekNum && item._id.year === year)?.total || 0);
  }

  return labels.map((label, index) => ({
    week: label,
    premiums: premiums[index],
    payouts: payouts[index],
    profit: premiums[index] - payouts[index],
  }));
}

function getWeekNumber(date) {
  const onejan = new Date(date.getFullYear(), 0, 1);
  return Math.ceil((((date - onejan) / 86400000) + onejan.getDay() + 1) / 7);
}

module.exports = router;
