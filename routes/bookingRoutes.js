const express = require('express');
const router = express.Router();
const {
  lockSeat,
  releaseSeat,
  createBooking,
  listBookings,
  approveBooking,
  rejectBooking,
} = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const { resolveTenant } = require('../middleware/tenantMiddleware');
const { /* ...existing, */ adminEditBooking } = require('../controllers/bookingController');

router.use(protect, resolveTenant);

router.post('/lock-seat', restrictTo('student'), lockSeat);
router.post('/release-seat', restrictTo('student'), releaseSeat);
router.post('/', restrictTo('student'), createBooking);
router.get('/', listBookings); // student sees own, admin sees all (handled in controller)
router.put('/:id/approve', restrictTo('admin', 'superadmin'), approveBooking);
router.put('/:id/reject', restrictTo('admin', 'superadmin'), rejectBooking);


router.put('/:id/admin-edit', restrictTo('admin', 'superadmin'), adminEditBooking);
module.exports = router;
