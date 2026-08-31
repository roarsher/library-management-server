const mongoose = require('mongoose');

const noShowLogSchema = new mongoose.Schema(
  {
    libraryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Library',
      required: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SeatBooking',
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    seatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seat',
      required: true,
    },
    scheduledSlotStart: {
      type: Date,
      required: true,
    },
    flaggedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    graceMinutesUsed: {
      type: Number,
      required: true,
    },
    seatReleased: {
      type: Boolean,
      default: false,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // admin who manually resolved/reversed the flag, if any
    },
  },
  { timestamps: true }
);

noShowLogSchema.index({ libraryId: 1, flaggedAt: -1 });
noShowLogSchema.index({ bookingId: 1 });

module.exports = mongoose.model('NoShowLog', noShowLogSchema);
