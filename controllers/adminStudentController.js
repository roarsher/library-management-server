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
const { calculateBookingPrice } = require('../utils/pricingUtils');
const { isSeatAvailable } = require('../utils/seatAvailability');

// @desc    Admin adds a student directly — creates login, profile, seat booking
//          (instantly active), and records the first payment with a receipt
// @route   POST /api/students/admin-create
// @access  Private (admin)

const adminCreateStudent = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    phone,
    password,
    dob,
    gender,
    bloodGroup,
    aadhaarNumber,
    parentDetails,
    address,
    qualification,
    preparingFor,
    photoUrl,
    idProofUrl,
    seatId,
    timeSlotId,
    durationMonths,
    startDate,
    addOnIds,
    paymentMethod,
    amountPaid,
  } = req.body;

  // Check existing user
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    return res.status(400).json({
      message: 'A user with this email already exists',
    });
  }

  // Find seat
  const seat = await Seat.findOne({
    _id: seatId,
    libraryId: req.libraryId,
  });

  if (!seat || !seat.isActive) {
    return res.status(400).json({
      message: 'Seat not found or disabled',
    });
  }

  // Find library
  const library = await Library.findById(req.libraryId);

  if (!library) {
    return res.status(404).json({
      message: 'Library not found',
    });
  }

  // Calculate booking dates
  const start = new Date(startDate || Date.now());

  const end = new Date(start);
  end.setMonth(end.getMonth() + Number(durationMonths));

  // Check whether seat is available for this time slot and date range
  const availability = await isSeatAvailable({
    seatId,
    timeSlotId,
    startDate: start,
    endDate: end,
    libraryId: req.libraryId,
  });

  if (!availability.available) {
    return res.status(400).json({
      message: availability.reason,
    });
  }

  // Find time slot
  const timeSlot = await TimeSlot.findOne({
    _id: timeSlotId,
    libraryId: req.libraryId,
    isActive: true,
  });

  if (!timeSlot) {
    return res.status(400).json({
      message: 'Selected time slot is not available',
    });
  }

  // Find selected add-ons
  const addOns = addOnIds?.length
    ? await AddOn.find({
        _id: { $in: addOnIds },
        libraryId: req.libraryId,
        isActive: true,
      })
    : [];

  // Calculate booking price
  const seatPriceAtBooking = calculateBookingPrice(
    timeSlot.monthlyPrice,
    durationMonths,
    library
  );

  const addOnsSnapshot = addOns.map((a) => ({
    addOnId: a._id,
    priceAtBooking: a.pricePerMonth,
  }));

  const totalMonthlyAmount =
    seatPriceAtBooking +
    addOnsSnapshot.reduce(
      (sum, a) => sum + a.priceAtBooking,
      0
    );

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    phone,
    role: 'student',
    libraryId: req.libraryId,
    isEmailVerified: true,
  });

  // Create student profile
  const student = await Student.create({
    userId: user._id,
    libraryId: req.libraryId,
    dob,
    gender,
    bloodGroup,
    aadhaarNumber,
    parentDetails,
    address,
    qualification,
    preparingFor,
    photoUrl,
    idProofUrl,
    admissionStatus: 'verified',
    verifiedBy: req.user._id,
    verifiedAt: new Date(),
  });

  // Create seat booking
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
    status: 'active',
    approvedBy: req.user._id,
    approvedAt: new Date(),
  });

  // IMPORTANT:
  // Do NOT update seat.status = 'booked'.
  // Seat availability is now determined by isSeatAvailable()
  // based on overlapping bookings/time slots.

  // Create payment
  const payment = await Payment.create({
    libraryId: req.libraryId,
    studentId: student._id,
    bookingId: booking._id,
    amount: amountPaid ?? totalMonthlyAmount,
    method: paymentMethod || 'cash',
    status: 'verified',
    verifiedBy: req.user._id,
    verifiedAt: new Date(),
  });

  // Generate invoice/receipt
  // Non-fatal internally — booking/payment are already saved.
  await generateInvoiceForPayment(payment);

  return res.status(201).json({
    message: 'Student added successfully',

    user: {
      id: user._id,
      name: user.name,
      email: user.email,
    },

    student,
    booking,
    payment,
    receiptUrl: payment.invoiceUrl,
  });
});

module.exports = {
  adminCreateStudent,
};