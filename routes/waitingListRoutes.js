const express = require('express');
const router = express.Router();
const {
  joinWaitingList,
  getMyWaitingList,
  leaveWaitingList,
} = require('../controllers/waitingListController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const { resolveTenant } = require('../middleware/tenantMiddleware');

router.use(protect, resolveTenant, restrictTo('student'));

router.post('/', joinWaitingList);
router.get('/me', getMyWaitingList);
router.delete('/:id', leaveWaitingList);

module.exports = router;
