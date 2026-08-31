const mongoose = require('mongoose');

const addOnSchema = new mongoose.Schema(
  {
    libraryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Library',
      required: true,
    },
    name: {
      type: String,
      required: true, // e.g. "Night Shift", "Locker Facility"
    },
    description: {
      type: String,
    },
    pricePerMonth: {
      type: Number,
      required: true,
    },
    icon: {
      type: String, // icon key/name for UI, e.g. "moon", "lock", "zap"
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

addOnSchema.index({ libraryId: 1 });

module.exports = mongoose.model('AddOn', addOnSchema);
