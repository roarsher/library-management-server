const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const { Attendance, TimeSlot, SeatBooking, Seat } = require('../models');

// @desc    Attendance heatmap data — check-ins grouped by day-of-week and hour
// @route   GET /api/analytics/attendance-heatmap
// @access  Private (admin)
const getAttendanceHeatmap = asyncHandler(async (req, res) => {
  const libraryId = new mongoose.Types.ObjectId(req.libraryId);
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // last 30 days

  const data = await Attendance.aggregate([
    { $match: { libraryId, checkInAt: { $gte: since } } },
    {
      $group: {
        _id: {
          dayOfWeek: { $dayOfWeek: '$checkInAt' }, // 1 (Sun) - 7 (Sat)
          hour: { $hour: '$checkInAt' },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.dayOfWeek': 1, '_id.hour': 1 } },
  ]);

  res.status(200).json({ heatmap: data });
});

// @desc    Occupancy per time slot — surfaces under-utilized slots for pricing decisions
// @route   GET /api/analytics/slot-occupancy
// @access  Private (admin)
const getSlotOccupancy = asyncHandler(async (req, res) => {
  const libraryId = req.libraryId;

  const slots = await TimeSlot.find({ libraryId, isActive: true });
  const totalSeats = await Seat.countDocuments({ libraryId, isActive: true });

  const results = await Promise.all(
    slots.map(async (slot) => {
      const activeBookings = await SeatBooking.countDocuments({
        libraryId,
        timeSlotId: slot._id,
        status: { $in: ['active', 'pending_approval'] },
      });

      const occupancyRate = totalSeats > 0 ? Math.round((activeBookings / totalSeats) * 100) : 0;

      return {
        timeSlotId: slot._id,
        label: slot.label,
        startTime: slot.startTime,
        endTime: slot.endTime,
        activeBookings,
        totalSeats,
        occupancyRate,
        // Simple heuristic insight — refine with real pricing rules as needed
        insight:
          occupancyRate < 40
            ? 'Low occupancy — consider a discount to fill this slot'
            : occupancyRate > 85
            ? 'High demand — consider a premium or waitlist-only booking'
            : 'Healthy occupancy',
      };
    })
  );

  res.status(200).json({ slotOccupancy: results });
});

module.exports = { getAttendanceHeatmap, getSlotOccupancy };
