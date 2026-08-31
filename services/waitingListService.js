// server/services/waitingListService.js
const { WaitingList, Student } = require('../models');
const { sendWhatsAppMessage } = require('./whatsappService');
const { sendSms } = require('./smsService');
const { sendEmail } = require('./emailService');
const { sendPushToStudent } = require('./pushNotificationService');

const OFFER_WINDOW_MS = 30 * 60 * 1000; // 30 min to claim the seat before it opens to others

// @desc    Called whenever a seat becomes free (rejection, cancellation,
//          leave approval, no-show release). Notifies the earliest waiting student.
const notifyWaitingListForSeat = async (seatId, libraryId) => {
  const nextInLine = await WaitingList.findOne({
    seatId,
    libraryId,
    status: 'waiting',
  })
    .sort({ createdAt: 1 }) // first come, first served
    .populate({ path: 'studentId', populate: { path: 'userId', select: 'name email phone' } });

  if (!nextInLine) return null;

  const student = nextInLine.studentId;
  const message = `Good news! Seat ${seatId} is now available at your library. Book within 30 minutes to secure it.`;

  const channels = [];
  try {
    await sendWhatsAppMessage(student.userId.phone, message);
    channels.push('whatsapp');
  } catch (e) {
    console.error('WhatsApp notify failed:', e.message);
  }
  try {
    await sendSms(student.userId.phone, message);
    channels.push('sms');
  } catch (e) {
    console.error('SMS notify failed:', e.message);
  }
  try {
    await sendEmail(student.userId.email, 'Seat Available', message);
    channels.push('email');
  } catch (e) {
    console.error('Email notify failed:', e.message);
  }
  try {
    await sendPushToStudent(student._id, {
      title: 'Seat Available',
      body: message,
      url: '/book/seat',
    });
    channels.push('push');
  } catch (e) {
    console.error('Push notify failed:', e.message);
  }

  nextInLine.status = 'notified';
  nextInLine.notifiedAt = new Date();
  nextInLine.notifiedVia = channels;
  nextInLine.expiresAt = new Date(Date.now() + OFFER_WINDOW_MS);
  await nextInLine.save();

  return nextInLine;
};

module.exports = { notifyWaitingListForSeat };
