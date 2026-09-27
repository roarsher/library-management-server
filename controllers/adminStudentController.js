 

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
    addOnQuantities, // { [addOnId]: quantity }

    paymentMethod,
    amountPaid,

    couponCode, // Reserved for coupon/discount logic
  } = req.body;

  // ---------------------------------------------------------
  // 1. Check existing user
  // ---------------------------------------------------------

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    return res.status(400).json({
      message: 'A user with this email already exists',
    });
  }

  // ---------------------------------------------------------
  // 2. Determine whether admin wants to assign a seat
  // ---------------------------------------------------------

  const wantsSeat = Boolean(seatId);

  let seat = null;
  let start = null;
  let end = null;

  // ---------------------------------------------------------
  // 3. Seat validation
  //    Only required when a seat is selected
  // ---------------------------------------------------------

  if (wantsSeat) {
    seat = await Seat.findOne({
      _id: seatId,
      libraryId: req.libraryId,
    });

    if (!seat || !seat.isActive) {
      return res.status(400).json({
        message: 'Seat not found or disabled',
      });
    }

    // Calculate booking dates
    start = new Date(startDate || Date.now());

    end = new Date(start);
    end.setMonth(end.getMonth() + Number(durationMonths));

    // IMPORTANT:
    // Do not use Seat.status here.
    // Availability is calculated from existing bookings
    // and time-slot overlaps.

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
  }

  // ---------------------------------------------------------
  // 4. Find library
  // ---------------------------------------------------------

  const library = await Library.findById(req.libraryId);

  if (!library) {
    return res.status(404).json({
      message: 'Library not found',
    });
  }

  // ---------------------------------------------------------
  // 5. Create User
  // ---------------------------------------------------------

  const user = await User.create({
    name,
    email,
    phone,
    password,
    role: 'student',
    libraryId: req.libraryId,
    isEmailVerified: true,
  });

  // ---------------------------------------------------------
  // 6. Create Student Profile
  // ---------------------------------------------------------

   const registrationNumber = await generateRegistrationNumber(req.libraryId);

  const student = await Student.create({
    userId: user._id,
    libraryId: req.libraryId,
    dob, gender, bloodGroup, aadhaarNumber, parentDetails, address,
    qualification, preparingFor,
    photoUrl, idProofUrl,
    admissionStatus: 'verified',
    verifiedBy: req.user._id,
    verifiedAt: new Date(),
    registrationNumber,
  });
  // ---------------------------------------------------------
  // 7. NO SEAT SELECTED
  //
  // Create only User + Student.
  // No booking.
  // No payment.
  // No invoice/receipt.
  // ---------------------------------------------------------

       if (!wantsSeat) {
    let payment = null;

    // Admin can still record an initial payment/due even without a seat —
    // e.g. a registration fee collected up front.
    if (req.body.totalDue != null) {
      const totalDue = Number(req.body.totalDue);
      const paidAmount = req.body.amountPaid != null ? Number(req.body.amountPaid) : totalDue;
      const dueAmount = Math.max(totalDue - paidAmount, 0);

      payment = await Payment.create({
        libraryId: req.libraryId,
        studentId: student._id,
        bookingId: null, // no booking yet — payment exists independently
        amount: paidAmount,
        dueAmount,
        isFullyCleared: dueAmount === 0,
        method: req.body.paymentMethod || 'cash',
        status: 'verified',
        verifiedBy: req.user._id,
        verifiedAt: new Date(),
      });
    }

    return res.status(201).json({
      message: 'Student added successfully (no seat assigned yet)',
      user: { id: user._id, name: user.name, email: user.email },
      student,
      booking: null,
      payment,
      receiptUrl: null,
    });
  }

  // ---------------------------------------------------------
  // 8. Find Time Slot
  // ---------------------------------------------------------

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

  // ---------------------------------------------------------
  // 9. Find Add-ons
  // ---------------------------------------------------------

  const addOns = addOnIds?.length
    ? await AddOn.find({
        _id: { $in: addOnIds },
        libraryId: req.libraryId,
        isActive: true,
      })
    : [];

  // ---------------------------------------------------------
  // 10. Calculate Booking Price
  // ---------------------------------------------------------

  const seatPriceAtBooking = calculateBookingPrice(
    timeSlot.monthlyPrice,
    durationMonths,
    library
  );

  // ---------------------------------------------------------
  // 11. Create Add-on Snapshot
  //
  // addOnQuantities format:
  // {
  //   "ADD_ON_ID_1": 2,
  //   "ADD_ON_ID_2": 1
  // }
  //
  // If quantity is not provided, default = 1
  // ---------------------------------------------------------

  const addOnsSnapshot = addOns.map((a) => {
    const quantity = Number(
      addOnQuantities?.[a._id.toString()] || 1
    );

    return {
      addOnId: a._id,
      priceAtBooking: a.pricePerMonth,
      quantity: quantity > 0 ? quantity : 1,
    };
  });

  // ---------------------------------------------------------
  // 12. Calculate Total Monthly Amount
  // ---------------------------------------------------------

  const addOnsTotal = addOnsSnapshot.reduce(
    (sum, a) => sum + a.priceAtBooking * a.quantity,
    0
  );

  const totalMonthlyAmount =
    seatPriceAtBooking + addOnsTotal;

  // ---------------------------------------------------------
  // 13. Create Seat Booking
  // ---------------------------------------------------------

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
  //
  // Seat availability is calculated dynamically by
  // isSeatAvailable() based on booking/date/time-slot overlap.

  // ---------------------------------------------------------
  // 14. Create Payment
  // ---------------------------------------------------------

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

  // ---------------------------------------------------------
  // 15. Generate Invoice / Receipt
  // ---------------------------------------------------------

  await generateInvoiceForPayment(payment);

  // ---------------------------------------------------------
  // 16. Final Response
  // ---------------------------------------------------------

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