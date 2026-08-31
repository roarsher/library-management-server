const asyncHandler = require('../utils/asyncHandler');
const { Referral, Student } = require('../models');

const DEFAULT_REWARD_VALUE = 100; // flat discount amount, configurable per library later

// @desc    Get/generate the logged-in student's referral code
// @route   GET /api/referrals/my-code
// @access  Private (student)
const getMyReferralCode = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });
  // Simple deterministic code from student id — swap for a nicer short-code scheme if desired
  const code = `REF-${student._id.toString().slice(-6).toUpperCase()}`;
  res.status(200).json({ referralCode: code });
});

// @desc    Record a referral when a new student signs up using a code
// @route   POST /api/referrals/redeem
// @access  Private (student, called right after their own registration)
const redeemReferralCode = asyncHandler(async (req, res) => {
  const { referralCode } = req.body;

  const referrerShortId = referralCode?.replace('REF-', '').toLowerCase();
  if (!referrerShortId) {
    return res.status(400).json({ message: 'Invalid referral code' });
  }

  const referrer = await Student.findOne({
    libraryId: req.libraryId,
    _id: { $regex: `${referrerShortId}$`, $options: 'i' },
  });
  if (!referrer) {
    return res.status(404).json({ message: 'Referral code not found' });
  }

  const referee = await Student.findOne({ userId: req.user._id });
  if (referrer._id.equals(referee._id)) {
    return res.status(400).json({ message: 'Cannot refer yourself' });
  }

  const referral = await Referral.create({
    libraryId: req.libraryId,
    referrerId: referrer._id,
    refereeId: referee._id,
    referralCode,
    rewardType: 'discount_flat',
    rewardValue: DEFAULT_REWARD_VALUE,
    status: 'pending',
  });

  referee.referredBy = referrer._id;
  await referee.save();

  res.status(201).json({ referral });
});

// @desc    Called once referee's first payment is verified — applies rewards to both sides
// @route   Internal, invoked from paymentController after manual/razorpay verification
const completeReferralReward = async (refereeStudentId) => {
  const referral = await Referral.findOne({ refereeId: refereeStudentId, status: 'pending' });
  if (!referral) return null;

  referral.status = 'completed';
  referral.rewardAppliedToReferrer = true;
  referral.rewardAppliedToReferee = true;
  await referral.save();

  // Actual discount application happens wherever the next payment/invoice
  // is calculated — this just marks the reward as earned/available.
  return referral;
};

// @desc    Student's own referral history
// @route   GET /api/referrals/me
// @access  Private (student)
const getMyReferrals = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });
  const referrals = await Referral.find({ referrerId: student._id }).sort({ createdAt: -1 });
  res.status(200).json({ referrals });
});

module.exports = {
  getMyReferralCode,
  redeemReferralCode,
  completeReferralReward,
  getMyReferrals,
};
