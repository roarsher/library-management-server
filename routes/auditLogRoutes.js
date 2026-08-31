const express = require('express');
const router = express.Router();
const { listAuditLogs } = require('../controllers/auditLogController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const { resolveTenant } = require('../middleware/tenantMiddleware');

router.use(protect, resolveTenant, restrictTo('admin', 'superadmin'));

router.get('/', listAuditLogs);

module.exports = router;
