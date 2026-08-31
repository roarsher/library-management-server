const cron = require('node-cron');
const { SeatBooking, Student } = require('../models');
const { sendEmail } = require('../services/emailService');
const { sendWhatsAppMessage } = require('../services/whatsappService');

// Runs once daily: notifies students whose membership expires within 3 days.
const runRenewalReminderCheck = async () => {
  const now = new Date();
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const expiringBookings = await SeatBooking.find({
    status: 'active',
    endDate: { $gte: now, $lte: in3Days },
  }).populate({ path: 'studentId', populate: { path: 'userId', select: 'name email phone' } });

  for (const booking of expiringBookings) {
    const user = booking.studentId?.userId;
    if (!user) continue;

    const message = `Hi ${user.name}, your library membership expires on ${booking.endDate.toDateString()}. Renew soon to keep your seat.`;

    try {
      await sendEmail(user.email, 'Membership Expiring Soon', message);
    } catch (e) {
      console.error('Renewal email failed:', e.message);
    }
    try {
      await sendWhatsAppMessage(user.phone, message);
    } catch (e) {
      console.error('Renewal WhatsApp failed:', e.message);
    }
  }
};

const scheduleRenewalReminderJob = () => {
  cron.schedule('0 9 * * *', () => {
    // every day at 9 AM
    runRenewalReminderCheck().catch((err) =>
      console.error('Renewal reminder job failed:', err.message)
    );
  });
};

module.exports = { scheduleRenewalReminderJob, runRenewalReminderCheck };
