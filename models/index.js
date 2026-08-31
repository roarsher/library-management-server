// Central export point — lets you do:
// const { Student, SeatBooking, Payment } = require('../models');
// instead of importing each model file individually.

module.exports = {
  Timer: require('./Timer'),
  Library: require('./Library'),
  User: require('./User'),
  Student: require('./Student'),
  Seat: require('./Seat'),
  Hall: require('./Hall'),
  TimeSlot: require('./TimeSlot'),
  AddOn: require('./AddOn'),
  SeatBooking: require('./SeatBooking'),
  LeaveRequest: require('./LeaveRequest'),
  WaitingList: require('./WaitingList'),
  Payment: require('./Payment'),
  Attendance: require('./Attendance'),
  NoShowLog: require('./NoShowLog'),
  AuditLog: require('./AuditLog'),
  Referral: require('./Referral'),
  Gallery: require('./Gallery'),
  GalleryImage: require('./GalleryImage'),
  BroadcastLog: require('./BroadcastLog'),
  Notification: require('./Notification'),
  OtpVerification: require('./OtpVerification'),
  Todo: require('./Todo'),
  PushSubscription: require('./PushSubscription'),
};
