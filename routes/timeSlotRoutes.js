 const express = require('express');
const router = express.Router();
const {
  createTimeSlot,
  listTimeSlots,
  updateTimeSlot,
  deleteTimeSlot,
  seedDefaultTimeSlots,
} = require('../controllers/timeSlotController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const { resolveTenant } = require('../middleware/tenantMiddleware');

router.use(protect, resolveTenant);

router.get('/', listTimeSlots);
router.post('/', restrictTo('admin', 'superadmin'), createTimeSlot);
router.post('/seed-defaults', restrictTo('admin', 'superadmin'), seedDefaultTimeSlots);
router.put('/:id', restrictTo('admin', 'superadmin'), updateTimeSlot);
router.delete('/:id', restrictTo('admin', 'superadmin'), deleteTimeSlot);

module.exports = router;