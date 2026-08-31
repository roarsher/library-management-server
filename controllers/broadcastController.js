const asyncHandler = require('../utils/asyncHandler');
const { BroadcastLog, Student } = require('../models');
const { sendBulkWhatsAppMessages } = require('../services/whatsappService');

// @desc    Admin sends a bulk WhatsApp message to students (offers/events)
// @route   POST /api/broadcast/whatsapp
// @access  Private (admin)
const sendWhatsAppBroadcast = asyncHandler(async (req, res) => {
  const { message, imageUrl, recipientFilter } = req.body; // recipientFilter: 'all_students' | 'active_only' | 'expiring_soon'

  const filter = { libraryId: req.libraryId, admissionStatus: 'verified' };
  // 'active_only' / 'expiring_soon' filtering can be layered on by joining
  // against SeatBooking status/endDate — kept simple here as the base case.

  const students = await Student.find(filter).populate('userId', 'name phone');
  const phones = students.map((s) => s.userId?.phone).filter(Boolean);

  const log = await BroadcastLog.create({
    libraryId: req.libraryId,
    sentBy: req.user._id,
    channel: 'whatsapp',
    message,
    imageUrl,
    recipientCount: phones.length,
    recipientFilter: recipientFilter || 'all_students',
    status: 'sending',
  });

  const { delivered, failed } = await sendBulkWhatsAppMessages(phones, message, imageUrl);

  log.deliveredCount = delivered;
  log.failedCount = failed;
  log.status = 'completed';
  await log.save();

  res.status(200).json({ message: 'Broadcast sent', log });
});

// @desc    List past broadcasts for the admin dashboard
// @route   GET /api/broadcast
// @access  Private (admin)
const listBroadcasts = asyncHandler(async (req, res) => {
  const logs = await BroadcastLog.find({ libraryId: req.libraryId })
    .populate('sentBy', 'name')
    .sort({ createdAt: -1 });

  res.status(200).json({ logs });
});

module.exports = { sendWhatsAppBroadcast, listBroadcasts };
