 
const express = require('express');
const router = express.Router();
const {
  submitAdmissionForm,
  getMyProfile,
  updateMyProfile,
  listStudents,
  getStudentById,
  verifyAdmission,
  updateStudent,
  deleteStudent,
  listBirthdaysThisWeek,
} = require('../controllers/studentController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const { resolveTenant } = require('../middleware/tenantMiddleware');
const { auditAction } = require('../middleware/auditMiddleware');
const { adminCreateStudent } = require('../controllers/adminStudentController');

router.use(protect, resolveTenant);

router.post('/admission', restrictTo('student'), submitAdmissionForm);
router.get('/me', restrictTo('student'), getMyProfile);
router.put('/me', restrictTo('student'), updateMyProfile);
router.get('/birthdays-this-week', restrictTo('admin', 'superadmin'), listBirthdaysThisWeek);

router.get('/', restrictTo('admin', 'superadmin'), listStudents);
router.get('/:id', restrictTo('admin', 'superadmin'), getStudentById);
router.post('/admin-create', restrictTo('admin', 'superadmin'), adminCreateStudent);
router.put(
  '/:id/verify',
  restrictTo('admin', 'superadmin'),
  auditAction('Student', 'update'),
  verifyAdmission
);
router.put(
  '/:id',
  restrictTo('admin', 'superadmin'),
  auditAction('Student', 'update'),
  updateStudent
);
router.delete(
  '/:id',
  restrictTo('admin', 'superadmin'),
  auditAction('Student', 'delete'),
  deleteStudent
);

module.exports = router;