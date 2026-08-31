const mongoose = require('mongoose');

const seatBookingSchema = new mongoose.Schema(
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
      required: true,
    },
    durationMonths: {
      type: Number,
      enum: [1, 2, 3],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true, // shifted forward automatically on approved leave (proration)
    },
    addOns: [
      {
        addOnId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'AddOn',
        },
        priceAtBooking: Number, // snapshot price in case AddOn price changes later
      },
    ],
    seatPriceAtBooking: {
      type: Number,
      required: true, // snapshot of Library.settings.seatMonthlyPrice at time of booking
    },
    totalMonthlyAmount: {
      type: Number,
      required: true, // seatPriceAtBooking + sum(addOns.priceAtBooking)
    },
    status: {
      type: String,
      enum: [
        'pending_approval', // student booked, admin hasn't confirmed
        'active', // approved and currently occupying the seat
        'on_leave', // approved leave in effect, seat temporarily free
        'no_show_flagged', // missed check-in past grace period
        'completed', // duration ended
        'cancelled', // rejected or cancelled before/at approval
      ],
      default: 'pending_approval',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
    },
    totalLeaveDaysCredited: {
      type: Number,
      default: 0, // running total of days endDate has been pushed forward
    },
  },
  { timestamps: true }
);

seatBookingSchema.index({ libraryId: 1, status: 1 });
seatBookingSchema.index({ seatId: 1, status: 1 });
seatBookingSchema.index({ studentId: 1 });

module.exports = mongoose.model('SeatBooking', seatBookingSchema);
