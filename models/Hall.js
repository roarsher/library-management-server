const mongoose = require('mongoose');

const hallSchema = new mongoose.Schema(
  {
    libraryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Library',
      required: true,
    },
    name: {
      type: String,
      required: true, // e.g. "Hall 1", "Ground Floor Hall", "Silent Zone Hall"
      trim: true,
    },
    hallNumber: {
      type: Number,
      required: true, // e.g. 1, 2 — admin sets this, not hardcoded
    },
    totalSeats: {
      type: Number,
      default: 0, // kept in sync as seats are added/removed under this hall
    },
    description: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

hallSchema.index({ libraryId: 1, hallNumber: 1 }, { unique: true });

module.exports = mongoose.model('Hall', hallSchema);
