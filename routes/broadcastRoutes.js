const express = require('express');
const router = express.Router();
const { sendWhatsAppBroadcast, listBroadcasts } = require('../controllers/broadcastController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const { resolveTenant } = require('../middleware/tenantMiddleware');

router.use(protect, resolveTenant, restrictTo('admin', 'superadmin'));

router.post('/whatsapp', sendWhatsAppBroadcast);
router.get('/', listBroadcasts);

module.exports = router;
