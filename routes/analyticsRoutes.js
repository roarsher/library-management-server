const express = require('express');
const router = express.Router();
const {
  getAttendanceHeatmap,
  getSlotOccupancy,
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const { resolveTenant } = require('../middleware/tenantMiddleware');

router.use(protect, resolveTenant, restrictTo('admin', 'superadmin'));

router.get('/attendance-heatmap', getAttendanceHeatmap);
router.get('/slot-occupancy', getSlotOccupancy);

module.exports = router;
