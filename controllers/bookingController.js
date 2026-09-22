 
const asyncHandler = require('../utils/asyncHandler');

const {
  Seat,
  Library,
  AddOn,
  SeatBooking,
  Student,
  TimeSlot,
  WaitingList,
  Coupon,
  Payment,
} = require('../models');

const seatLockService = require('../services/seatLockService');
const { notifyWaitingListForSeat } = require('../services/waitingListService');
const { isSeatAvailable } = require('../utils/seatAvailability');
const { calculateBookingPrice } = require('../utils/pricingUtils');


// ============================================================
// LOCK SEAT
// ============================================================

// @desc    Temporarily hold a seat while student completes booking flow
// @route   POST /api/bookings/lock-seat
// @access  Private (student)
const lockSeat = asyncHandler(async (req, res) => {
  const { seatId } = req.body;

  const student = await Student.findOne({
    userId: req.user._id,
  });

  if (!student) {
    return res.status(404).json({
      message: 'Student not found',
    });
  }

  const seat = await Seat.findOne({
    _id: seatId,
    libraryId: req.libraryId,
  });

  if (!seat || seat.status !== 'available') {
    return res.status(400).json({
      message: 'Seat is not available',
    });
  }

  const result = seatLockService.acquireLock(
    seatId,
    student._id.toString()
  );

  if (!result.success) {
    return res.status(409).json({
      message: result.message,
    });
  }

  res.status(200).json({
    message: 'Seat held for 5 minutes',
    expiresAt: result.expiresAt,
  });
});


// ============================================================
// RELEASE SEAT
// ============================================================

// @desc    Release a held seat
// @route   POST /api/bookings/release-seat
// @access  Private (student)
const releaseSeat = asyncHandler(async (req, res) => {
  const { seatId } = req.body;

  const student = await Student.findOne({
    userId: req.user._id,
  });

  if (!student) {
    return res.status(404).json({
      message: 'Student not found',
    });
  }

  seatLockService.releaseLock(
    seatId,
    student._id.toString()
  );

  res.status(200).json({
    message: 'Seat released',
  });
});


// ============================================================
// CREATE BOOKING
// ============================================================

// @desc    Create a booking (seat + time slot + add-ons + coupon)
//          — goes to pending_approval
// @route   POST /api/bookings
// @access  Private (student)
const createBooking = asyncHandler(async (req, res) => {
  const {
    seatId,
    timeSlotId,
    durationMonths,
    startDate,
    addOnIds,
    addOnQuantities,
    couponCode,
  } = req.body;

  // addOnQuantities format:
  // {
  //   "ADD_ON_ID_1": 2,
  //   "ADD_ON_ID_2": 1
  // }
  //
  // Quantity defaults to 1 if not provided.

  const student = await Student.findOne({
    userId: req.user._id,
  });

  // Admission verification gate removed.
  // Student only needs to have a profile.
  // Booking approval will happen only after payment is verified.
  if (!student) {
    return res.status(404).json({
      message:
        'Student profile not found — complete your profile first',
    });
  }

  const seat = await Seat.findOne({
    _id: seatId,
    libraryId: req.libraryId,
  });

  if (!seat || !seat.isActive) {
    return res.status(400).json({
      message: 'Seat not found or disabled',
    });
  }

  const start = new Date(startDate);

  const end = new Date(start);
  end.setMonth(
    end.getMonth() + Number(durationMonths)
  );

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

  const library = await Library.findById(
    req.libraryId
  );

  if (!library) {
    return res.status(404).json({
      message: 'Library not found',
    });
  }

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


  // --------------------------------------------------
  // COUPON VALIDATION
  // --------------------------------------------------

  let couponDiscountPercent = 0;
  let coupon = null;

  if (couponCode && couponCode.trim()) {
    coupon = await Coupon.findOne({
      libraryId: req.libraryId,
      code: couponCode.trim().toUpperCase(),
      isActive: true,
      usedBy: null,
    });

    if (!coupon) {
      return res.status(400).json({
        message: 'Invalid or already-used coupon code',
      });
    }

    if (
      coupon.expiresAt &&
      coupon.expiresAt < new Date()
    ) {
      return res.status(400).json({
        message: 'This coupon has expired',
      });
    }

    couponDiscountPercent =
      coupon.discountPercent;
  }


  // --------------------------------------------------
  // ADD-ONS
  // --------------------------------------------------

  const addOns = addOnIds?.length
    ? await AddOn.find({
        _id: {
          $in: addOnIds,
        },
        libraryId: req.libraryId,
        isActive: true,
      })
    : [];


  // --------------------------------------------------
  // PRICE CALCULATION
  // --------------------------------------------------

  // Coupon discount is applied to the seat price.
  const seatPriceAtBooking =
    calculateBookingPrice(
      timeSlot.monthlyPrice,
      durationMonths,
      library,
      couponDiscountPercent
    );


  // --------------------------------------------------
  // ADD-ON SNAPSHOT WITH QUANTITY
  // --------------------------------------------------

  const addOnsSnapshot = addOns.map((a) => ({
    addOnId: a._id,
    priceAtBooking: a.pricePerMonth,

    // Quantity supplied by frontend.
    // Defaults to 1.
    quantity:
      addOnQuantities?.[a._id.toString()] || 1,
  }));


  // --------------------------------------------------
  // ADD-ON TOTAL
  // --------------------------------------------------

  const addOnsTotal =
    addOnsSnapshot.reduce(
      (sum, a) =>
        sum +
        a.priceAtBooking *
          a.quantity,
      0
    );


  // --------------------------------------------------
  // FINAL MONTHLY AMOUNT
  // --------------------------------------------------

  const totalMonthlyAmount =
    seatPriceAtBooking +
    addOnsTotal;


  // --------------------------------------------------
  // CREATE BOOKING
  // --------------------------------------------------

  const booking =
    await SeatBooking.create({
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

      // Booking remains pending until
      // payment is verified by admin.
      status: 'pending_approval',

      couponCode: coupon
        ? coupon.code
        : undefined,

      couponDiscountPercent: coupon
        ? coupon.discountPercent
        : 0,
    });


  // --------------------------------------------------
  // MARK COUPON AS USED
  // --------------------------------------------------

  if (coupon) {
    coupon.usedBy = student._id;
    coupon.usedAt = new Date();

    await coupon.save();
  }


  // --------------------------------------------------
  // RELEASE TEMPORARY SEAT LOCK
  // --------------------------------------------------

  seatLockService.releaseLock(
    seatId,
    student._id.toString()
  );


  res.status(201).json({
    booking,
  });
});


// ============================================================
// LIST BOOKINGS
// ============================================================

// @desc    List bookings
// @route   GET /api/bookings?status=pending_approval
// @access  Private
const listBookings = asyncHandler(async (req, res) => {
  const filter = {
    libraryId: req.libraryId,
  };


  // --------------------------------------------------
  // EXPIRING BOOKINGS
  // --------------------------------------------------

  if (req.query.expiringWithinDays) {
    const days = Number(
      req.query.expiringWithinDays
    );

    filter.status = 'active';

    filter.endDate = {
      $gte: new Date(),
      $lte: new Date(
        Date.now() +
          days *
            24 *
            60 *
            60 *
            1000
      ),
    };
  }

  // --------------------------------------------------
  // STATUS FILTER
  // --------------------------------------------------

  else if (req.query.status) {
    filter.status = req.query.status;
  }


  // --------------------------------------------------
  // STUDENT / GENDER FILTER
  // --------------------------------------------------

  if (req.user.role === 'student') {
    const student = await Student.findOne({
      userId: req.user._id,
    });

    if (!student) {
      return res.status(404).json({
        message: 'Student not found',
      });
    }

    filter.studentId = student._id;
  }

  else if (req.query.studentId) {
    // Admin looking up one specific student's bookings —
    // needed by StudentDetailModal to find their active booking.
    filter.studentId = req.query.studentId;
  }

  else if (req.query.gender) {
    const matchingStudents =
      await Student.find({
        libraryId: req.libraryId,
        gender: req.query.gender,
      }).select('_id');

    filter.studentId = {
      $in: matchingStudents.map(
        (s) => s._id
      ),
    };
  }


  // --------------------------------------------------
  // FETCH BOOKINGS
  // --------------------------------------------------

  const bookings =
    await SeatBooking.find(filter)
      .populate({
        path: 'seatId',
        select: 'seatNumber hallId',
        populate: {
          path: 'hallId',
          select: 'name hallNumber',
        },
      })
      .populate(
        'timeSlotId',
        'label startTime endTime'
      )
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


  // ==================================================
  // NEW:
  // ATTACH PAYMENT TO PENDING BOOKINGS
  // ==================================================

  if (
    filter.status ===
    'pending_approval'
  ) {
    const bookingIds =
      bookings.map(
        (booking) => booking._id
      );

    const payments =
      await Payment.find({
        bookingId: {
          $in: bookingIds,
        },
      }).sort({
        createdAt: -1,
      });


    // Keep only the newest payment
    // for each booking.
    const paymentMap =
      new Map();

    payments.forEach((payment) => {
      const bookingId =
        payment.bookingId.toString();

      if (
        !paymentMap.has(bookingId)
      ) {
        paymentMap.set(
          bookingId,
          payment
        );
      }
    });


    // Attach payment to each booking.
    //
    // This includes the payment screenshot/
    // receipt field stored in the Payment document.
    const bookingsWithPayment =
      bookings.map((booking) => ({
        ...booking.toObject(),

        payment:
          paymentMap.get(
            booking._id.toString()
          ) || null,
      }));


    return res.status(200).json({
      count:
        bookingsWithPayment.length,

      bookings:
        bookingsWithPayment,
    });
  }


  res.status(200).json({
    count: bookings.length,
    bookings,
  });
});


// ============================================================
// APPROVE BOOKING
// ============================================================

// @desc    Admin approves a pending booking
//          — requires a verified payment
// @route   PUT /api/bookings/:id/approve
// @access  Private (admin)
const approveBooking =
  asyncHandler(async (req, res) => {

    const booking =
      await SeatBooking.findOne({
        _id: req.params.id,
        libraryId: req.libraryId,
      });


    if (
      !booking ||
      booking.status !==
        'pending_approval'
    ) {
      return res.status(400).json({
        message:
          'Booking is not pending approval',
      });
    }


    // --------------------------------------------------
    // PAYMENT VERIFICATION GATE
    // --------------------------------------------------

    const verifiedPayment =
      await Payment.findOne({
        bookingId: booking._id,
        status: 'verified',
      });


    if (!verifiedPayment) {
      return res.status(400).json({
        message:
          'Cannot approve — no verified payment found for this booking. Verify the payment first.',
      });
    }


    // --------------------------------------------------
    // APPROVE BOOKING
    // --------------------------------------------------

    booking.status = 'active';

    booking.approvedBy =
      req.user._id;

    booking.approvedAt =
      new Date();

    await booking.save();


    res.status(200).json({
      message:
        'Booking approved',
      booking,
    });
  });


// ============================================================
// VERIFY PAYMENT + APPROVE BOOKING
// ============================================================

// @desc    Single-step: verify student's payment
//          AND approve the booking.
//          Allocates the seat.
// @route   PUT /api/bookings/:id/verify-and-approve
// @access  Private (admin)
const verifyAndApproveBooking =
  asyncHandler(async (req, res) => {

    // --------------------------------------------------
    // FIND BOOKING
    // --------------------------------------------------

    const booking =
      await SeatBooking.findOne({
        _id: req.params.id,
        libraryId: req.libraryId,
      });


    if (
      !booking ||
      booking.status !==
        'pending_approval'
    ) {
      return res.status(400).json({
        message:
          'Booking is not pending approval',
      });
    }


    // --------------------------------------------------
    // FIND PENDING PAYMENT
    // --------------------------------------------------

    // Only a pending payment can be
    // verified by this action.
    const payment =
      await Payment.findOne({
        bookingId: booking._id,
        status: 'pending',
      }).sort({
        createdAt: -1,
      });


    if (!payment) {
      return res.status(400).json({
        message:
          'No pending payment found for this booking',
      });
    }


    // --------------------------------------------------
    // VERIFY PAYMENT
    // --------------------------------------------------

    payment.status = 'verified';

    payment.verifiedBy =
      req.user._id;

    payment.verifiedAt =
      new Date();

    await payment.save();


    // --------------------------------------------------
    // APPROVE BOOKING
    // --------------------------------------------------

    booking.status = 'active';

    booking.approvedBy =
      req.user._id;

    booking.approvedAt =
      new Date();

    await booking.save();


    // --------------------------------------------------
    // GENERATE INVOICE
    // --------------------------------------------------

    const {
      generateInvoiceForPayment,
    } = require('../services/invoiceService');

    await generateInvoiceForPayment(
      payment
    );


    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    res.status(200).json({
      message:
        'Payment verified and booking approved — seat allocated',

      booking,

      payment,
    });
  });


// ============================================================
// REJECT BOOKING
// ============================================================

// @desc    Reject pending booking
//          — also rejects associated pending payment
// @route   PUT /api/bookings/:id/reject
// @access  Private (admin)
const rejectBooking =
  asyncHandler(async (req, res) => {

    const {
      rejectionReason,
    } = req.body;


    const booking =
      await SeatBooking.findOne({
        _id: req.params.id,
        libraryId: req.libraryId,
      });


    if (
      !booking ||
      booking.status !==
        'pending_approval'
    ) {
      return res.status(400).json({
        message:
          'Booking is not pending approval',
      });
    }


    // --------------------------------------------------
    // REJECT ASSOCIATED PAYMENT
    // --------------------------------------------------

    const payment =
      await Payment.findOne({
        bookingId: booking._id,
        status: 'pending',
      });


    if (payment) {
      payment.status =
        'rejected';

      payment.verifiedBy =
        req.user._id;

      payment.verifiedAt =
        new Date();

      await payment.save();
    }


    // --------------------------------------------------
    // CANCEL BOOKING
    // --------------------------------------------------

    booking.status =
      'cancelled';

    booking.rejectionReason =
      rejectionReason;

    await booking.save();


    // Notify waiting students
    // that the seat is available again.
    await notifyWaitingListForSeat(
      booking.seatId,
      req.libraryId
    );


    res.status(200).json({
      message:
        'Booking rejected',

      booking,
    });
  });


// ============================================================
// ADMIN EDIT BOOKING
// ============================================================

// @desc    Admin edits an existing booking
//          Change seat, shift, or both.
// @route   PUT /api/bookings/:id/admin-edit
// @access  Private (admin)
const adminEditBooking =
  asyncHandler(async (req, res) => {

    const {
      seatId,
      timeSlotId,
    } = req.body;


    const booking =
      await SeatBooking.findOne({
        _id: req.params.id,
        libraryId: req.libraryId,
      });


    if (!booking) {
      return res.status(404).json({
        message:
          'Booking not found',
      });
    }


    const wantsSeat =
      Boolean(seatId);


    const newTimeSlotId =
      timeSlotId ||
      booking.timeSlotId;


    // --------------------------------------------------
    // CHECK NEW SEAT
    // --------------------------------------------------

    if (wantsSeat) {
      const seat =
        await Seat.findOne({
          _id: seatId,
          libraryId:
            req.libraryId,
        });


      if (
        !seat ||
        !seat.isActive
      ) {
        return res.status(400).json({
          message:
            'Seat not found or disabled',
        });
      }


      const availability =
        await isSeatAvailable({
          seatId,
          timeSlotId:
            newTimeSlotId,

          startDate:
            booking.startDate,

          endDate:
            booking.endDate,

          libraryId:
            req.libraryId,

          excludeBookingId:
            booking._id,
        });


      if (!availability.available) {
        return res.status(400).json({
          message:
            availability.reason,
        });
      }
    }


    // --------------------------------------------------
    // RE-PRICE IF SHIFT CHANGES
    // --------------------------------------------------

    if (
      timeSlotId &&
      String(timeSlotId) !==
        String(booking.timeSlotId)
    ) {

      const newTimeSlot =
        await TimeSlot.findOne({
          _id: timeSlotId,
          libraryId:
            req.libraryId,
          isActive: true,
        });


      if (!newTimeSlot) {
        return res.status(400).json({
          message:
            'Selected time slot is not available',
        });
      }


      const library =
        await Library.findById(
          req.libraryId
        );


      const newPrice =
        calculateBookingPrice(
          newTimeSlot.monthlyPrice,
          booking.durationMonths,
          library
        );


      // Respect add-on quantities.
      const addOnsTotal =
        booking.addOns.reduce(
          (sum, a) =>
            sum +
            a.priceAtBooking *
              (a.quantity || 1),
          0
        );


      booking.seatPriceAtBooking =
        newPrice;

      booking.totalMonthlyAmount =
        newPrice +
        addOnsTotal;

      booking.timeSlotId =
        timeSlotId;
    }


    // --------------------------------------------------
    // UPDATE SEAT
    // --------------------------------------------------

    booking.seatId =
      wantsSeat
        ? seatId
        : undefined;


    await booking.save();


    // --------------------------------------------------
    // RETURN POPULATED BOOKING
    // --------------------------------------------------

    const populated =
      await SeatBooking.findById(
        booking._id
      )
        .populate(
          'seatId',
          'seatNumber hallId'
        )
        .populate(
          'timeSlotId',
          'label monthlyPrice'
        )
        .populate({
          path: 'studentId',
          populate: {
            path: 'userId',
            select:
              'name email phone',
          },
        });


    res.status(200).json({
      message:
        'Booking updated',

      booking:
        populated,
    });
  });


// ============================================================
// EXPORTS
// ============================================================



// @desc    Admin assigns a seat/shift to an existing student who doesn't
//          have an active booking yet (e.g. profile created without a seat).
//          Creates the booking (instantly active) and records payment.
// @route   POST /api/bookings/assign
// @access  Private (admin)
const assignSeatToStudent = asyncHandler(async (req, res) => {
  const {
    studentId,
    seatId,
    timeSlotId,
    durationMonths,
    startDate,
    paymentMethod,
    amountPaid,
  } = req.body;

  const student = await Student.findOne({ _id: studentId, libraryId: req.libraryId }).populate('userId', 'name phone email');
  if (!student) {
    return res.status(404).json({ message: 'Student not found' });
  }

  const existingActive = await SeatBooking.findOne({ studentId: student._id, status: 'active' });
  if (existingActive) {
    return res.status(400).json({ message: 'This student already has an active booking' });
  }

  const seat = await Seat.findOne({ _id: seatId, libraryId: req.libraryId });
  if (!seat || !seat.isActive) {
    return res.status(400).json({ message: 'Seat not found or disabled' });
  }

  const start = new Date(startDate || Date.now());
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

  const seatPriceAtBooking = calculateBookingPrice(timeSlot.monthlyPrice, durationMonths, library);

  const booking = await SeatBooking.create({
    libraryId: req.libraryId,
    studentId: student._id,
    seatId,
    timeSlotId,
    durationMonths,
    startDate: start,
    endDate: end,
    addOns: [],
    seatPriceAtBooking,
    totalMonthlyAmount: seatPriceAtBooking,
    status: 'active',
    approvedBy: req.user._id,
    approvedAt: new Date(),
  });

  const paidAmount = amountPaid != null ? Number(amountPaid) : seatPriceAtBooking;
  const dueAmount = Math.max(seatPriceAtBooking - paidAmount, 0);

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

  const { generateInvoiceForPayment } = require('../services/invoiceService');
  await generateInvoiceForPayment(payment);

  const populated = await SeatBooking.findById(booking._id)
    .populate('seatId', 'seatNumber hallId')
    .populate('timeSlotId', 'label monthlyPrice');

  res.status(201).json({ message: 'Seat assigned', booking: populated, payment });
});
 module.exports = {
  lockSeat,
  releaseSeat,
  createBooking,
  listBookings,
  approveBooking,
  verifyAndApproveBooking,
  rejectBooking,
  adminEditBooking,
  assignSeatToStudent, // add
};
 