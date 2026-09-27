 
const generateInvoiceNumber = require('../utils/generateInvoiceNumber');
const { Student, SeatBooking, Library } = require('../models');
const { generateAndUploadReceipt } = require('./receiptService');
const { sendWhatsAppMedia } = require('./whatsappService');

const generateInvoiceForPayment = async (payment) => {
  const invoiceNumber = generateInvoiceNumber(payment.libraryId);

  const [library, student, booking] = await Promise.all([
    Library.findById(payment.libraryId),
    Student.findById(payment.studentId).populate('userId', 'name email phone'),
    SeatBooking.findById(payment.bookingId).populate('seatId', 'seatNumber'),
  ]);

  payment.invoiceNumber = invoiceNumber;

  try {
    const invoiceUrl = await generateAndUploadReceipt({ library, student, payment, booking });
    payment.invoiceUrl = invoiceUrl;
    await payment.save();

    const phone = student?.userId?.phone;
    if (phone) {
      await sendWhatsAppMedia(
        phone,
        `Hi ${student.userId.name}, here's your fee receipt from ${library.name}. Thank you!`,
        invoiceUrl
      );
    }
  } catch (err) {
    // Receipt/WhatsApp failure should never block the payment itself from being marked verified
    console.error('Invoice generation/WhatsApp failed:', err.message);
    await payment.save();
  }

  return payment;
};

module.exports = { generateInvoiceForPayment };