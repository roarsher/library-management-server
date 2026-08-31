// const { randomUUID } = require('crypto');
// const asyncHandler = require('../utils/asyncHandler');
// const { bucket } = require('../config/firebase');

// // Folder-per-type keeps Firebase Storage organized and makes it easy to
// // scope cleanup/rules per upload type later.
// const TYPE_TO_FOLDER = {
//   student_photo: 'students/photos',
//   id_proof: 'students/id-proofs',
//   payment_screenshot: 'payments/screenshots',
//   gallery: 'gallery',
//   library_logo: 'libraries/logos',
//   qr_code: 'libraries/qr-codes',
// };

// // Uploads one buffer to Firebase Storage, makes it publicly readable
// // (simplest option for images that are meant to be displayed in the app),
// // and returns its public URL.
// const uploadBufferToFirebase = (file, folder) => {
//   return new Promise((resolve, reject) => {
//     const filename = `${folder}/${randomUUID()}-${file.originalname}`;
//     const blob = bucket.file(filename);

//     const stream = blob.createWriteStream({
//       metadata: { contentType: file.mimetype },
//     });

//     stream.on('error', reject);
//     stream.on('finish', async () => {
//       try {
//         await blob.makePublic();
//         const url = `https://storage.googleapis.com/${bucket.name}/${filename}`;
//         resolve({ url, path: filename });
//       } catch (err) {
//         reject(err);
//       }
//     });

//     stream.end(file.buffer);
//   });
// };

// // @desc    Upload a single file (photo, ID proof, payment screenshot, gallery image)
// // @route   POST /api/uploads?type=student_photo|id_proof|payment_screenshot|gallery
// // @access  Private (any authenticated role — student uploads their own docs,
// //          admin uploads gallery/QR images)
// // Usage from the frontend: multipart/form-data with a single "file" field.
// const uploadSingleFile = asyncHandler(async (req, res) => {
//   if (!req.file) {
//     return res.status(400).json({ message: 'No file provided' });
//   }

//   const typeFolder = TYPE_TO_FOLDER[req.query.type] || 'misc';
//   const folder = `library-app/${req.libraryId}/${typeFolder}`;

//   const result = await uploadBufferToFirebase(req.file, folder);

//   res.status(201).json({ url: result.url, path: result.path });
// });

// // @desc    Upload multiple files at once (e.g. several gallery photos together)
// // @route   POST /api/uploads/multiple?type=gallery
// // @access  Private
// const uploadMultipleFiles = asyncHandler(async (req, res) => {
//   if (!req.files || req.files.length === 0) {
//     return res.status(400).json({ message: 'No files provided' });
//   }

//   const typeFolder = TYPE_TO_FOLDER[req.query.type] || 'misc';
//   const folder = `library-app/${req.libraryId}/${typeFolder}`;

//   const results = await Promise.all(
//     req.files.map((file) => uploadBufferToFirebase(file, folder))
//   );

//   res.status(201).json({
//     urls: results.map((r) => r.url),
//     paths: results.map((r) => r.path),
//   });
// });

// module.exports = { uploadSingleFile, uploadMultipleFiles };
const { randomUUID } = require('crypto');
const asyncHandler = require('../utils/asyncHandler');
const { uploadToCloudinary } = require('../config/cloudinary');

// Folder-per-type keeps Cloudinary organized
const TYPE_TO_FOLDER = {
  student_photo: 'library-app/students/photos',
  id_proof: 'library-app/students/id-proofs',
  payment_screenshot: 'library-app/payments/screenshots',
  gallery: 'library-app/gallery',
  library_logo: 'library-app/libraries/logos',
  qr_code: 'library-app/libraries/qr-codes',
};

// @desc    Upload a single file
// @route   POST /api/uploads?type=student_photo
// @access  Private
const uploadSingleFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      message: 'No file provided',
    });
  }

  const type = req.query.type;

  const typeFolder = TYPE_TO_FOLDER[type] || 'library-app/misc';

  // Keep each library's files separated
  const folder = `${typeFolder}/${req.libraryId}`;

  const result = await uploadToCloudinary(
    req.file.buffer,
    folder,
    {
      public_id: `${randomUUID()}-${req.file.originalname
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9-_]/g, '-')}`,
    }
  );

  res.status(201).json({
    url: result.url,
    path: result.public_id,
    public_id: result.public_id,
  });
});

// @desc    Upload multiple files
// @route   POST /api/uploads/multiple?type=gallery
// @access  Private
const uploadMultipleFiles = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      message: 'No files provided',
    });
  }

  const type = req.query.type;

  const typeFolder = TYPE_TO_FOLDER[type] || 'library-app/misc';

  const folder = `${typeFolder}/${req.libraryId}`;

  const results = await Promise.all(
    req.files.map((file) =>
      uploadToCloudinary(
        file.buffer,
        folder,
        {
          public_id: `${randomUUID()}-${file.originalname
            .replace(/\.[^/.]+$/, '')
            .replace(/[^a-zA-Z0-9-_]/g, '-')}`,
        }
      )
    )
  );

  res.status(201).json({
    urls: results.map((result) => result.url),
    paths: results.map((result) => result.public_id),
    public_ids: results.map((result) => result.public_id),
  });
});

module.exports = {
  uploadSingleFile,
  uploadMultipleFiles,
};