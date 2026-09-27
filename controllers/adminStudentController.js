 const asyncHandler = require('../utils/asyncHandler');
const {
  User,
  Student,
  Seat,
  Library,
  AddOn,
  SeatBooking,
  Payment,
  TimeSlot,
} = require('../models');
const { generateInvoiceForPayment } = require('../services/invoiceService');
const { isSeatAvailable } = require('../utils/seatAvailability');
const { calculateBookingPrice } = require('../utils/pricingUtils');
const generateRegistrationNumber = require('../utils/generateRegistrationNumber');

// @desc    Admin adds a student — creates login, profile, and always a
//          booking tied to a real shift. Seat is optional; shift is not.
// @route   POST /api/students/admin-create
// @access  Private (admin)
const adminCreateStudent = asyncHandler(async (req, res) => {
  const {
    name, email, phone, password,
    dob, gender, bloodGroup, aadhaarNumber, address,
    qualification, preparingFor, photoUrl, idProofUrl,
    fatherName, motherName, parentPhone,

    seatId, // optional
    timeSlotId, // required
    durationMonths,
    startDate,

    addOnIds,
    addOnQuantities,

    paymentMethod,
    amountPaid,
  } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: 'A user with this email already exists' });
  }

  if (!timeSlotId) {
    return res.status(400).json({ message: 'A shift must be selected, with or without a seat' });
  }

  const wantsSeat = Boolean(seatId);
  let seat = null;

  const start = new Date(startDate || Date.now());
  const end = new Date(start);
  end.setMonth(end.getMonth() + Number(durationMonths));

  if (wantsSeat) {
    seat = await Seat.findOne({ _id: seatId, libraryId: req.libraryId });
    if (!seat || !seat.isActive) {
      return res.status(400).json({ message: 'Seat not found or disabled' });
    }

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
  }

  const library = await Library.findById(req.libraryId);
  if (!library) {
    return res.status(404).json({ message: 'Library not found' });
  }

  const timeSlot = await TimeSlot.findOne({ _id: timeSlotId, libraryId: req.libraryId, isActive: true });
  if (!timeSlot) {
    return res.status(400).json({ message: 'Selected time slot is not available' });
  }

  const user = await User.create({
    name,
    email,
    phone,
    password,
    role: 'student',
    libraryId: req.libraryId,
    isEmailVerified: true,
  });

  const registrationNumber = await generateRegistrationNumber(req.libraryId);

  const student = await Student.create({
    userId: user._id,
    libraryId: req.libraryId,
    dob,
    gender,
    bloodGroup,
    aadhaarNumber,
    address,
    qualification,
    preparingFor,
    photoUrl,
    idProofUrl,
    parentDetails: { fatherName, motherName, parentPhone },
    admissionStatus: 'verified',
    verifiedBy: req.user._id,
    verifiedAt: new Date(),
    registrationNumber,
  });

  const addOns = addOnIds?.length
    ? await AddOn.find({ _id: { $in: addOnIds }, libraryId: req.libraryId, isActive: true })
    : [];

  const addOnsSnapshot = addOns.map((a) => {
    const quantity = Number(addOnQuantities?.[a._id.toString()] || 1);
    return {
      addOnId: a._id,
      priceAtBooking: a.pricePerMonth,
      quantity: quantity > 0 ? quantity : 1,
    };
  });

  const addOnsTotal = addOnsSnapshot.reduce((sum, a) => sum + a.priceAtBooking * a.quantity, 0);
  const seatPriceAtBooking = calculateBookingPrice(timeSlot.monthlyPrice, durationMonths, library);
  const totalMonthlyAmount = seatPriceAtBooking + addOnsTotal;

  const booking = await SeatBooking.create({
    libraryId: req.libraryId,
    studentId: student._id,
    seatId: wantsSeat ? seatId : undefined,
    timeSlotId,
    durationMonths,
    startDate: start,
    endDate: end,
    addOns: addOnsSnapshot,
    seatPriceAtBooking,
    totalMonthlyAmount,
    status: 'active',
    approvedBy: req.user._id,
    approvedAt: new Date(),
  });

  const paidAmount = amountPaid != null ? Number(amountPaid) : totalMonthlyAmount;
  const dueAmount = Math.max(totalMonthlyAmount - paidAmount, 0);

  const payment = await Payment.create({
    libraryId: req.libraryId,
    studentId: student._id,
    bookingId: booking._id,
    amount: paidAmount,
    dueAmount,
    isFullyCleared: dueAmount === 0,
    method: paymentMethod || 'cash',
    status: 'verified',
    verifiedBy: req.user._id,
    verifiedAt: new Date(),
  });

  await generateInvoiceForPayment(payment);

  const populated = await SeatBooking.findById(booking._id)
    .populate('seatId', 'seatNumber hallId')
    .populate('timeSlotId', 'label monthlyPrice');

  return res.status(201).json({
    message: wantsSeat ? 'Student added successfully' : 'Student added — shift assigned, no fixed seat yet',
    user: { id: user._id, name: user.name, email: user.email },
    student,
    booking: populated,
    payment,
    receiptUrl: payment.invoiceUrl,
  });
});

module.exports = { adminCreateStudent };