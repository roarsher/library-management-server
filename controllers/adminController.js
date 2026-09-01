 const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const { Seat, SeatBooking, Payment, LeaveRequest, Attendance, Student } = require('../models');

 const getDashboardSummary = asyncHandler(async (req, res) => {
  const libraryId = req.libraryId;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    totalSeats,
    occupiedSeatIds,
    todayAttendanceCount,
    pendingBookingRequests,
    pendingLeaveRequests,
    studentsOnLeave,
    expiringMemberships,
    monthRevenueAgg,
    allStudentsWithDob,
  ] = await Promise.all([
    Seat.countDocuments({ libraryId, isActive: true }),
    SeatBooking.distinct('seatId', {
      libraryId,
      status: { $in: ['pending_approval', 'active', 'on_leave'] },
    }),
    Attendance.countDocuments({ libraryId, checkInAt: { $gte: startOfDay } }),
    SeatBooking.countDocuments({ libraryId, status: 'pending_approval' }),
    LeaveRequest.countDocuments({ libraryId, status: 'pending' }),
    SeatBooking.countDocuments({ libraryId, status: 'on_leave' }),
    SeatBooking.countDocuments({
      libraryId,
      status: 'active',
      endDate: { $gte: new Date(), $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    }),
    Payment.aggregate([
      {
        $match: {
          libraryId: new mongoose.Types.ObjectId(libraryId),
          status: 'verified',
          createdAt: { $gte: new Date(new Date().setDate(1)) },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Student.find({ libraryId, dob: { $exists: true } }).select('dob'),
  ]);

  const bookedSeats = occupiedSeatIds.length;

  // Birthdays this week — compares month/day only, ignoring birth year,
  // and wraps correctly across a year boundary (e.g. Dec 29 → Jan 4).
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const toDayOfYear = (d) => {
    const start = new Date(d.getFullYear(), 0, 0);
    return Math.floor((d - start) / (1000 * 60 * 60 * 24));
  };
  const todayDoY = toDayOfYear(today);
  const birthdaysThisWeek = allStudentsWithDob.filter((s) => {
    const dob = new Date(s.dob);
    const thisYearBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
    const bdayDoY = toDayOfYear(thisYearBirthday);
    let diff = bdayDoY - todayDoY;
    if (diff < 0) diff += 365; // wrapped past year-end
    return diff >= 0 && diff <= 7;
  }).length;

  res.status(200).json({
    totalSeats,
    bookedSeats,
    emptySeats: totalSeats - bookedSeats,
    todayAttendanceCount,
    pendingBookingRequests,
    pendingLeaveRequests,
    studentsOnLeave,
    expiringMemberships,
    monthToDateRevenue: monthRevenueAgg[0]?.total || 0,
    birthdaysThisWeek,
  });
});

module.exports = { getDashboardSummary };
