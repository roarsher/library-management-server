const cron = require('node-cron');
const { SeatBooking, Seat, Library, Attendance, NoShowLog } = require('../models');
const { notifyWaitingListForSeat } = require('../services/waitingListService');

// Runs every 5 minutes: for each active booking whose slot has started,
// checks whether the student has an Attendance check-in yet. If the grace
// period (per-library setting) has elapsed with no check-in, flags a
// no-show and frees the seat for the waiting list.
const runNoShowCheck = async () => {
  const libraries = await Library.find({ isActive: true });

  for (const library of libraries) {
    const graceMinutes = library.settings?.graceMinutesForNoShow ?? 15;

    const activeBookings = await SeatBooking.find({
      libraryId: library._id,
      status: 'active',
    }).populate('timeSlotId');

    for (const booking of activeBookings) {
      if (!booking.timeSlotId) continue;

      const [startHour, startMin] = booking.timeSlotId.startTime.split(':').map(Number);
      const slotStart = new Date();
      slotStart.setHours(startHour, startMin, 0, 0);

      const graceDeadline = new Date(slotStart.getTime() + graceMinutes * 60 * 1000);
      if (new Date() < graceDeadline) continue; // grace period not over yet

      const hasCheckedIn = await Attendance.findOne({
        bookingId: booking._id,
        checkInAt: { $gte: slotStart },
      });
      if (hasCheckedIn) continue;

      const alreadyFlaggedToday = await NoShowLog.findOne({
        bookingId: booking._id,
        scheduledSlotStart: slotStart,
      });
      if (alreadyFlaggedToday) continue;

      await NoShowLog.create({
        libraryId: library._id,
        bookingId: booking._id,
        studentId: booking.studentId,
        seatId: booking.seatId,
        scheduledSlotStart: slotStart,
        graceMinutesUsed: graceMinutes,
        seatReleased: true,
      });

      await Seat.findByIdAndUpdate(booking.seatId, { status: 'available' });
      booking.status = 'no_show_flagged';
      await booking.save();

      await notifyWaitingListForSeat(booking.seatId, library._id);
    }
  }
};

const scheduleNoShowCheckJob = () => {
  cron.schedule('*/5 * * * *', () => {
    runNoShowCheck().catch((err) => console.error('No-show job failed:', err.message));
  });
};

module.exports = { scheduleNoShowCheckJob, runNoShowCheck };
