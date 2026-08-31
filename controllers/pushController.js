// server/controllers/pushController.js
const asyncHandler = require('../utils/asyncHandler');
const { PushSubscription, Student } = require('../models');

// @desc    Return the public VAPID key so the frontend can subscribe
// @route   GET /api/push/vapid-public-key
// @access  Private
const getVapidPublicKey = asyncHandler(async (req, res) => {
  res.status(200).json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// @desc    Save a browser's push subscription for the logged-in student
// @route   POST /api/push/subscribe
// @access  Private (student)
const subscribe = asyncHandler(async (req, res) => {
  const { endpoint, keys } = req.body;
  const student = await Student.findOne({ userId: req.user._id });

  await PushSubscription.findOneAndUpdate(
    { endpoint },
    {
      libraryId: req.libraryId,
      studentId: student._id,
      endpoint,
      keys,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.status(201).json({ message: 'Subscribed to push notifications' });
});

// @desc    Remove a subscription (e.g. student disables notifications)
// @route   POST /api/push/unsubscribe
// @access  Private (student)
const unsubscribe = asyncHandler(async (req, res) => {
  const { endpoint } = req.body;
  await PushSubscription.findOneAndDelete({ endpoint });
  res.status(200).json({ message: 'Unsubscribed' });
});

module.exports = { getVapidPublicKey, subscribe, unsubscribe };
