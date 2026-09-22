 const express = require('express');
const router = express.Router();
const {
  lockSeat,
  releaseSeat,
  createBooking,
  listBookings,
  approveBooking,
  verifyAndApproveBooking,
  rejectBooking,
  assignSeatToStudent,
} = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const { resolveTenant } = require('../middleware/tenantMiddleware');
const { adminEditBooking } = require('../controllers/bookingController');

router.use(protect, resolveTenant);

router.post('/lock-seat', restrictTo('student'), lockSeat);
router.post('/release-seat', restrictTo('student'), releaseSeat);
router.post('/', restrictTo('student'), createBooking);
router.get('/', listBookings);
router.put('/:id/approve', restrictTo('admin', 'superadmin'), approveBooking);
router.put('/:id/reject', restrictTo('admin', 'superadmin'), rejectBooking);
router.put('/:id/verify-and-approve', restrictTo('admin', 'superadmin'), verifyAndApproveBooking);
router.put('/:id/admin-edit', restrictTo('admin', 'superadmin'), adminEditBooking);
router.post('/assign', restrictTo('admin', 'superadmin'), assignSeatToStudent);

module.exports = router;