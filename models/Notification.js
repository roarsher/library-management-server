const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
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
    type: {
      type: String,
      enum: [
        'seat_freed',
        'booking_approved',
        'booking_rejected',
        'leave_approved',
        'leave_rejected',
        'payment_due',
        'payment_verified',
        'membership_expiring',
        'no_show_flagged',
        'referral_reward',
        'broadcast_offer',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    channel: {
      type: String,
      enum: ['sms', 'whatsapp', 'email', 'push', 'in_app'],
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    sentAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

notificationSchema.index({ libraryId: 1, studentId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
