const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    libraryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Library',
      required: true,
    },
    dob: {
      type: Date,
      required: true,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: true,
    },
    bloodGroup: {
      type: String,
    },
    aadhaarNumber: {
      type: String,
      required: true,
    },
    parentDetails: {
      fatherName: String,
      motherName: String,
      parentPhone: String,
    },
    address: {
      type: String,
      required: true,
    },
    qualification: {
      type: String,
    },
    preparingFor: {
      type: String, // e.g. UPSC, SSC, Board Exams
    },
    photoUrl: {
      type: String,
    },
    idProofUrl: {
      type: String,
    },
    admissionStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    rejectionReason: {
      type: String,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: {
      type: Date,
    },
    favoriteSeatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seat',
      default: null,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      default: null,
    },
    currentStreak: {
      type: Number,
      default: 0, // consecutive days with a check-in, recalculated by cron
    },
    longestStreak: {
      type: Number,
      default: 0,
    },
    lastCheckInDate: {
      type: Date, // midnight-normalized date of the most recent check-in, used to compute streaks in real time
      default: null,
    },
  },
  { timestamps: true }
);

studentSchema.index({ libraryId: 1, admissionStatus: 1 });

module.exports = mongoose.model('Student', studentSchema);
