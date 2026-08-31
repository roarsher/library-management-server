// const asyncHandler = require('../utils/asyncHandler');
// const { LeaveRequest, SeatBooking, Seat, Student } = require('../models');
// const { notifyWaitingListForSeat } = require('../services/waitingListService');

// // @desc    Student submits a leave request against their active booking
// // @route   POST /api/leaves
// // @access  Private (student)
// const submitLeaveRequest = asyncHandler(async (req, res) => {
//   const { bookingId, fromDate, toDate, reason } = req.body;

//   const student = await Student.findOne({ userId: req.user._id });
//   const booking = await SeatBooking.findOne({
//     _id: bookingId,
//     studentId: student._id,
//     libraryId: req.libraryId,
//     status: 'active',
//   });

//   if (!booking) {
//     return res.status(400).json({ message: 'No active booking found for this student' });
//   }

//   const from = new Date(fromDate);
//   const to = new Date(toDate);
//   if (to < from) {
//     return res.status(400).json({ message: 'toDate must be after fromDate' });
//   }

//   const leave = await LeaveRequest.create({
//     libraryId: req.libraryId,
//     studentId: student._id,
//     bookingId: booking._id,
//     fromDate: from,
//     toDate: to,
//     reason,
//     status: 'pending',
//   });

//   res.status(201).json({ leave });
// });

// // @desc    List leave requests (admin: all; student: own)
// // @route   GET /api/leaves?status=pending
// // @access  Private
// const listLeaveRequests = asyncHandler(async (req, res) => {
//   const filter = { libraryId: req.libraryId };
//   if (req.query.status) filter.status = req.query.status;

//   if (req.user.role === 'student') {
//     const student = await Student.findOne({ userId: req.user._id });
//     filter.studentId = student._id;
//   }

//   const leaves = await LeaveRequest.find(filter)
//     .populate('bookingId')
//     .populate({ path: 'studentId', populate: { path: 'userId', select: 'name email phone' } })
//     .sort({ createdAt: -1 });

//   res.status(200).json({ count: leaves.length, leaves });
// });

// // @desc    Admin approves leave — seat freed for the leave window, membership extended
// // @route   PUT /api/leaves/:id/approve
// // @access  Private (admin)
// const approveLeaveRequest = asyncHandler(async (req, res) => {
//   const leave = await LeaveRequest.findOne({ _id: req.params.id, libraryId: req.libraryId });
//   if (!leave || leave.status !== 'pending') {
//     return res.status(400).json({ message: 'Leave request is not pending' });
//   }

//   const booking = await SeatBooking.findById(leave.bookingId);
//   if (!booking) {
//     return res.status(404).json({ message: 'Associated booking not found' });
//   }

//   // Proration: push the booking's endDate forward by the leave duration,
//   // so the student doesn't lose paid days while away.
//   const leaveDays = Math.ceil(
//     (leave.toDate - leave.fromDate) / (1000 * 60 * 60 * 24)
//   ) + 1;

//   booking.endDate = new Date(
//     booking.endDate.getTime() + leaveDays * 24 * 60 * 60 * 1000
//   );
//   booking.totalLeaveDaysCredited += leaveDays;
//   booking.status = 'on_leave';
//   await booking.save();

//   // Free the seat for the leave window — other students can book it temporarily.
//   await Seat.findByIdAndUpdate(booking.seatId, { status: 'available' });

//   leave.status = 'approved';
//   leave.reviewedBy = req.user._id;
//   leave.reviewedAt = new Date();
//   leave.seatReleased = true;
//   leave.creditedDays = leaveDays;
//   await leave.save();

//   await notifyWaitingListForSeat(booking.seatId, req.libraryId);

//   res.status(200).json({ message: 'Leave approved, seat released and membership extended', leave });
// });

// // @desc    Admin rejects a leave request
// // @route   PUT /api/leaves/:id/reject
// // @access  Private (admin)
// const rejectLeaveRequest = asyncHandler(async (req, res) => {
//   const leave = await LeaveRequest.findOne({ _id: req.params.id, libraryId: req.libraryId });
//   if (!leave || leave.status !== 'pending') {
//     return res.status(400).json({ message: 'Leave request is not pending' });
//   }

//   leave.status = 'rejected';
//   leave.reviewedBy = req.user._id;
//   leave.reviewedAt = new Date();
//   await leave.save();

//   res.status(200).json({ message: 'Leave rejected', leave });
// });

// // @desc    Called by a cron job when a leave's toDate has passed —
// //          reverts the seat back to booked for the original student.
// // @route   Internal (not exposed as HTTP route, invoked by jobs/leaveSeatReleaseJob.js)
// const revertSeatAfterLeave = async (leave) => {
//   const booking = await SeatBooking.findById(leave.bookingId);
//   if (!booking) return;

//   // Only revert if the seat wasn't picked up by another waiting-list student
//   const seat = await Seat.findById(booking.seatId);
//   if (seat && seat.status === 'available') {
//     seat.status = 'booked';
//     await seat.save();
//     booking.status = 'active';
//     await booking.save();
//   }
// };

// // @desc    Students currently on approved leave, with their leave period —
// //          for the admin "On Leave" view.
// // @route   GET /api/leaves/on-leave
// // @access  Private (admin)
// const listCurrentlyOnLeave = asyncHandler(async (req, res) => {
//   const today = new Date();
//   today.setHours(0, 0, 0, 0);

//   const leaves = await LeaveRequest.find({
//     libraryId: req.libraryId,
//     status: 'approved',
//     toDate: { $gte: today }, // leave period hasn't ended yet
//   })
//     .populate({ path: 'studentId', populate: { path: 'userId', select: 'name email phone' } })
//     .populate({ path: 'bookingId', populate: { path: 'seatId', select: 'seatNumber' } })
//     .sort({ fromDate: 1 });

//   res.status(200).json({ count: leaves.length, leaves });
// });

// module.exports = {
//   submitLeaveRequest,
//   listLeaveRequests,
//   approveLeaveRequest,
//   rejectLeaveRequest,
//   revertSeatAfterLeave,
//   listCurrentlyOnLeave,
// };
 



const asyncHandler = require('../utils/asyncHandler');

const { LeaveRequest, SeatBooking, Seat, Student } = require('../models');

const { notifyWaitingListForSeat } = require('../services/waitingListService');

// @desc    Student submits a leave request against their active booking
// @route   POST /api/leaves
// @access  Private (student)
const submitLeaveRequest = asyncHandler(async (req, res) => {
  const { bookingId, fromDate, toDate, reason } = req.body;

  const student = await Student.findOne({ userId: req.user._id });

  const booking = await SeatBooking.findOne({
    _id: bookingId,
    studentId: student._id,
    libraryId: req.libraryId,
    status: 'active',
  });

  if (!booking) {
    return res.status(400).json({
      message: 'No active booking found for this student',
    });
  }

  const from = new Date(fromDate);
  const to = new Date(toDate);

  if (to < from) {
    return res.status(400).json({
      message: 'toDate must be after fromDate',
    });
  }

  const leave = await LeaveRequest.create({
    libraryId: req.libraryId,
    studentId: student._id,
    bookingId: booking._id,
    fromDate: from,
    toDate: to,
    reason,
    status: 'pending',
  });

  res.status(201).json({ leave });
});

// @desc    List leave requests (admin: all; student: own)
// @route   GET /api/leaves?status=pending
// @access  Private
const listLeaveRequests = asyncHandler(async (req, res) => {
  const filter = {
    libraryId: req.libraryId,
  };

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.user.role === 'student') {
    const student = await Student.findOne({
      userId: req.user._id,
    });

    filter.studentId = student._id;
  }

  const leaves = await LeaveRequest.find(filter)
    .populate('bookingId')
    .populate({
      path: 'studentId',
      populate: {
        path: 'userId',
        select: 'name email phone',
      },
    })
    .sort({
      createdAt: -1,
    });

  res.status(200).json({
    count: leaves.length,
    leaves,
  });
});

// @desc    Admin approves leave — membership extended,
//          but seat remains reserved during leave
// @route   PUT /api/leaves/:id/approve
// @access  Private (admin)
const approveLeaveRequest = asyncHandler(async (req, res) => {
  const leave = await LeaveRequest.findOne({
    _id: req.params.id,
    libraryId: req.libraryId,
  });

  if (!leave || leave.status !== 'pending') {
    return res.status(400).json({
      message: 'Leave request is not pending',
    });
  }

  const booking = await SeatBooking.findById(leave.bookingId);

  if (!booking) {
    return res.status(404).json({
      message: 'Associated booking not found',
    });
  }

  // Proration: push the booking's endDate forward by the leave duration,
  // so the student doesn't lose paid days while away.
  const leaveDays =
    Math.ceil(
      (leave.toDate - leave.fromDate) /
        (1000 * 60 * 60 * 24)
    ) + 1;

  booking.endDate = new Date(
    booking.endDate.getTime() +
      leaveDays * 24 * 60 * 60 * 1000
  );

  booking.totalLeaveDaysCredited += leaveDays;

  // Keep the booking associated with the student,
  // but mark it as temporarily on leave.
  booking.status = 'on_leave';

  await booking.save();

  // IMPORTANT:
  // The seat remains reserved during the leave period.
  //
  // Do NOT change Seat.status to 'available'.
  // Do NOT notify the waiting list.
  //
  // isSeatAvailable() should treat both 'active' and 'on_leave'
  // bookings as occupying/reserving the seat.

  leave.status = 'approved';
  leave.reviewedBy = req.user._id;
  leave.reviewedAt = new Date();
  leave.creditedDays = leaveDays;

  await leave.save();

  res.status(200).json({
    message:
      'Leave approved — membership extended, seat remains reserved',
    leave,
  });
});

// @desc    Admin rejects a leave request
// @route   PUT /api/leaves/:id/reject
// @access  Private (admin)
const rejectLeaveRequest = asyncHandler(async (req, res) => {
  const leave = await LeaveRequest.findOne({
    _id: req.params.id,
    libraryId: req.libraryId,
  });

  if (!leave || leave.status !== 'pending') {
    return res.status(400).json({
      message: 'Leave request is not pending',
    });
  }

  leave.status = 'rejected';
  leave.reviewedBy = req.user._id;
  leave.reviewedAt = new Date();

  await leave.save();

  res.status(200).json({
    message: 'Leave rejected',
    leave,
  });
});

// @desc    Called by a cron job when a leave's toDate has passed —
//          reverts the booking back to active for the original student.
// @route   Internal (not exposed as HTTP route, invoked by jobs/leaveSeatReleaseJob.js)
const revertSeatAfterLeave = async (leave) => {
  const booking = await SeatBooking.findById(leave.bookingId);

  if (!booking) return;

  // Seat remains reserved throughout the leave period.
  // Once the leave ends, simply restore the booking to active.
  booking.status = 'active';
  await booking.save();
};

// @desc    Students currently on approved leave, with their leave period —
//          for the admin "On Leave" view.
// @route   GET /api/leaves/on-leave
// @access  Private (admin)
const listCurrentlyOnLeave = asyncHandler(async (req, res) => {
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const leaves = await LeaveRequest.find({
    libraryId: req.libraryId,
    status: 'approved',
    toDate: {
      $gte: today,
    },
  })
    .populate({
      path: 'studentId',
      populate: {
        path: 'userId',
        select: 'name email phone',
      },
    })
    .populate({
      path: 'bookingId',
      populate: {
        path: 'seatId',
        select: 'seatNumber',
      },
    })
    .sort({
      fromDate: 1,
    });

  res.status(200).json({
    count: leaves.length,
    leaves,
  });
});

module.exports = {
  submitLeaveRequest,
  listLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
  revertSeatAfterLeave,
  listCurrentlyOnLeave,
};