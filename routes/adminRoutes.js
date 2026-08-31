const express = require('express');
const router = express.Router();
const { getDashboardSummary } = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const { resolveTenant } = require('../middleware/tenantMiddleware');

router.use(protect, resolveTenant, restrictTo('admin', 'superadmin'));

router.get('/dashboard', getDashboardSummary);

module.exports = router;
