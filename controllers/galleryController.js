const asyncHandler = require('../utils/asyncHandler');
const { Gallery, GalleryImage } = require('../models');

// @desc    Admin creates a gallery album (e.g. "Saraswati Puja")
// @route   POST /api/gallery
// @access  Private (admin)
const createGallery = asyncHandler(async (req, res) => {
  const { title, description, coverImageUrl, eventDate } = req.body;

  const gallery = await Gallery.create({
    libraryId: req.libraryId,
    title,
    description,
    coverImageUrl,
    eventDate,
    createdBy: req.user._id,
  });

  res.status(201).json({ gallery });
});

// @desc    Public — list published galleries for the homepage
// @route   GET /api/gallery
// @access  Public
const listGalleries = asyncHandler(async (req, res) => {
  const galleries = await Gallery.find({
    libraryId: req.libraryId,
    isPublished: true,
  }).sort({ eventDate: -1 });

  res.status(200).json({ galleries });
});

// @desc    Public — get one gallery's photos
// @route   GET /api/gallery/:id
// @access  Public
const getGalleryDetail = asyncHandler(async (req, res) => {
  const gallery = await Gallery.findOne({ _id: req.params.id, libraryId: req.libraryId });
  if (!gallery) {
    return res.status(404).json({ message: 'Gallery not found' });
  }

  const images = await GalleryImage.find({ galleryId: gallery._id }).sort({ createdAt: -1 });

  res.status(200).json({ gallery, images });
});

// @desc    Admin uploads photo(s) into a gallery
// @route   POST /api/gallery/:id/images
// @access  Private (admin)
// Note: expects imageUrls already uploaded via the Firebase Storage upload route
const addGalleryImages = asyncHandler(async (req, res) => {
  const { imageUrls, caption } = req.body; // imageUrls: string[]

  const gallery = await Gallery.findOne({ _id: req.params.id, libraryId: req.libraryId });
  if (!gallery) {
    return res.status(404).json({ message: 'Gallery not found' });
  }

  const docs = imageUrls.map((url) => ({
    galleryId: gallery._id,
    libraryId: req.libraryId,
    imageUrl: url,
    caption,
    uploadedBy: req.user._id,
  }));

  const images = await GalleryImage.insertMany(docs);

  res.status(201).json({ count: images.length, images });
});

// @desc    Admin deletes a gallery album (and its images)
// @route   DELETE /api/gallery/:id
// @access  Private (admin)
const deleteGallery = asyncHandler(async (req, res) => {
  const gallery = await Gallery.findOneAndDelete({ _id: req.params.id, libraryId: req.libraryId });
  if (!gallery) {
    return res.status(404).json({ message: 'Gallery not found' });
  }
  await GalleryImage.deleteMany({ galleryId: gallery._id });

  res.status(200).json({ message: 'Gallery deleted' });
});

// @desc    Admin deletes a single image from a gallery
// @route   DELETE /api/gallery/images/:imageId
// @access  Private (admin)
const deleteGalleryImage = asyncHandler(async (req, res) => {
  const image = await GalleryImage.findOneAndDelete({
    _id: req.params.imageId,
    libraryId: req.libraryId,
  });
  if (!image) {
    return res.status(404).json({ message: 'Image not found' });
  }
  res.status(200).json({ message: 'Image deleted' });
});

module.exports = {
  createGallery,
  listGalleries,
  getGalleryDetail,
  addGalleryImages,
  deleteGallery,
  deleteGalleryImage,
};
