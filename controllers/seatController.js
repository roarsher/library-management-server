 const asyncHandler = require('../utils/asyncHandler');
const { Seat, Hall, Student, SeatBooking } = require('../models');
const { isSeatAvailable } = require('../utils/seatAvailability');

// @desc    Admin creates a single seat under a hall
// @route   POST /api/seats
// @access  Private (admin)
const createSeat = asyncHandler(async (req, res) => {
  const { hallId, seatNumber } = req.body;

  const hall = await Hall.findOne({
    _id: hallId,
    libraryId: req.libraryId,
  });

  if (!hall) {
    return res.status(404).json({ message: 'Hall not found' });
  }

  const seat = await Seat.create({
    libraryId: req.libraryId,
    hallId,
    seatNumber,
  });

  hall.totalSeats += 1;
  await hall.save();

  res.status(201).json({ seat });
});

// @desc    Admin bulk-generates seats for a hall
// @route   POST /api/seats/bulk-generate
// @access  Private (admin)
const bulkGenerateSeats = asyncHandler(async (req, res) => {
  const {
    hallId,
    count,
    startNumber = 1,
    prefix = '',
  } = req.body;

  const hall = await Hall.findOne({
    _id: hallId,
    libraryId: req.libraryId,
  });

  if (!hall) {
    return res.status(404).json({ message: 'Hall not found' });
  }

  if (!count || count <= 0) {
    return res.status(400).json({
      message: 'count must be a positive number',
    });
  }

  const docs = [];

  for (let i = 0; i < count; i++) {
    docs.push({
      libraryId: req.libraryId,
      hallId,
      seatNumber: `${prefix}${startNumber + i}`,
    });
  }

  const created = await Seat.insertMany(docs, {
    ordered: false,
  });

  hall.totalSeats += created.length;
  await hall.save();

  res.status(201).json({
    count: created.length,
    seats: created,
  });
});

// @desc    Admin bulk-creates seats with explicit custom numbers
// @route   POST /api/seats/bulk
// @access  Private (admin)
const bulkCreateSeats = asyncHandler(async (req, res) => {
  const { hallId, seatNumbers } = req.body;

  if (!Array.isArray(seatNumbers) || seatNumbers.length === 0) {
    return res.status(400).json({
      message: 'seatNumbers array is required',
    });
  }

  const hall = await Hall.findOne({
    _id: hallId,
    libraryId: req.libraryId,
  });

  if (!hall) {
    return res.status(404).json({
      message: 'Hall not found',
    });
  }

  const docs = seatNumbers.map((seatNumber) => ({
    libraryId: req.libraryId,
    hallId,
    seatNumber,
  }));

  const created = await Seat.insertMany(docs, {
    ordered: false,
  });

  hall.totalSeats += created.length;
  await hall.save();

  res.status(201).json({
    count: created.length,
    seats: created,
  });
});

// @desc    Get the seat grid for one hall
// @route   GET /api/seats?hallId=...&timeSlotId=...&startDate=...&durationMonths=...
// @access  Private
const getSeatGrid = asyncHandler(async (req, res) => {
  const {
    hallId,
    timeSlotId,
    startDate,
    durationMonths,
  } = req.query;

  const filter = {
    libraryId: req.libraryId,
    isActive: true,
  };

  if (hallId) {
    filter.hallId = hallId;
  }

  const seats = await Seat.find(filter)
    .populate('hallId', 'name hallNumber')
    .sort({ seatNumber: 1 });

  // No shift context given
  if (!timeSlotId || !startDate || !durationMonths) {
    return res.status(200).json({ seats });
  }

  const start = new Date(startDate);
  const end = new Date(start);

  end.setMonth(
    end.getMonth() + Number(durationMonths)
  );

  const seatsWithAvailability = await Promise.all(
    seats.map(async (seat) => {
      const result = await isSeatAvailable({
        seatId: seat._id,
        timeSlotId,
        startDate: start,
        endDate: end,
        libraryId: req.libraryId,
      });

      return {
        ...seat.toObject(),
        status: seat.isActive
          ? result.available
            ? 'available'
            : 'booked'
          : 'disabled',
      };
    })
  );

  res.status(200).json({
    seats: seatsWithAvailability,
  });
});

// @desc    Seat grid with occupancy counts
// @route   GET /api/seats/occupancy?hallId=...
// @access  Private (admin)
 // @desc    Seat grid with occupancy counts
// @route   GET /api/seats/occupancy?hallId=...
// @access  Private (admin)
const getSeatOccupancy = asyncHandler(async (req, res) => {
  const { hallId } = req.query;

  const filter = {
    libraryId: req.libraryId,
    isActive: true,
  };

  if (hallId) {
    filter.hallId = hallId;
  }

  const seats = await Seat.find(filter)
    .populate('hallId', 'name hallNumber')
    .sort({ seatNumber: 1 });

  const bookings = await SeatBooking.find({
    libraryId: req.libraryId,
    seatId: {
      $in: seats.map((s) => s._id),
    },
    status: {
      $in: [
        'pending_approval',
        'active',
        'on_leave',
      ],
    },
  }).select('seatId status');

  const countMap = new Map();
  const leaveSeatIds = new Set();

  bookings.forEach((booking) => {
    const key = booking.seatId.toString();

    countMap.set(
      key,
      (countMap.get(key) || 0) + 1
    );

    if (booking.status === 'on_leave') {
      leaveSeatIds.add(key);
    }
  });

  const seatsWithOccupancy = seats.map((seat) => ({
    ...seat.toObject(),

    activeBookingsCount:
      countMap.get(seat._id.toString()) || 0,

    hasStudentOnLeave:
      leaveSeatIds.has(seat._id.toString()),
  }));

  res.status(200).json({
    seats: seatsWithOccupancy,
  });
});

// @desc    List active bookings for one seat
// @route   GET /api/seats/:id/bookings
// @access  Private (admin)
const getSeatBookings = asyncHandler(async (req, res) => {
  const seat = await Seat.findOne({
    _id: req.params.id,
    libraryId: req.libraryId,
  });

  if (!seat) {
    return res.status(404).json({
      message: 'Seat not found',
    });
  }

  const bookings = await SeatBooking.find({
    seatId: seat._id,
    libraryId: req.libraryId,
    status: {
      $in: [
        'pending_approval',
        'active',
        'on_leave',
      ],
    },
  })
    .populate(
      'timeSlotId',
      'label segments'
    )
    .populate({
      path: 'studentId',
      populate: {
        path: 'userId',
        select: 'name phone',
      },
    })
    .sort({ startDate: 1 });

  res.status(200).json({
    seat,
    bookings,
  });
});

// @desc    Admin renumbers or reassigns a seat
// @route   PUT /api/seats/:id
// @access  Private (admin)
const updateSeat = asyncHandler(async (req, res) => {
  const { seatNumber, hallId } = req.body;

  const seat = await Seat.findOne({
    _id: req.params.id,
    libraryId: req.libraryId,
  });

  if (!seat) {
    return res.status(404).json({
      message: 'Seat not found',
    });
  }

  if (seatNumber !== undefined) {
    seat.seatNumber = seatNumber;
  }

  if (
    hallId !== undefined &&
    hallId !== seat.hallId.toString()
  ) {
    await Hall.findByIdAndUpdate(
      seat.hallId,
      {
        $inc: {
          totalSeats: -1,
        },
      }
    );

    await Hall.findByIdAndUpdate(
      hallId,
      {
        $inc: {
          totalSeats: 1,
        },
      }
    );

    seat.hallId = hallId;
  }

  await seat.save();

  res.status(200).json({ seat });
});

// @desc    Admin disables/enables a seat
// @route   PUT /api/seats/:id/toggle-active
// @access  Private (admin)
const toggleSeatActive = asyncHandler(async (req, res) => {
  const seat = await Seat.findOne({
    _id: req.params.id,
    libraryId: req.libraryId,
  });

  if (!seat) {
    return res.status(404).json({
      message: 'Seat not found',
    });
  }

  seat.isActive = !seat.isActive;

  await seat.save();

  res.status(200).json({
    message: `Seat ${
      seat.isActive ? 'enabled' : 'disabled'
    }`,
    seat,
  });
});

// @desc    Admin deletes a seat entirely
// @route   DELETE /api/seats/:id
// @access  Private (admin)
const deleteSeat = asyncHandler(async (req, res) => {
  const seat = await Seat.findOneAndDelete({
    _id: req.params.id,
    libraryId: req.libraryId,
  });

  if (!seat) {
    return res.status(404).json({
      message: 'Seat not found',
    });
  }

  await Hall.findByIdAndUpdate(
    seat.hallId,
    {
      $inc: {
        totalSeats: -1,
      },
    }
  );

  res.status(200).json({
    message: 'Seat deleted',
  });
});

// @desc    Student marks/unmarks a seat as favorite
// @route   PUT /api/seats/:id/favorite
// @access  Private (student)
const toggleFavoriteSeat = asyncHandler(async (req, res) => {
  const student = await Student.findOne({
    userId: req.user._id,
  });

  if (!student) {
    return res.status(404).json({
      message: 'Student profile not found',
    });
  }

  const seatId = req.params.id;

  student.favoriteSeatId =
    student.favoriteSeatId?.toString() === seatId
      ? null
      : seatId;

  await student.save();

  res.status(200).json({
    favoriteSeatId: student.favoriteSeatId,
  });
});

module.exports = {
  createSeat,
  bulkGenerateSeats,
  bulkCreateSeats,
  getSeatGrid,
  getSeatOccupancy,
  getSeatBookings,
  updateSeat,
  toggleSeatActive,
  deleteSeat,
  toggleFavoriteSeat,
};