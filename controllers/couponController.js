const asyncHandler = require('../utils/asyncHandler');
const { Coupon, Student } = require('../models');

const generateCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars (0/O, 1/I)
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

// @desc    Admin creates a new discount coupon
// @route   POST /api/coupons
// @access  Private (admin)
const createCoupon = asyncHandler(async (req, res) => {
  const { discountPercent, expiresAt } = req.body;
  if (![10, 15, 20, 25].includes(Number(discountPercent))) {
    return res.status(400).json({ message: 'discountPercent must be 10, 15, 20, or 25' });
  }

  let code;
  let exists = true;
  while (exists) {
    code = generateCode();
    exists = await Coupon.findOne({ libraryId: req.libraryId, code });
  }

  const coupon = await Coupon.create({
    libraryId: req.libraryId,
    code,
    discountPercent,
    createdBy: req.user._id,
    expiresAt: expiresAt || undefined,
  });

  res.status(201).json({ coupon });
});

// @desc    Admin lists all coupons (used and unused)
// @route   GET /api/coupons
// @access  Private (admin)
const listCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find({ libraryId: req.libraryId })
    .populate({ path: 'usedBy', populate: { path: 'userId', select: 'name' } })
    .sort({ createdAt: -1 });
  res.status(200).json({ coupons });
});

// @desc    Student/admin checks if a coupon code is valid and unused —
//          does NOT consume it, only previews the discount.
// @route   GET /api/coupons/validate/:code
// @access  Private (student or admin)
const validateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findOne({
    libraryId: req.libraryId,
    code: req.params.code.toUpperCase(),
    isActive: true,
    usedBy: null,
  });

  if (!coupon) {
    return res.status(404).json({ message: 'Invalid or already-used coupon code' });
  }
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return res.status(400).json({ message: 'This coupon has expired' });
  }

  res.status(200).json({ valid: true, discountPercent: coupon.discountPercent });
});

module.exports = { createCoupon, listCoupons, validateCoupon };