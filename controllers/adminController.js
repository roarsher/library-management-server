 
const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");

const {
  Seat,
  SeatBooking,
  Payment,
  LeaveRequest,
  Attendance,
  Student,
} = require("../models");

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
    paymentsDueCount,
  ] = await Promise.all([
    // Total active seats
    Seat.countDocuments({
      libraryId,
      isActive: true,
    }),

    // Occupied seats
    SeatBooking.distinct("seatId", {
      libraryId,
      status: {
        $in: ["pending_approval", "active", "on_leave"],
      },
    }),

    // Today's attendance
    Attendance.countDocuments({
      libraryId,
      checkInAt: {
        $gte: startOfDay,
      },
    }),

    // Pending booking requests
    SeatBooking.countDocuments({
      libraryId,
      status: "pending_approval",
    }),

    // Pending leave requests
    LeaveRequest.countDocuments({
      libraryId,
      status: "pending",
    }),

    // Students currently on leave
    SeatBooking.countDocuments({
      libraryId,
      status: "on_leave",
    }),

    // Memberships expiring within the next 7 days
    SeatBooking.countDocuments({
      libraryId,
      status: "active",
      endDate: {
        $gte: new Date(),
        $lte: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ),
      },
    }),

    // Current month's verified revenue
    Payment.aggregate([
      {
        $match: {
          libraryId: new mongoose.Types.ObjectId(libraryId),
          status: "verified",
          createdAt: {
            $gte: new Date(new Date().setDate(1)),
          },
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: "$amount",
          },
        },
      },
    ]),

    // Students having a date of birth
    Student.find({
      libraryId,
      dob: {
        $exists: true,
      },
    }).select("dob"),

    // Payments that require attention
    Payment.countDocuments({
      libraryId,
      status: {
        $in: ["pending", "failed"],
      },
    }),
  ]);

  const bookedSeats = occupiedSeatIds.length;

  // --------------------------------------------------
  // Birthdays this week
  // --------------------------------------------------

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const toDayOfYear = (d) => {
    const start = new Date(d.getFullYear(), 0, 0);

    return Math.floor(
      (d - start) / (1000 * 60 * 60 * 24)
    );
  };

  const todayDoY = toDayOfYear(today);

  const birthdaysThisWeek = allStudentsWithDob.filter((s) => {
    const dob = new Date(s.dob);

    const thisYearBirthday = new Date(
      today.getFullYear(),
      dob.getMonth(),
      dob.getDate()
    );

    let diff =
      toDayOfYear(thisYearBirthday) - todayDoY;

    // Handle New Year boundary
    if (diff < 0) {
      diff += 365;
    }

    return diff >= 0 && diff <= 7;
  }).length;

  // --------------------------------------------------
  // Dashboard response
  // --------------------------------------------------

  res.status(200).json({
    totalSeats,
    bookedSeats,
    emptySeats: totalSeats - bookedSeats,

    todayAttendanceCount,

    pendingBookingRequests,
    pendingLeaveRequests,

    studentsOnLeave,

    expiringMemberships,

    monthToDateRevenue:
      monthRevenueAgg[0]?.total || 0,

    birthdaysThisWeek,

    // Pending + failed payments
    paymentsDueCount,
  });
});

module.exports = {
  getDashboardSummary,
};
 
