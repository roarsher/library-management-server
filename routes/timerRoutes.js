 const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const { resolveTenant } = require('../middleware/tenantMiddleware');
const {
  getMyTimer,
  startTimer,
  pauseTimer,
  resetTimer,
} = require('../controllers/timerController');

router.use(protect, resolveTenant, restrictTo('student'));

router.get('/me', getMyTimer);
router.post('/start', startTimer);
router.post('/pause', pauseTimer);
router.post('/reset', resetTimer);

module.exports = router;