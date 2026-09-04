 

const asyncHandler = require('../utils/asyncHandler');
const { Seat, Library, AddOn, SeatBooking, Student, TimeSlot, WaitingList } = require('../models');
const seatLockService = require('../services/seatLockService');
const { notifyWaitingListForSeat } = require('../services/waitingListService');
const { isSeatAvailable } = require('../utils/seatAvailability');
const { calculateBookingPrice } = require('../utils/pricingUtils');
 
// add at top of file
// @desc    Temporarily hold a seat while student completes booking flow
// @route   POST /api/bookings/lock-seat
// @access  Private (student)
const lockSeat = asyncHandler(async (req, res) => {
  const { seatId } = req.body;
  const student = await Student.findOne({ userId: req.user._id });

  const seat = await Seat.findOne({ _id: seatId, libraryId: req.libraryId });
  if (!seat || seat.status !== 'available') {
    return res.status(400).json({ message: 'Seat is not available' });
  }

  const result = seatLockService.acquireLock(seatId, student._id.toString());
  if (!result.success) {
    return res.status(409).json({ message: result.message });
  }

  res.status(200).json({ message: 'Seat held for 5 minutes', expiresAt: result.expiresAt });
});

// @desc    Release a held seat (student backs out of booking flow)
// @route   POST /api/bookings/release-seat
// @access  Private (student)
const releaseSeat = asyncHandler(async (req, res) => {
  const { seatId } = req.body;
  const student = await Student.findOne({ userId: req.user._id });
  seatLockService.releaseLock(seatId, student._id.toString());
  res.status(200).json({ message: 'Seat released' });
});

// @desc    Create a booking (seat + time slot + add-ons) — goes to pending_approval
// @route   POST /api/bookings
// @access  Private (student)
  const createBooking = asyncHandler(async (req, res) => {
  const { seatId, timeSlotId, durationMonths, startDate, addOnIds } = req.body;

  const student = await Student.findOne({ userId: req.user._id });
  if (!student || student.admissionStatus !== 'verified') {
    return res.status(403).json({ message: 'Admission must be verified before booking' });
  }

  const seat = await Seat.findOne({ _id: seatId, libraryId: req.libraryId });
  if (!seat || !seat.isActive) {
    return res.status(400).json({ message: 'Seat not found or disabled' });
  }
  const start = new Date(startDate);
  const end = new Date(start);
  end.setMonth(end.getMonth() + Number(durationMonths));

  const availability = await isSeatAvailable({
    seatId,
    timeSlotId,
    startDate: start,
    endDate: end,
    libraryId: req.libraryId,
  });
  if (!availability.available) {
    return res.status(400).json({ message: availability.reason });
  }
const library = await Library.findById(req.libraryId);
  const timeSlot = await TimeSlot.findOne({ _id: timeSlotId, libraryId: req.libraryId, isActive: true });
  if (!timeSlot) {
    return res.status(400).json({ message: 'Selected time slot is not available' });
  }

  const addOns = addOnIds?.length
    ? await AddOn.find({ _id: { $in: addOnIds }, libraryId: req.libraryId, isActive: true })
    : [];

  const seatPriceAtBooking = calculateBookingPrice(timeSlot.monthlyPrice, durationMonths, library);
  const addOnsSnapshot = addOns.map((a) => ({ addOnId: a._id, priceAtBooking: a.pricePerMonth }));
  const totalMonthlyAmount = seatPriceAtBooking + addOnsSnapshot.reduce((sum, a) => sum + a.priceAtBooking, 0);

  const booking = await SeatBooking.create({
    libraryId: req.libraryId,
    studentId: student._id,
    seatId,
    timeSlotId,
    durationMonths,
    startDate: start,
    endDate: end,
    addOns: addOnsSnapshot,
    seatPriceAtBooking,
    totalMonthlyAmount,
    status: 'pending_approval',
  });

  seatLockService.releaseLock(seatId, student._id.toString());
 res.status(201).json({ booking });
});

// @desc    List bookings (admin sees all pending/active; student sees own)
// @route   GET /api/bookings?status=pending_approval
// @access  Private
 
// @desc    List bookings (admin sees all pending/active; student sees own)
// @route   GET /api/bookings?status=pending_approval&gender=male
// @access  Private
 const listBookings = asyncHandler(async (req, res) => {
  const filter = { libraryId: req.libraryId };

  if (req.query.expiringWithinDays) {
    const days = Number(req.query.expiringWithinDays);
    filter.status = 'active';
    filter.endDate = {
      $gte: new Date(),
      $lte: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
    };
  } else if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.user.role === 'student') {
    const student = await Student.findOne({ userId: req.user._id });
    filter.studentId = student._id;
  } else if (req.query.gender) {
    const matchingStudents = await Student.find({
      libraryId: req.libraryId,
      gender: req.query.gender,
    }).select('_id');
    filter.studentId = { $in: matchingStudents.map((s) => s._id) };
  }

  const bookings = await SeatBooking.find(filter)
    .populate({ path: 'seatId', select: 'seatNumber hallId', populate: { path: 'hallId', select: 'name hallNumber' } })
    .populate('timeSlotId', 'label startTime endTime')
    .populate({ path: 'studentId', populate: { path: 'userId', select: 'name email phone' } })
    .sort({ createdAt: -1 });

  res.status(200).json({ count: bookings.length, bookings });
});
// @desc    Admin approves a pending booking
// @route   PUT /api/bookings/:id/approve
// @access  Private (admin)



// const approveBooking = asyncHandler(async (req, res) => {
//   const booking = await SeatBooking.findOne({ _id: req.params.id, libraryId: req.libraryId });
//   if (!booking || booking.status !== 'pending_approval') {
//     return res.status(400).json({ message: 'Booking is not pending approval' });
//   }

//   booking.status = 'active';
//   booking.approvedBy = req.user._id;
//   booking.approvedAt = new Date();
//   await booking.save();

//   await Seat.findByIdAndUpdate(booking.seatId, { status: 'booked' });

//   res.status(200).json({ message: 'Booking approved', booking });
// });

// @desc    Admin rejects a pending booking — seat goes back to available
// @route   PUT /api/bookings/:id/reject
// @access  Private (admin)


const approveBooking = asyncHandler(async (req, res) => {
  const booking = await SeatBooking.findOne({ _id: req.params.id, libraryId: req.libraryId });
  if (!booking || booking.status !== 'pending_approval') {
    return res.status(400).json({ message: 'Booking is not pending approval' });
  }

  booking.status = 'active';
  booking.approvedBy = req.user._id;
  booking.approvedAt = new Date();
  await booking.save();

  res.status(200).json({ message: 'Booking approved', booking });
});




// const rejectBooking = asyncHandler(async (req, res) => {
//   const { rejectionReason } = req.body;

//   const booking = await SeatBooking.findOne({ _id: req.params.id, libraryId: req.libraryId });
//   if (!booking || booking.status !== 'pending_approval') {
//     return res.status(400).json({ message: 'Booking is not pending approval' });
//   }

//   booking.status = 'cancelled';
//   booking.rejectionReason = rejectionReason;
//   await booking.save();

//   await Seat.findByIdAndUpdate(booking.seatId, { status: 'available' });

//   // seat just freed up — check if anyone's on the waiting list for it
//   await notifyWaitingListForSeat(booking.seatId, req.libraryId);

//   res.status(200).json({ message: 'Booking rejected', booking });
// });

// module.exports = {
//   lockSeat,
//   releaseSeat,
//   createBooking,
//   listBookings,
//   approveBooking,
//   rejectBooking,
// };


const rejectBooking = asyncHandler(async (req, res) => {
  const { rejectionReason } = req.body;

  const booking = await SeatBooking.findOne({ _id: req.params.id, libraryId: req.libraryId });
  if (!booking || booking.status !== 'pending_approval') {
    return res.status(400).json({ message: 'Booking is not pending approval' });
  }

  booking.status = 'cancelled';
  booking.rejectionReason = rejectionReason;
  await booking.save();

  await notifyWaitingListForSeat(booking.seatId, req.libraryId);

  res.status(200).json({ message: 'Booking rejected', booking });
});
 
// @desc    Admin edits an existing booking — change seat (or remove it),
//          change shift, or both. Re-validates availability and re-prices
//          if the shift changes.
// @route   PUT /api/bookings/:id/admin-edit
// @access  Private (admin)
const adminEditBooking = asyncHandler(async (req, res) => {
  const { seatId, timeSlotId } = req.body; // seatId: string | null (null/omitted = no fixed seat)

  const booking = await SeatBooking.findOne({ _id: req.params.id, libraryId: req.libraryId });
  if (!booking) {
    return res.status(404).json({ message: 'Booking not found' });
  }

  const wantsSeat = Boolean(seatId);
  const newTimeSlotId = timeSlotId || booking.timeSlotId;

  if (wantsSeat) {
    const seat = await Seat.findOne({ _id: seatId, libraryId: req.libraryId });
    if (!seat || !seat.isActive) {
      return res.status(400).json({ message: 'Seat not found or disabled' });
    }

    const availability = await isSeatAvailable({
      seatId,
      timeSlotId: newTimeSlotId,
      startDate: booking.startDate,
      endDate: booking.endDate,
      libraryId: req.libraryId,
      excludeBookingId: booking._id, // don't conflict with the booking's own current record
    });
    if (!availability.available) {
      return res.status(400).json({ message: availability.reason });
    }
  }

  // Re-price if the shift actually changed (seat itself doesn't affect price)
  if (timeSlotId && String(timeSlotId) !== String(booking.timeSlotId)) {
    const newTimeSlot = await TimeSlot.findOne({ _id: timeSlotId, libraryId: req.libraryId, isActive: true });
    if (!newTimeSlot) {
      return res.status(400).json({ message: 'Selected time slot is not available' });
    }
    const library = await Library.findById(req.libraryId);
    const newPrice = calculateBookingPrice(newTimeSlot.monthlyPrice, booking.durationMonths, library);

    const addOnsTotal = booking.addOns.reduce((sum, a) => sum + a.priceAtBooking, 0);
    booking.seatPriceAtBooking = newPrice;
    booking.totalMonthlyAmount = newPrice + addOnsTotal;
    booking.timeSlotId = timeSlotId;
  }

  booking.seatId = wantsSeat ? seatId : undefined;
  await booking.save();

  const populated = await SeatBooking.findById(booking._id)
    .populate('seatId', 'seatNumber hallId')
    .populate('timeSlotId', 'label monthlyPrice')
    .populate({ path: 'studentId', populate: { path: 'userId', select: 'name email phone' } });

  res.status(200).json({ message: 'Booking updated', booking: populated });
});

module.exports = {
  lockSeat,
  releaseSeat,
  createBooking,
  listBookings,
  approveBooking,
  rejectBooking,
  adminEditBooking, // add
};