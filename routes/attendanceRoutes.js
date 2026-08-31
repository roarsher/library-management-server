 const express = require('express');
const router = express.Router();
const {
  checkIn,
  checkOut,
  getTodayAttendance,
  getMyAttendance,
  generateGateToken,
  scanAttendance,
} = require('../controllers/attendanceController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const { resolveTenant } = require('../middleware/tenantMiddleware');

router.use(protect, resolveTenant);

router.post('/check-in', restrictTo('student'), checkIn);
router.post('/check-out', restrictTo('student'), checkOut);
router.post('/scan', restrictTo('student'), scanAttendance);
router.get('/me', restrictTo('student'), getMyAttendance);
router.get('/today', restrictTo('admin', 'superadmin'), getTodayAttendance);
router.get('/gate-token', restrictTo('admin', 'superadmin'), generateGateToken);

module.exports = router;