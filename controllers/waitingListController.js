const asyncHandler = require('../utils/asyncHandler');
const { WaitingList, Seat, Student } = require('../models');

// @desc    Student joins the waiting list for a currently booked seat
// @route   POST /api/waiting-list
// @access  Private (student)
const joinWaitingList = asyncHandler(async (req, res) => {
  const { seatId, timeSlotId } = req.body;

  const seat = await Seat.findOne({ _id: seatId, libraryId: req.libraryId });
  if (!seat || seat.status === 'available') {
    return res.status(400).json({ message: 'Seat is currently available — book it directly' });
  }

  const student = await Student.findOne({ userId: req.user._id });

  const existing = await WaitingList.findOne({
    seatId,
    studentId: student._id,
    status: 'waiting',
  });
  if (existing) {
    return res.status(400).json({ message: 'Already on the waiting list for this seat' });
  }

  const entry = await WaitingList.create({
    libraryId: req.libraryId,
    studentId: student._id,
    seatId,
    timeSlotId,
    status: 'waiting',
  });

  res.status(201).json({ entry });
});

// @desc    Student's own waiting list entries
// @route   GET /api/waiting-list/me
// @access  Private (student)
const getMyWaitingList = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });
  const entries = await WaitingList.find({ studentId: student._id })
    .populate('seatId', 'seatNumber')
    .sort({ createdAt: -1 });

  res.status(200).json({ entries });
});

// @desc    Student leaves a waiting list
// @route   DELETE /api/waiting-list/:id
// @access  Private (student)
const leaveWaitingList = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });
  const entry = await WaitingList.findOneAndDelete({
    _id: req.params.id,
    studentId: student._id,
  });
  if (!entry) {
    return res.status(404).json({ message: 'Waiting list entry not found' });
  }
  res.status(200).json({ message: 'Removed from waiting list' });
});

module.exports = { joinWaitingList, getMyWaitingList, leaveWaitingList };
