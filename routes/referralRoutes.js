const express = require('express');
const router = express.Router();
const {
  getMyReferralCode,
  redeemReferralCode,
  getMyReferrals,
} = require('../controllers/referralController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const { resolveTenant } = require('../middleware/tenantMiddleware');

router.use(protect, resolveTenant, restrictTo('student'));

router.get('/my-code', getMyReferralCode);
router.post('/redeem', redeemReferralCode);
router.get('/me', getMyReferrals);

module.exports = router;
