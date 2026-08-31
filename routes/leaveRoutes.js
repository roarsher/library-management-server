const express = require('express');
const router = express.Router();
 

const {
  submitLeaveRequest,
  listLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
  listCurrentlyOnLeave,
} = require('../controllers/leaveController');

// ...existing router.use(protect, resolveTenant) unchanged...


// must be registered before '/:id/approve' etc. isn't an issue here since
// there's no bare '/:id' route in this file — but keep it above any future one


const { protect } = require('../middleware/authMiddleware');  // het
const { restrictTo } = require('../middleware/roleMiddleware');
const { resolveTenant } = require('../middleware/tenantMiddleware');

router.use(protect, resolveTenant);

router.post('/', restrictTo('student'), submitLeaveRequest);
router.get('/', listLeaveRequests); // student sees own, admin sees all
router.put('/:id/approve', restrictTo('admin', 'superadmin'), approveLeaveRequest);
router.put('/:id/reject', restrictTo('admin', 'superadmin'), rejectLeaveRequest);
router.get('/on-leave', restrictTo('admin', 'superadmin'), listCurrentlyOnLeave);

module.exports = router;
