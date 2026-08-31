 const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  { lat: Number, lng: Number },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    libraryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Library', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'SeatBooking', required: true },
    checkInAt: { type: Date, required: true },
    checkOutAt: { type: Date },
    checkInLocation: { type: locationSchema },
    checkOutLocation: { type: locationSchema },
    source: { type: String, enum: ['qr', 'manual'], default: 'qr' },
    durationMinutes: { type: Number },
  },
  { timestamps: true }
);

attendanceSchema.index({ libraryId: 1, studentId: 1, checkInAt: -1 });
attendanceSchema.index({ bookingId: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);