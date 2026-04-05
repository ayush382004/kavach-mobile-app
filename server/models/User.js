const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const bankPayoutSchema = new mongoose.Schema(
  {
    accountHolderName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifscCode: { type: String, trim: true },
    bankName: { type: String, trim: true },
    verified: { type: Boolean, default: false },
    addedAt: Date,
  },
  { _id: false }
);

const upiPayoutSchema = new mongoose.Schema(
  {
    upiId: { type: String, trim: true, lowercase: true },
    verified: { type: Boolean, default: false },
    addedAt: Date,
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 100,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      match: [/^[6-9]\d{9}$/, 'Enter valid Indian mobile number'],
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },

    workerType: {
      type: String,
      enum: ['delivery_driver', 'construction_worker', 'street_vendor', 'other'],
      default: 'other',
    },
    city: { type: String, trim: true },
    state: { type: String, default: 'Rajasthan' },
    aadhaar: { type: String, select: false },

    isInsured: { type: Boolean, default: false },
    premiumUntil: { type: Date, default: null },
    weeklyPremium: { type: Number, default: 29 },
    maxPayout: { type: Number, default: 1200 },
    pricingCategory: { type: String, default: 'Moderate Risk' },
    pricingLabel: { type: String, default: 'India (Default)' },
    avgDailyWageRef: { type: String, default: 'Rs 1,000+' },

    wallet: {
      balance: { type: Number, default: 0, min: 0 },
      currency: { type: String, default: 'INR' },
    },

    payoutMethod: {
      bank: bankPayoutSchema,
      upi: upiPayoutSchema,
    },
    defaultPayoutMethod: {
      type: String,
      enum: ['wallet', 'upi', 'bank'],
      default: 'wallet',
    },

    termsAccepted: { type: Boolean, default: false },
    termsAcceptedAt: Date,
    termsVersion: { type: String, default: 'kfw-2026-04' },
    securityConsentVersion: { type: String, default: 'kfw-2026-04' },

    lastLocation: {
      lat: Number,
      lng: Number,
      city: String,
      state: String,
      accuracy: Number,
      provider: String,
      verifiedAt: Date,
      source: String,
      updatedAt: Date,
    },

    totalPremiumPaid: { type: Number, default: 0 },
    totalClaimsSubmitted: { type: Number, default: 0 },
    totalPayoutsReceived: { type: Number, default: 0 },

    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isActive: { type: Boolean, default: true },
    lastLogin: Date,

    otp: { type: String, select: false },
    otpExpiry: { type: Date, select: false },
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.isInsuranceActive = function () {
  return this.isInsured && this.premiumUntil && new Date() < this.premiumUntil;
};

userSchema.methods.toPublic = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.aadhaar;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
