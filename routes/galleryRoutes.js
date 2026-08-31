const express = require('express');
const router = express.Router();
const {
  createGallery,
  listGalleries,
  getGalleryDetail,
  addGalleryImages,
  deleteGallery,
  deleteGalleryImage,
} = require('../controllers/galleryController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const { resolveTenant } = require('../middleware/tenantMiddleware');

// Public browsing (homepage gallery) — no auth required
router.get('/', resolveTenantFromQuery, listGalleries);
router.get('/:id', resolveTenantFromQuery, getGalleryDetail);

// Admin management — requires auth
router.post('/', protect, resolveTenant, restrictTo('admin', 'superadmin'), createGallery);
router.post(
  '/:id/images',
  protect,
  resolveTenant,
  restrictTo('admin', 'superadmin'),
  addGalleryImages
);
router.delete('/:id', protect, resolveTenant, restrictTo('admin', 'superadmin'), deleteGallery);
router.delete(
  '/images/:imageId',
  protect,
  resolveTenant,
  restrictTo('admin', 'superadmin'),
  deleteGalleryImage
);

// Lightweight tenant resolver for public routes (library selected via query/subdomain)
function resolveTenantFromQuery(req, res, next) {
  req.libraryId = req.query.libraryId;
  if (!req.libraryId) {
    return res.status(400).json({ message: 'libraryId query param is required' });
  }
  next();
}

module.exports = router;
