const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    libraryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Library',
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SeatBooking',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    method: {
      type: String,
      enum: ['razorpay', 'manual_qr', 'cash'],
      required: true,
    },
    // Razorpay-specific fields
    razorpayOrderId: {
      type: String,
    },
    razorpayPaymentId: {
      type: String,
    },
    razorpaySignature: {
      type: String,
    },
    // Manual QR screenshot fields
    screenshotUrl: {
      type: String,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // admin who verified manual/cash payment
    },
    verifiedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected', 'failed'],
      default: 'pending',
    },
    isRenewal: {
      type: Boolean,
      default: false,
    },
    invoiceNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    invoiceUrl: {
      type: String,
    },
  },
  { timestamps: true }
);

paymentSchema.index({ libraryId: 1, status: 1 });
paymentSchema.index({ studentId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
