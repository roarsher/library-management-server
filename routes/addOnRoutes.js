const express = require('express');
const router = express.Router();
const {
  createAddOn,
  listAddOns,
  updateAddOn,
  deleteAddOn,
} = require('../controllers/addOnController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const { resolveTenant } = require('../middleware/tenantMiddleware');

router.use(protect, resolveTenant);

router.get('/', listAddOns);
router.post('/', restrictTo('admin', 'superadmin'), createAddOn);
router.put('/:id', restrictTo('admin', 'superadmin'), updateAddOn);
router.delete('/:id', restrictTo('admin', 'superadmin'), deleteAddOn);

module.exports = router;
