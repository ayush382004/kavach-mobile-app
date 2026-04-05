/**
 * Database Seed Script — KavachForWork
 * Creates admin user, demo workers, sample claims, transactions
 * Run: node seed.js
 */

const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('./models/User');
const Claim = require('./models/Claim');
const Transaction = require('./models/Transaction');
const { resolvePricing } = require('./utils/pricing');
const { resolveMongoUri } = require('./utils/mongoUri');

const MONGODB_URI = resolveMongoUri();
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo@1234'; // Change in production

const DEMO_WORKERS = [
  { name: 'Raju Kumar', phone: '9876543210', workerType: 'delivery_driver', city: 'Jaipur', state: 'Rajasthan', wallet: { balance: 271 }, isInsured: true },
  { name: 'Sunita Devi', phone: '9876543211', workerType: 'street_vendor', city: 'Jodhpur', state: 'Rajasthan', wallet: { balance: 150 }, isInsured: true },
  { name: 'Mohan Singh', phone: '9876543212', workerType: 'construction_worker', city: 'Bikaner', state: 'Rajasthan', wallet: { balance: 45 }, isInsured: false },
  { name: 'Priya Sharma', phone: '9876543213', workerType: 'delivery_driver', city: 'Nagpur', state: 'Maharashtra', wallet: { balance: 380 }, isInsured: true },
  { name: 'Abdul Rahman', phone: '9876543214', workerType: 'street_vendor', city: 'Lucknow', state: 'Uttar Pradesh', wallet: { balance: 90 }, isInsured: true },
];

async function seed() {
  console.log('🌱 Starting seed...');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Claim.deleteMany({}),
      Transaction.deleteMany({}),
    ]);
    console.log('✓ Cleared existing data');

    // Create admin
    const adminPricing = resolvePricing('Maharashtra', 'Mumbai');
    const admin = await User.create({
      name: 'Kavach Admin',
      phone: '9999999999',
      email: process.env.ADMIN_EMAIL || 'admin@kavachforwork.in',
      password: process.env.ADMIN_PASSWORD || 'Admin@Kavach2024',
      role: 'admin',
      city: 'Mumbai',
      state: 'Maharashtra',
      weeklyPremium: adminPricing.weeklyPremium,
      maxPayout: adminPricing.maxPayout,
      pricingCategory: adminPricing.category,
      pricingLabel: adminPricing.label,
      avgDailyWageRef: adminPricing.avgDailyWageRef,
      wallet: { balance: 0 },
    });
    console.log(`✓ Admin created: ${admin.email}`);

    // Create demo workers
    const premiumExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const workers = [];

    for (const w of DEMO_WORKERS) {
      const pricing = resolvePricing(w.state, w.city);
      const worker = await User.create({
        ...w,
        weeklyPremium: pricing.weeklyPremium,
        maxPayout: pricing.maxPayout,
        pricingCategory: pricing.category,
        pricingLabel: pricing.label,
        avgDailyWageRef: pricing.avgDailyWageRef,
        password: DEMO_PASSWORD,
        email: `${w.phone}@demo.kavach.in`,
        premiumUntil: w.isInsured ? premiumExpiry : null,
        totalPremiumPaid: w.isInsured ? 87 : 0, // 3 weeks paid
        totalClaimsSubmitted: Math.floor(Math.random() * 4),
        totalPayoutsReceived: w.isInsured ? Math.floor(Math.random() * 600) : 0,
        lastLocation: {
          lat: 26 + Math.random() * 4,
          lng: 72 + Math.random() * 8,
          city: w.city,
          updatedAt: new Date(),
        },
      });
      workers.push(worker);

      // Premium deduction transaction
      if (w.isInsured) {
        await Transaction.create({
          user: worker._id,
          type: 'premium_deduction',
          amount: -29,
          balanceAfter: w.wallet.balance,
          description: 'Weekly Kavach insurance premium — activated',
          status: 'completed',
          reference: `SEED-PREM-${Date.now()}`,
        });
      }
    }
    console.log(`✓ ${workers.length} demo workers created`);

    // Create sample claims
    const claimData = [
      { userIdx: 0, temp: 47.2, status: 'paid', fraudScore: 18, payout: 300, tier: 'severe' },
      { userIdx: 1, temp: 45.8, status: 'paid', fraudScore: 22, payout: 150, tier: 'mild' },
      { userIdx: 2, temp: 46.1, status: 'flagged', fraudScore: 72, payout: 0, tier: 'mild' },
      { userIdx: 3, temp: 49.5, status: 'paid', fraudScore: 15, payout: 300, tier: 'severe' },
      { userIdx: 4, temp: 50.2, status: 'approved', fraudScore: 10, payout: 500, tier: 'extreme' },
      { userIdx: 0, temp: 48.0, status: 'rejected', fraudScore: 85, payout: 0, tier: 'severe' },
    ];

    for (const cd of claimData) {
      const worker = workers[cd.userIdx];
      await Claim.create({
        user: worker._id,
        weather: {
          ambientTemp: cd.temp,
          feelsLike: cd.temp + 2,
          humidity: 15,
          windSpeed: 10,
          condition: 'Sunny',
          city: worker.city,
        },
        sensorData: {
          deviceTemp: cd.fraudScore < 40 ? 42 : 26,
          isCharging: cd.fraudScore > 60,
          batteryDrainRate: cd.fraudScore < 40 ? 0.5 : 0.08,
          brightnessLevel: cd.fraudScore < 40 ? 0.9 : 0.2,
          networkType: cd.fraudScore < 40 ? 'mobile' : 'wifi',
          networkTypeEncoded: cd.fraudScore < 40 ? 2 : 0,
          jitter: cd.fraudScore < 40 ? 0.7 : 0.05,
          altitudeVariance: 0.15,
        },
        location: {
          lat: worker.lastLocation.lat,
          lng: worker.lastLocation.lng,
          city: worker.city,
          state: worker.state,
        },
        fraudAnalysis: {
          fraudScore: cd.fraudScore,
          fraudProbability: cd.fraudScore / 100,
          legitimacyProbability: 1 - cd.fraudScore / 100,
          isLegit: cd.fraudScore < 60,
          modelVersion: 'sentry_v1',
        },
        payoutAmount: cd.payout,
        payoutTier: cd.tier,
        status: cd.status,
        heatwaveTriggered: true,
        triggerTemp: cd.temp,
        paidAt: cd.status === 'paid' ? new Date() : null,
      });
    }
    console.log(`✓ ${claimData.length} sample claims created`);

    // Weekly revenue transactions (last 8 weeks)
    for (let week = 0; week < 8; week++) {
      const weekDate = new Date();
      weekDate.setDate(weekDate.getDate() - week * 7);

      // Premiums for this week
      const premiumCount = 3 + Math.floor(Math.random() * 5);
      for (let j = 0; j < premiumCount; j++) {
        const worker = workers[j % workers.length];
        await Transaction.create({
          user: worker._id,
          type: 'premium_deduction',
          amount: -29,
          balanceAfter: 100,
          description: `Auto weekly Kavach premium — Week ${8 - week}`,
          status: 'completed',
          createdAt: weekDate,
          reference: `AUTO-W${8-week}-${j}`,
        });
      }

      // Payout for some weeks
      if (week % 2 === 0) {
        await Transaction.create({
          user: workers[0]._id,
          type: 'payout',
          amount: 300,
          balanceAfter: 400,
          description: `Heatwave claim payout — ${workers[0].city}`,
          status: 'completed',
          createdAt: weekDate,
        });
      }
    }
    console.log('✓ Revenue history created (8 weeks)');

    console.log('\n🎉 Seed complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Admin login:  ${admin.email} / Admin@Kavach2024`);
    console.log(`Demo worker:  9876543210 / Demo@1234`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
