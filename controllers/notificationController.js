// const asyncHandler = require('../utils/asyncHandler');
// const { Notification, Student } = require('../models');

// // @desc    Student's in-app notifications
// // @route   GET /api/notifications/me
// // @access  Private (student)
// const getMyNotifications = asyncHandler(async (req, res) => {
//   const student = await Student.findOne({ userId: req.user._id });
//   const notifications = await Notification.find({ studentId: student._id }).sort({
//     createdAt: -1,
//   });
//   res.status(200).json({ notifications });
// });

// // @desc    Mark a notification as read
// // @route   PUT /api/notifications/:id/read
// // @access  Private (student)
// const markAsRead = asyncHandler(async (req, res) => {
//   const notification = await Notification.findByIdAndUpdate(
//     req.params.id,
//     { isRead: true },
//     { new: true }
//   );
//   if (!notification) {
//     return res.status(404).json({ message: 'Notification not found' });
//   }
//   res.status(200).json({ notification });
// });

// module.exports = { getMyNotifications, markAsRead };
const asyncHandler = require('../utils/asyncHandler');
const { Notification, Student } = require('../models');

// @desc    Student's in-app notifications
// @route   GET /api/notifications/me
// @access  Private (student)
const getMyNotifications = asyncHandler(async (req, res) => {
  const student = await Student.findOne({
    userId: req.user._id,
  });

  // Student profile may not have been completed yet
  if (!student) {
    return res.status(200).json({
      notifications: [],
    });
  }

  const notifications = await Notification.find({
    studentId: student._id,
    libraryId: req.user.libraryId,
  }).sort({
    createdAt: -1,
  });

  res.status(200).json({
    notifications,
  });
});

// @desc    Mark a notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private (student)
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    {
      _id: req.params.id,
      studentId: req.user._id,
    },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({
      message: 'Notification not found',
    });
  }

  res.status(200).json({
    notification,
  });
});

module.exports = {
  getMyNotifications,
  markAsRead,
};