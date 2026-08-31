const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema(
  {
    libraryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Library',
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SeatBooking',
      required: true,
    },
    fromDate: {
      type: Date,
      required: true,
    },
    toDate: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    seatReleased: {
      type: Boolean,
      default: false, // true once seat is made temporarily bookable by others
    },
    creditedDays: {
      type: Number,
      default: 0, // days added to the booking's endDate on approval
    },
  },
  { timestamps: true }
);

leaveRequestSchema.index({ libraryId: 1, status: 1 });
leaveRequestSchema.index({ studentId: 1 });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
