// server/services/pushNotificationService.js
const webpush = require('../config/webpush');
const { PushSubscription } = require('../models');

// Sends a push notification to every device/browser a student has
// subscribed from. Silently drops subscriptions that are no longer valid
// (expired or the user revoked permission) instead of failing the whole batch.
const sendPushToStudent = async (studentId, { title, body, url }) => {
  const subscriptions = await PushSubscription.find({ studentId });
  if (subscriptions.length === 0) return { sent: 0 };

  const payload = JSON.stringify({ title, body, url: url || '/' });

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        payload
      )
    )
  );

  // Clean up subscriptions the push service rejected as gone (410) or invalid (404)
  await Promise.all(
    results.map((result, i) => {
      if (result.status === 'rejected' && [404, 410].includes(result.reason?.statusCode)) {
        return PushSubscription.findByIdAndDelete(subscriptions[i]._id);
      }
      return Promise.resolve();
    })
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  return { sent, failed: results.length - sent };
};

module.exports = { sendPushToStudent };
