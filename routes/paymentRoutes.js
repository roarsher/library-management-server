 const express = require('express');

const router = express.Router();

const {
  createRazorpayOrder,
  verifyRazorpayPayment,
  submitManualPayment,
  verifyManualPayment,
  listPendingManualPayments,
  listAllPayments,
  getMyPaymentHistory,
  listPaymentsDue,
} = require('../controllers/paymentController');

const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const { resolveTenant } = require('../middleware/tenantMiddleware');

router.use(protect, resolveTenant);

// Student payment routes
router.post(
  '/razorpay/create-order',
  restrictTo('student'),
  createRazorpayOrder
);

router.post(
  '/razorpay/verify',
  restrictTo('student'),
  verifyRazorpayPayment
);

router.post(
  '/manual',
  restrictTo('student'),
  submitManualPayment
);

router.get(
  '/me',
  restrictTo('student'),
  getMyPaymentHistory
);

// Admin payment routes
router.get(
  '/pending-manual',
  restrictTo('admin', 'superadmin'),
  listPendingManualPayments
);

router.get(
  '/',
  restrictTo('admin', 'superadmin'),
  listAllPayments
);

router.put(
  '/:id/verify-manual',
  restrictTo('admin', 'superadmin'),
  verifyManualPayment
);
router.get('/due', restrictTo('admin', 'superadmin'), listPaymentsDue);

module.exports = router;