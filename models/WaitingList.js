const mongoose = require('mongoose');

const waitingListSchema = new mongoose.Schema(
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
    seatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seat',
      required: true,
    },
    timeSlotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TimeSlot',
    },
    status: {
      type: String,
      enum: ['waiting', 'notified', 'converted', 'expired'],
      default: 'waiting',
    },
    notifiedAt: {
      type: Date,
    },
    notifiedVia: [
      {
        type: String,
        enum: ['sms', 'whatsapp', 'email'],
      },
    ],
    expiresAt: {
      type: Date, // notification offer expires if student doesn't act in time
    },
  },
  { timestamps: true }
);

waitingListSchema.index({ libraryId: 1, seatId: 1, status: 1 });
waitingListSchema.index({ studentId: 1 });

module.exports = mongoose.model('WaitingList', waitingListSchema);
