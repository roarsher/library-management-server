const express = require('express');
const router = express.Router();
const {
  sendOtp,
  verifyOtpAndRegister,
  login,
  getMe,
  changeUserRole,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

router.post('/send-otp', sendOtp);
router.post('/verify-otp-register', verifyOtpAndRegister);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/users/:id/role', protect, restrictTo('superadmin'), changeUserRole);

module.exports = router;
