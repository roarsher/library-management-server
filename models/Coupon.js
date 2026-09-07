const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    libraryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Library', required: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    discountPercent: { type: Number, enum: [10, 15, 20, 25], required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    usedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
    usedAt: { type: Date, default: null },
    expiresAt: { type: Date }, // optional — leave unset for no expiry
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

couponSchema.index({ libraryId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Coupon', couponSchema);