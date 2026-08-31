 const express = require('express');

const router = express.Router();

const {
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
} = require('../controllers/seatController');

const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const { resolveTenant } = require('../middleware/tenantMiddleware');

router.use(protect, resolveTenant);

// Any authenticated role can view the seat grid
router.get('/', getSeatGrid);

// Admin seat occupancy
router.get(
  '/occupancy',
  restrictTo('admin', 'superadmin'),
  getSeatOccupancy
);

// Get bookings for a particular seat
// IMPORTANT: Keep this BEFORE router.put('/:id')
router.get(
  '/:id/bookings',
  restrictTo('admin', 'superadmin'),
  getSeatBookings
);

// Create a single seat
router.post(
  '/',
  restrictTo('admin', 'superadmin'),
  createSeat
);

// Bulk generate seats
router.post(
  '/bulk-generate',
  restrictTo('admin', 'superadmin'),
  bulkGenerateSeats
);

// Bulk create seats
router.post(
  '/bulk',
  restrictTo('admin', 'superadmin'),
  bulkCreateSeats
);

// Update seat
router.put(
  '/:id',
  restrictTo('admin', 'superadmin'),
  updateSeat
);

// Toggle seat active/inactive
router.put(
  '/:id/toggle-active',
  restrictTo('admin', 'superadmin'),
  toggleSeatActive
);

// Delete seat
router.delete(
  '/:id',
  restrictTo('admin', 'superadmin'),
  deleteSeat
);

// Student favorite seat
router.put(
  '/:id/favorite',
  restrictTo('student'),
  toggleFavoriteSeat
);

module.exports = router;