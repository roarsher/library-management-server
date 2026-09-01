const asyncHandler = require('../utils/asyncHandler');
 const { Student, User, SeatBooking } = require('../models');

// @desc    Submit/update admission form (student's own profile)
// @route   POST /api/students/admission
// @access  Private (student)
const submitAdmissionForm = asyncHandler(async (req, res) => {
  const {
    dob,
    gender,
    bloodGroup,
    aadhaarNumber,
    parentDetails,
    address,
    qualification,
    preparingFor,
    photoUrl,
    idProofUrl,
  } = req.body;

  const existing = await Student.findOne({ userId: req.user._id });
  if (existing) {
    return res.status(400).json({ message: 'Admission form already submitted' });
  }

  const student = await Student.create({
    userId: req.user._id,
    libraryId: req.libraryId,
    dob,
    gender,
    bloodGroup,
    aadhaarNumber,
    parentDetails,
    address,
    qualification,
    preparingFor,
    photoUrl,
    idProofUrl,
    admissionStatus: 'pending',
  });

  res.status(201).json({ student });
});

// @desc    Get logged-in student's own profile
// @route   GET /api/students/me
// @access  Private (student)
const getMyProfile = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id }).populate(
    'userId',
    'name email phone'
  );
  if (!student) {
    return res.status(404).json({ message: 'Student profile not found' });
  }
  res.status(200).json({ student });
});

// @desc    List all students in the library (with optional status filter)
// @route   GET /api/students?status=pending
// @access  Private (admin)
const listStudents = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const filter = { libraryId: req.libraryId };
  if (status) filter.admissionStatus = status;

  let query = Student.find(filter).populate('userId', 'name email phone isActive');

  const students = await query.sort({ createdAt: -1 });

  const filtered = search
    ? students.filter((s) =>
        s.userId?.name?.toLowerCase().includes(search.toLowerCase())
      )
    : students;

  res.status(200).json({ count: filtered.length, students: filtered });
});

// @desc    Get single student by id
// @route   GET /api/students/:id
// @access  Private (admin)
const getStudentById = asyncHandler(async (req, res) => {
  const student = await Student.findOne({
    _id: req.params.id,
    libraryId: req.libraryId,
  }).populate('userId', 'name email phone isActive');

  if (!student) {
    return res.status(404).json({ message: 'Student not found' });
  }
  res.status(200).json({ student });
});

// @desc    Approve or reject admission
// @route   PUT /api/students/:id/verify
// @access  Private (admin)
const verifyAdmission = asyncHandler(async (req, res) => {
  const { decision, rejectionReason } = req.body; // decision: 'verified' | 'rejected'

  if (!['verified', 'rejected'].includes(decision)) {
    return res.status(400).json({ message: 'decision must be verified or rejected' });
  }

  const student = await Student.findOne({ _id: req.params.id, libraryId: req.libraryId });
  if (!student) {
    return res.status(404).json({ message: 'Student not found' });
  }

  req.auditBefore = student.toObject();

  student.admissionStatus = decision;
  student.verifiedBy = req.user._id;
  student.verifiedAt = new Date();
  if (decision === 'rejected') student.rejectionReason = rejectionReason;

  await student.save();
  req.auditAfter = student.toObject();

  res.status(200).json({ message: `Admission ${decision}`, student });
});

// @desc    Student updates their own profile (limited fields, no admission status changes)
// @route   PUT /api/students/me
// @access  Private (student)
const updateMyProfile = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });
  if (!student) {
    return res.status(404).json({ message: 'Student profile not found' });
  }

  const updatableFields = [
    'bloodGroup',
    'address',
    'qualification',
    'preparingFor',
    'photoUrl',
    'idProofUrl',
  ];
  updatableFields.forEach((field) => {
    if (req.body[field] !== undefined) student[field] = req.body[field];
  });

  await student.save();
  res.status(200).json({ student });
});

// @desc    Admin updates any field of a student's record
// @route   PUT /api/students/:id
// @access  Private (admin)
const updateStudent = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ _id: req.params.id, libraryId: req.libraryId });
  if (!student) {
    return res.status(404).json({ message: 'Student not found' });
  }

  req.auditBefore = student.toObject();

  const updatableFields = [
    'dob',
    'gender',
    'bloodGroup',
    'aadhaarNumber',
    'parentDetails',
    'address',
    'qualification',
    'preparingFor',
    'photoUrl',
    'idProofUrl',
  ];
  updatableFields.forEach((field) => {
    if (req.body[field] !== undefined) student[field] = req.body[field];
  });

  await student.save();
  req.auditAfter = student.toObject();

  res.status(200).json({ message: 'Student updated', student });
});

// @desc    Admin deletes a student record entirely
// @route   DELETE /api/students/:id
// @access  Private (admin)
 // @desc    Admin deletes a student record entirely
// @route   DELETE /api/students/:id
// @access  Private (admin)
const deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findOne({
    _id: req.params.id,
    libraryId: req.libraryId,
  });

  if (!student) {
    return res.status(404).json({ message: 'Student not found' });
  }

  req.auditBefore = student.toObject();
  req.auditTargetId = student._id;

  // Cancel all active/pending/on-leave bookings
  // so the student's seat becomes available immediately.
  await SeatBooking.updateMany(
    {
      studentId: student._id,
      status: {
        $in: ['pending_approval', 'active', 'on_leave'],
      },
    },
    {
      $set: {
        status: 'cancelled',
        rejectionReason: 'Student account deleted',
      },
    }
  );

  // Delete the associated user account
  await User.findByIdAndDelete(student.userId);

  // Delete the student record
  await student.deleteOne();

  req.auditAfter = { deleted: true };

  res.status(200).json({
    message: 'Student deleted',
  });
});

// @desc    Students with a birthday in the next 7 days
// @route   GET /api/students/birthdays-this-week
// @access  Private (admin)
const listBirthdaysThisWeek = asyncHandler(async (req, res) => {
  const students = await Student.find({ libraryId: req.libraryId, dob: { $exists: true } })
    .populate('userId', 'name phone email');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const toDayOfYear = (d) => {
    const start = new Date(d.getFullYear(), 0, 0);
    return Math.floor((d - start) / (1000 * 60 * 60 * 24));
  };
  const todayDoY = toDayOfYear(today);

  const upcoming = students.filter((s) => {
    const dob = new Date(s.dob);
    const thisYearBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
    let diff = toDayOfYear(thisYearBirthday) - todayDoY;
    if (diff < 0) diff += 365;
    return diff >= 0 && diff <= 7;
  });

  res.status(200).json({ count: upcoming.length, students: upcoming });
});

module.exports = {
  submitAdmissionForm,
  getMyProfile,
  updateMyProfile,
  listStudents,
  getStudentById,
  verifyAdmission,
  updateStudent,
  deleteStudent,
  listBirthdaysThisWeek, // add
};
 
