 const crypto = require('crypto');
const asyncHandler = require('../utils/asyncHandler');
const razorpayInstance = require('../config/razorpay');
const { Payment, SeatBooking, Student } = require('../models');
const { generateInvoiceForPayment } = require('../services/invoiceService');

// @desc    Create a Razorpay order for a booking payment
// @route   POST /api/payments/razorpay/create-order
// @access  Private (student)
const createRazorpayOrder = asyncHandler(async (req, res) => {
  const { bookingId } = req.body;

  const student = await Student.findOne({ userId: req.user._id });

  const booking = await SeatBooking.findOne({
    _id: bookingId,
    studentId: student._id,
    libraryId: req.libraryId,
  });

  if (!booking) {
    return res.status(404).json({ message: 'Booking not found' });
  }

  const amount =
    booking.totalMonthlyAmount *
    booking.durationMonths *
    100; // paise

  const order = await razorpayInstance.orders.create({
    amount,
    currency: 'INR',
    receipt: `booking_${booking._id}`,
  });

  const payment = await Payment.create({
    libraryId: req.libraryId,
    studentId: student._id,
    bookingId: booking._id,
    amount: amount / 100,
    method: 'razorpay',
    razorpayOrderId: order.id,
    status: 'pending',
  });

  res.status(201).json({
    order,
    paymentId: payment._id,
    keyId: process.env.RAZORPAY_KEY_ID,
  });
});

// @desc    Verify Razorpay payment signature after checkout completes
// @route   POST /api/payments/razorpay/verify
// @access  Private (student)
const verifyRazorpayPayment = asyncHandler(async (req, res) => {
  const {
    paymentId,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = req.body;

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({
      message: 'Payment verification failed — signature mismatch',
    });
  }

  const payment = await Payment.findOne({
    _id: paymentId,
    libraryId: req.libraryId,
  });

  if (!payment) {
    return res.status(404).json({
      message: 'Payment record not found',
    });
  }

  payment.razorpayPaymentId = razorpay_payment_id;
  payment.razorpaySignature = razorpay_signature;
  payment.status = 'verified';
  payment.verifiedAt = new Date();

  await payment.save();
  await generateInvoiceForPayment(payment);

  res.status(200).json({
    message: 'Payment verified',
    payment,
  });
});

// @desc    Student uploads a screenshot of manual QR payment
// @route   POST /api/payments/manual
// @access  Private (student)
// Note: expects req.body.screenshotUrl already uploaded via your file-upload
// route (multer + Cloudinary) — keeping this controller focused on the record.
const submitManualPayment = asyncHandler(async (req, res) => {
  const { bookingId, amount, screenshotUrl } = req.body;

  const student = await Student.findOne({
    userId: req.user._id,
  });

  const booking = await SeatBooking.findOne({
    _id: bookingId,
    studentId: student._id,
    libraryId: req.libraryId,
  });

  if (!booking) {
    return res.status(404).json({
      message: 'Booking not found',
    });
  }

  const payment = await Payment.create({
    libraryId: req.libraryId,
    studentId: student._id,
    bookingId: booking._id,
    amount,
    method: 'manual_qr',
    screenshotUrl,
    status: 'pending',
  });

  res.status(201).json({
    message: 'Payment submitted, awaiting admin verification',
    payment,
  });
});

// @desc    Admin verifies or rejects a manual QR payment
// @route   PUT /api/payments/:id/verify-manual
// @access  Private (admin)
const verifyManualPayment = asyncHandler(async (req, res) => {
  const { decision } = req.body; // 'verified' | 'rejected'

  if (!['verified', 'rejected'].includes(decision)) {
    return res.status(400).json({
      message: 'decision must be verified or rejected',
    });
  }

  const payment = await Payment.findOne({
    _id: req.params.id,
    libraryId: req.libraryId,
    method: 'manual_qr',
  });

  if (!payment || payment.status !== 'pending') {
    return res.status(400).json({
      message: 'Payment not found or already processed',
    });
  }

  payment.status = decision;
  payment.verifiedBy = req.user._id;
  payment.verifiedAt = new Date();

  await payment.save();

  if (decision === 'verified') {
    await generateInvoiceForPayment(payment);
  }

  res.status(200).json({
    message: `Payment ${decision}`,
    payment,
  });
});

// @desc    List payments pending manual verification
// @route   GET /api/payments/pending-manual
// @access  Private (admin)
const listPendingManualPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find({
    libraryId: req.libraryId,
    method: 'manual_qr',
    status: 'pending',
  })
    .populate({
      path: 'studentId',
      populate: {
        path: 'userId',
        select: 'name email phone',
      },
    })
    .populate('bookingId')
    .sort({ createdAt: -1 });

  res.status(200).json({
    count: payments.length,
    payments,
  });
});

// @desc    Student's own payment history
// @route   GET /api/payments/me
// @access  Private (student)
const getMyPaymentHistory = asyncHandler(async (req, res) => {
  const student = await Student.findOne({
    userId: req.user._id,
  });

  const payments = await Payment.find({
    studentId: student._id,
  }).sort({ createdAt: -1 });

  res.status(200).json({
    payments,
  });
});

// @desc    Admin — list all payments for the library (drill-down from revenue stat)
// @route   GET /api/payments?status=verified
// @access  Private (admin)
const listAllPayments = asyncHandler(async (req, res) => {
  const filter = {
    libraryId: req.libraryId,
  };

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.method) {
    filter.method = req.query.method;
  }

  const payments = await Payment.find(filter)
    .populate({
      path: 'studentId',
      populate: {
        path: 'userId',
        select: 'name email phone',
      },
    })
    .populate('bookingId')
    .sort({ createdAt: -1 });

  res.status(200).json({
    count: payments.length,
    payments,
  });
});

 // @desc    Students with pending/unpaid dues — active booking with no
//          verified payment covering it, or an explicitly pending payment.
// @route   GET /api/payments/due
// @access  Private (admin)
const listPaymentsDue = asyncHandler(async (req, res) => {
  const pendingPayments = await Payment.find({
    libraryId: req.libraryId,
    status: { $in: ['pending', 'failed'] },
  })
    .populate({ path: 'studentId', populate: { path: 'userId', select: 'name email phone' } })
    .populate('bookingId')
    .sort({ createdAt: -1 });

  res.status(200).json({ count: pendingPayments.length, payments: pendingPayments });
});

module.exports = {
  createRazorpayOrder,
  verifyRazorpayPayment,
  submitManualPayment,
  verifyManualPayment,
  listPendingManualPayments,
  getMyPaymentHistory,
  listAllPayments,
  listPaymentsDue, // add
}; 