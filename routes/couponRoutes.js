const express = require('express');
const router = express.Router();
const { createCoupon, listCoupons, validateCoupon } = require('../controllers/couponController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const { resolveTenant } = require('../middleware/tenantMiddleware');

router.use(protect, resolveTenant);

router.post('/', restrictTo('admin', 'superadmin'), createCoupon);
router.get('/', restrictTo('admin', 'superadmin'), listCoupons);
router.get('/validate/:code', validateCoupon); // any authenticated role — student needs this at checkout

module.exports = router;