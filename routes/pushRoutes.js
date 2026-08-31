// server/routes/pushRoutes.js
const express = require('express');
const router = express.Router();
const { getVapidPublicKey, subscribe, unsubscribe } = require('../controllers/pushController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const { resolveTenant } = require('../middleware/tenantMiddleware');

router.use(protect, resolveTenant);

router.get('/vapid-public-key', getVapidPublicKey);
router.post('/subscribe', restrictTo('student'), subscribe);
router.post('/unsubscribe', restrictTo('student'), unsubscribe);

module.exports = router;
