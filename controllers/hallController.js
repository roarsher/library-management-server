const asyncHandler = require('../utils/asyncHandler');
const { Hall, Seat } = require('../models');

// @desc    Admin creates a hall (e.g. "Hall 1", "Hall 2")
// @route   POST /api/halls
// @access  Private (admin)
const createHall = asyncHandler(async (req, res) => {
  const { name, hallNumber, description } = req.body;

  const hall = await Hall.create({
    libraryId: req.libraryId,
    name,
    hallNumber,
    description,
  });

  res.status(201).json({ hall });
});

// @desc    List all halls for the library, with live seat counts
// @route   GET /api/halls
// @access  Private
const listHalls = asyncHandler(async (req, res) => {
  const halls = await Hall.find({ libraryId: req.libraryId, isActive: true }).sort({
    hallNumber: 1,
  });

  // attach live counts rather than trusting the denormalized totalSeats blindly
  const hallsWithCounts = await Promise.all(
    halls.map(async (hall) => {
      const totalSeats = await Seat.countDocuments({ hallId: hall._id, isActive: true });
      const bookedSeats = await Seat.countDocuments({
        hallId: hall._id,
        isActive: true,
        status: 'booked',
      });
      return { ...hall.toObject(), totalSeats, bookedSeats };
    })
  );

  res.status(200).json({ halls: hallsWithCounts });
});

// @desc    Admin renames a hall or changes its hall number
// @route   PUT /api/halls/:id
// @access  Private (admin)
const updateHall = asyncHandler(async (req, res) => {
  const hall = await Hall.findOne({ _id: req.params.id, libraryId: req.libraryId });
  if (!hall) {
    return res.status(404).json({ message: 'Hall not found' });
  }

  const fields = ['name', 'hallNumber', 'description', 'isActive'];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) hall[f] = req.body[f];
  });

  await hall.save();
  res.status(200).json({ hall });
});

// @desc    Admin deletes a hall — blocked if seats still exist under it
// @route   DELETE /api/halls/:id
// @access  Private (admin)
const deleteHall = asyncHandler(async (req, res) => {
  const seatCount = await Seat.countDocuments({ hallId: req.params.id });
  if (seatCount > 0) {
    return res.status(400).json({
      message: `Cannot delete hall — ${seatCount} seat(s) still assigned to it. Remove or reassign seats first.`,
    });
  }

  const hall = await Hall.findOneAndDelete({ _id: req.params.id, libraryId: req.libraryId });
  if (!hall) {
    return res.status(404).json({ message: 'Hall not found' });
  }

  res.status(200).json({ message: 'Hall deleted' });
});

module.exports = { createHall, listHalls, updateHall, deleteHall };
