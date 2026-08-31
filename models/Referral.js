const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema(
  {
    libraryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Library',
      required: true,
    },
    referrerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    refereeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    referralCode: {
      type: String,
      required: true,
    },
    rewardType: {
      type: String,
      enum: ['discount_percent', 'discount_flat', 'free_addon'],
      default: 'discount_flat',
    },
    rewardValue: {
      type: Number, // percent or flat amount depending on rewardType
      default: 0,
    },
    rewardAppliedToReferrer: {
      type: Boolean,
      default: false,
    },
    rewardAppliedToReferee: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'expired'],
      default: 'pending', // completed once referee's first payment is verified
    },
  },
  { timestamps: true }
);

referralSchema.index({ libraryId: 1 });
referralSchema.index({ referrerId: 1 });

module.exports = mongoose.model('Referral', referralSchema);
