const express = require('express');
const router = express.Router();
const { createHall, listHalls, updateHall, deleteHall } = require('../controllers/hallController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const { resolveTenant } = require('../middleware/tenantMiddleware');

router.use(protect, resolveTenant);

router.get('/', listHalls); // any authenticated role can view halls
router.post('/', restrictTo('admin', 'superadmin'), createHall);
router.put('/:id', restrictTo('admin', 'superadmin'), updateHall);
router.delete('/:id', restrictTo('admin', 'superadmin'), deleteHall);

module.exports = router;
