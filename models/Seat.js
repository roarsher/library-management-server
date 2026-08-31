const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema(
  {
    libraryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Library',
      required: true,
    },
    hallId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hall',
      required: true,
    },
    seatNumber: {
      type: String,
      required: true, // fully admin-defined, e.g. "1", "42", "H1-15" — no fixed format
    },
    status: {
      type: String,
      enum: ['available', 'booked', 'pending_approval', 'on_leave_hold', 'disabled'],
      default: 'available',
    },
    isActive: {
      type: Boolean,
      default: true, // false if seat is physically out of service
    },
  },
  { timestamps: true }
);

// seatNumber only needs to be unique within a hall, not across the whole library —
// two halls can each have a seat "1".
seatSchema.index({ hallId: 1, seatNumber: 1 }, { unique: true });
seatSchema.index({ libraryId: 1, status: 1 });
seatSchema.index({ libraryId: 1, hallId: 1 });

module.exports = mongoose.model('Seat', seatSchema);
