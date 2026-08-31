// server/config/webpush.js
const webpush = require('web-push');

// VAPID keys identify your server to push services (Chrome, Firefox, etc.)
// Generate a pair once with: npx web-push generate-vapid-keys
// and put the values in your .env — see .env.example.
webpush.setVapidDetails(
  `mailto:${process.env.VAPID_CONTACT_EMAIL || 'admin@example.com'}`,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

module.exports = webpush;
