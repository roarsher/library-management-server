 const asyncHandler = require('../utils/asyncHandler');
const { TimeSlot } = require('../models');
const { buildTimeSlotSeedData } = require('../utils/timeSlotSeedData');

// @desc    Create a time slot
// @route   POST /api/time-slots
// @access  Private (admin)
const createTimeSlot = asyncHandler(async (req, res) => {
  const { label, segments, isOvernight, monthlyPrice } = req.body;

  if (!segments || !Array.isArray(segments) || segments.length === 0) {
    return res.status(400).json({ message: 'At least one segment (startTime/endTime) is required' });
  }
  if (monthlyPrice == null) {
    return res.status(400).json({ message: 'monthlyPrice is required' });
  }

  const timeSlot = await TimeSlot.create({
    libraryId: req.libraryId,
    label,
    segments,
    isOvernight,
    monthlyPrice,
  });

  res.status(201).json({ timeSlot });
});

// @desc    List active time slots
// @route   GET /api/time-slots
// @access  Private
const listTimeSlots = asyncHandler(async (req, res) => {
  const timeSlots = await TimeSlot.find({ libraryId: req.libraryId, isActive: true });
  res.status(200).json({ timeSlots });
});

// @desc    Update a time slot
// @route   PUT /api/time-slots/:id
// @access  Private (admin)
const updateTimeSlot = asyncHandler(async (req, res) => {
  const timeSlot = await TimeSlot.findOne({ _id: req.params.id, libraryId: req.libraryId });
  if (!timeSlot) {
    return res.status(404).json({ message: 'Time slot not found' });
  }

  const fields = ['label', 'segments', 'isOvernight', 'monthlyPrice', 'isActive'];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) timeSlot[f] = req.body[f];
  });

  await timeSlot.save();
  res.status(200).json({ timeSlot });
});

// @desc    Delete a time slot
// @route   DELETE /api/time-slots/:id
// @access  Private (admin)
const deleteTimeSlot = asyncHandler(async (req, res) => {
  const timeSlot = await TimeSlot.findOneAndDelete({
    _id: req.params.id,
    libraryId: req.libraryId,
  });
  if (!timeSlot) {
    return res.status(404).json({ message: 'Time slot not found' });
  }
  res.status(200).json({ message: 'Time slot deleted' });
});

// @desc    One-time helper — wipes and reseeds this library's time slots
//          with the standard fee-card shifts (1-month prices only; 2/3-month
//          totals are computed live via calculateBookingPrice + library discounts)
// @route   POST /api/time-slots/seed-defaults
// @access  Private (admin)
const seedDefaultTimeSlots = asyncHandler(async (req, res) => {
  await TimeSlot.deleteMany({ libraryId: req.libraryId });
  const created = await TimeSlot.insertMany(buildTimeSlotSeedData(req.libraryId));
  res.status(201).json({ message: `${created.length} time slots created`, timeSlots: created });
});

module.exports = {
  createTimeSlot,
  listTimeSlots,
  updateTimeSlot,
  deleteTimeSlot,
  seedDefaultTimeSlots,
};