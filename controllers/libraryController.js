const asyncHandler = require('../utils/asyncHandler');
const { Library, User } = require('../models');
const generateToken = require('../utils/generateToken');

// @desc    Register a new library (tenant) along with its owner admin account
// @route   POST /api/libraries/onboard
// @access  Public
const onboardLibrary = asyncHandler(async (req, res) => {
  const {
    libraryName,
    address,
    contactEmail,
    contactPhone,
    ownerName,
    ownerPassword,
    seatMonthlyPrice,
    domain,
    themeColor,
  } = req.body;

  const existingOwner = await User.findOne({ email: contactEmail });
  if (existingOwner) {
    return res.status(400).json({ message: 'Email already registered' });
  }

  // Create the owner user first without libraryId, then backfill after library creation
  const owner = await User.create({
    name: ownerName,
    email: contactEmail,
    password: ownerPassword,
    role: 'admin',
    isEmailVerified: true,
  });

  const library = await Library.create({
    name: libraryName,
    address,
    contactEmail,
    contactPhone,
    ownerId: owner._id,
    subscriptionPlan: 'free',
    domain,
    themeColor,
    settings: {
      seatMonthlyPrice: seatMonthlyPrice || 0, // admin can update this anytime via PUT /api/libraries/me
    },
  });

  owner.libraryId = library._id;
  await owner.save();

  const token = generateToken(owner._id, owner.role, library._id);

  res.status(201).json({
    message: 'Library onboarded successfully',
    token,
    library,
    user: { id: owner._id, name: owner.name, email: owner.email, role: owner.role },
  });
});

// @desc    Get current library's own settings
// @route   GET /api/libraries/me
// @access  Private (admin)
const getMyLibrary = asyncHandler(async (req, res) => {
  const library = await Library.findById(req.libraryId);
  if (!library) {
    return res.status(404).json({ message: 'Library not found' });
  }
  res.status(200).json({ library });
});

// @desc    Update library settings (logo, QR image, grace period, etc.)
// @route   PUT /api/libraries/me
// @access  Private (admin)
const updateMyLibrary = asyncHandler(async (req, res) => {
  const library = await Library.findById(req.libraryId);
  if (!library) {
    return res.status(404).json({ message: 'Library not found' });
  }

  const fields = ['name', 'address', 'contactEmail', 'contactPhone', 'logoUrl', 'domain', 'themeColor', 'qrPaymentImageUrl', 'settings'];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) library[f] = req.body[f];
  });

  await library.save();
  res.status(200).json({ library });
});

// @desc    Superadmin lists all libraries on the platform
// @route   GET /api/libraries
// @access  Private (superadmin)
const listAllLibraries = asyncHandler(async (req, res) => {
  const libraries = await Library.find().populate('ownerId', 'name email');
  res.status(200).json({ count: libraries.length, libraries });
});

// @desc    Public — fetch minimal branding info (logo, name, colors) for the
//          white-label frontend to render before the user logs in.
//          Resolved by domain/subdomain in production; by ?libraryId= in dev.
// @route   GET /api/libraries/branding?libraryId=... (or via domain mapping)
// @access  Public
const getPublicBranding = asyncHandler(async (req, res) => {
  const { libraryId, domain } = req.query;

  const filter = domain ? { domain } : { _id: libraryId };
  if (!libraryId && !domain) {
    return res.status(400).json({ message: 'libraryId or domain query param is required' });
  }

  const library = await Library.findOne(filter).select(
    'name logoUrl themeColor qrPaymentImageUrl address contactEmail contactPhone settings.seatMonthlyPrice'
  );
  if (!library) {
    return res.status(404).json({ message: 'Library not found' });
  }

  res.status(200).json({ library });
});

module.exports = { onboardLibrary, getMyLibrary, updateMyLibrary, listAllLibraries, getPublicBranding };
