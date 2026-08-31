const asyncHandler = require('../utils/asyncHandler');
const { AddOn } = require('../models');

// @desc    Create an add-on (e.g. Night Shift, Locker)
// @route   POST /api/add-ons
// @access  Private (admin)
const createAddOn = asyncHandler(async (req, res) => {
  const { name, description, pricePerMonth, icon } = req.body;

  const addOn = await AddOn.create({
    libraryId: req.libraryId,
    name,
    description,
    pricePerMonth,
    icon,
  });

  res.status(201).json({ addOn });
});

// @desc    List active add-ons (shown as upsell suggestions during booking)
// @route   GET /api/add-ons
// @access  Private
const listAddOns = asyncHandler(async (req, res) => {
  const addOns = await AddOn.find({ libraryId: req.libraryId, isActive: true });
  res.status(200).json({ addOns });
});

// @desc    Update an add-on
// @route   PUT /api/add-ons/:id
// @access  Private (admin)
const updateAddOn = asyncHandler(async (req, res) => {
  const addOn = await AddOn.findOne({ _id: req.params.id, libraryId: req.libraryId });
  if (!addOn) {
    return res.status(404).json({ message: 'Add-on not found' });
  }

  const fields = ['name', 'description', 'pricePerMonth', 'icon', 'isActive'];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) addOn[f] = req.body[f];
  });

  await addOn.save();
  res.status(200).json({ addOn });
});

// @desc    Delete an add-on
// @route   DELETE /api/add-ons/:id
// @access  Private (admin)
const deleteAddOn = asyncHandler(async (req, res) => {
  const addOn = await AddOn.findOneAndDelete({ _id: req.params.id, libraryId: req.libraryId });
  if (!addOn) {
    return res.status(404).json({ message: 'Add-on not found' });
  }
  res.status(200).json({ message: 'Add-on deleted' });
});

module.exports = { createAddOn, listAddOns, updateAddOn, deleteAddOn };
