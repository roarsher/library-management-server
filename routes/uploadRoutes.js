const express = require('express');
const router = express.Router();
const { uploadSingleFile, uploadMultipleFiles } = require('../controllers/uploadController');
const { upload } = require('../middleware/uploadMiddleware');
const { protect } = require('../middleware/authMiddleware');
const { resolveTenant } = require('../middleware/tenantMiddleware');

router.use(protect, resolveTenant);

router.post('/', upload.single('file'), uploadSingleFile);
router.post('/multiple', upload.array('files', 10), uploadMultipleFiles);

module.exports = router;
