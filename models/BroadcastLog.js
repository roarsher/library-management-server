const mongoose = require('mongoose');

const broadcastLogSchema = new mongoose.Schema(
  {
    libraryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Library',
      required: true,
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    channel: {
      type: String,
      enum: ['whatsapp', 'sms', 'email'],
      default: 'whatsapp',
    },
    message: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String, // optional image attached to the offer/event broadcast
    },
    recipientCount: {
      type: Number,
      required: true,
    },
    recipientFilter: {
      type: String,
      enum: ['all_students', 'active_only', 'expiring_soon', 'custom'],
      default: 'all_students',
    },
    deliveredCount: {
      type: Number,
      default: 0,
    },
    failedCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['queued', 'sending', 'completed', 'failed'],
      default: 'queued',
    },
  },
  { timestamps: true }
);

broadcastLogSchema.index({ libraryId: 1, createdAt: -1 });

module.exports = mongoose.model('BroadcastLog', broadcastLogSchema);
