const mongoose = require('mongoose');

const librarySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
    },
    contactEmail: {
      type: String,
      required: true,
    },
    contactPhone: {
      type: String,
      required: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subscriptionPlan: {
      type: String,
      enum: ['free', 'basic', 'pro', 'enterprise'],
      default: 'free',
    },
    subscriptionExpiresAt: {
      type: Date,
    },
    logoUrl: {
      type: String,
    },
    domain: {
      type: String, // e.g. "sunrise-library" (subdomain) or a full custom domain
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    themeColor: {
      type: String,
      default: '#2563eb', // white-label accent color, admin-configurable
    },
    qrPaymentImageUrl: {
      type: String, // static QR code image for manual/screenshot payments
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    settings: {
      graceMinutesForNoShow: {
        type: Number,
        default: 15,
      },
      allowWaitingList: {
        type: Boolean,
        default: true,
      },
            durationDiscounts: {
        // percent off, keyed by duration. Admin sets these later —
        // 0 means no discount, i.e. plain monthlyPrice x months.
        1: { type: Number, default: 0 },
        2: { type: Number, default: 0 },
        3: { type: Number, default: 0 },
      },
      seatMonthlyPrice: {
        type: Number,
        required: true,
        default: 0, // single price for every seat — admin sets this, no per-seat-type pricing
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Library', librarySchema);
