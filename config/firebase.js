const admin = require('firebase-admin');

// Service account credentials come from env vars rather than a committed
// JSON file, so the same code works across dev/staging/prod without
// shipping secrets in the repo. See .env.example for the three values needed.
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Firebase private keys come from the JSON file with literal "\n"
      // sequences — env vars can't hold real newlines, so they're escaped
      // when stored and un-escaped here.
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET, // e.g. "your-project.appspot.com"
  });
}

const bucket = admin.storage().bucket();

module.exports = { admin, bucket };
