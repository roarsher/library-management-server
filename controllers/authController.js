const asyncHandler = require('../utils/asyncHandler');
const generateToken = require('../utils/generateToken');
const generateOtp = require('../utils/generateOtp');
const { User, OtpVerification } = require('../models');
const { sendOtpEmail } = require('../services/emailService');

// @desc    Send OTP to email for signup
// @route   POST /api/auth/send-otp
// @access  Public
const sendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: 'Email is already registered' });
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  // invalidate any previous unused OTPs for this email/purpose
  await OtpVerification.deleteMany({ email, purpose: 'signup' });
  await OtpVerification.create({ email, otp, purpose: 'signup', expiresAt });

  await sendOtpEmail(email, otp);

  res.status(200).json({ message: 'OTP sent to email' });
});

// @desc    Verify OTP and complete registration
// @route   POST /api/auth/verify-otp-register
// @access  Public
const verifyOtpAndRegister = asyncHandler(async (req, res) => {
  const { email, otp, name, password, phone, libraryId } = req.body;

  const record = await OtpVerification.findOne({
    email,
    otp,
    purpose: 'signup',
    isUsed: false,
  });

  if (!record) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }

  if (record.expiresAt < new Date()) {
    return res.status(400).json({ message: 'OTP has expired, please request a new one' });
  }

  const user = await User.create({
    name,
    email,
    password,
    phone,
    role: 'student',
    libraryId,
    isEmailVerified: true,
  });

  record.isUsed = true;
  await record.save();

  const token = generateToken(user._id, user.role, user.libraryId);

  res.status(201).json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      libraryId: user.libraryId,
    },
  });
});

// @desc    Login with email and password
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  if (!user.isActive) {
    return res.status(403).json({ message: 'Account is deactivated. Contact admin.' });
  }

  user.lastLoginAt = new Date();
  await user.save();

  // role (student/admin/superadmin) comes straight from user.role —
  // there is no separate admin login route, admin access is just a role flag
  const token = generateToken(user._id, user.role, user.libraryId);

  res.status(200).json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      libraryId: user.libraryId,
    },
  });
});

// @desc    Get currently logged-in user
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({ user: req.user });
});

// @desc    Change a user's role (used to promote a student to admin)
// @route   PUT /api/auth/users/:id/role
// @access  Private (superadmin only)
const changeUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['student', 'admin', 'superadmin'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  user.role = role;
  await user.save();

  res.status(200).json({ message: `User role updated to ${role}`, user });
});

module.exports = { sendOtp, verifyOtpAndRegister, login, getMe, changeUserRole };
