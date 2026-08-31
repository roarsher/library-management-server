 const mongoose = require('mongoose');

const segmentSchema = new mongoose.Schema(
  { startTime: { type: String, required: true }, endTime: { type: String, required: true } },
  { _id: false }
);

const timeSlotSchema = new mongoose.Schema(
  {
    libraryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Library', required: true },
    label: { type: String, required: true },

    // Most slots have one continuous window. The split slot
    // (6-11AM + 5-9:45PM) has two — segments handles both uniformly.
    segments: {
      type: [segmentSchema],
      required: true,
      validate: (v) => v.length >= 1,
    },

    isOvernight: { type: Boolean, default: false },

    monthlyPrice: {
      type: Number,
      required: true, // the 1-month price for this shift — durations are derived from this, not stored separately
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

timeSlotSchema.index({ libraryId: 1 });

module.exports = mongoose.model('TimeSlot', timeSlotSchema);