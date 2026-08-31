const mongoose = require('mongoose');

const timerSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // change to match your actual User model name if different
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['running', 'paused', 'stopped'],
      default: 'stopped',
    },
    accumulatedSeconds: {
      type: Number,
      default: 0,
    },
    sessionStartedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Timer', timerSchema);