const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema(
  {
    libraryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Library',
      required: true,
    },
    title: {
      type: String,
      required: true, // e.g. "National Festival", "Saraswati Puja"
    },
    description: {
      type: String,
    },
    coverImageUrl: {
      type: String,
    },
    eventDate: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

gallerySchema.index({ libraryId: 1, isPublished: 1 });

module.exports = mongoose.model('Gallery', gallerySchema);
