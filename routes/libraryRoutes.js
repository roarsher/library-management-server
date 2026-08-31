const express = require('express');
const router = express.Router();
const {
  onboardLibrary,
  getMyLibrary,
  updateMyLibrary,
  listAllLibraries,
  getPublicBranding,
} = require('../controllers/libraryController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const { resolveTenant } = require('../middleware/tenantMiddleware');

// Public — new library owner signs up their library
router.post('/onboard', onboardLibrary);

// Public — frontend fetches logo/name/theme before login, by domain or libraryId
router.get('/branding', getPublicBranding);

// Private — manage own library
router.get('/me', protect, resolveTenant, restrictTo('admin', 'superadmin'), getMyLibrary);
router.put('/me', protect, resolveTenant, restrictTo('admin', 'superadmin'), updateMyLibrary);

// Platform-level — superadmin only, not tenant-scoped
router.get('/', protect, restrictTo('superadmin'), listAllLibraries);

module.exports = router;
