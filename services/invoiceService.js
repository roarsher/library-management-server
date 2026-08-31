// const generateInvoiceNumber = require('../utils/generateInvoiceNumber');

// // Stub for PDF invoice generation — plug in a library like pdfkit or
// // puppeteer here, upload the result to Firebase Storage, and return the URL.
// const generateInvoiceForPayment = async (payment) => {
//   const invoiceNumber = generateInvoiceNumber(payment.libraryId);

//   // TODO: render an actual PDF with payment/booking details and upload it.
//   const invoiceUrl = `https://your-cdn.example.com/invoices/${invoiceNumber}.pdf`;

//   payment.invoiceNumber = invoiceNumber;
//   payment.invoiceUrl = invoiceUrl;
//   await payment.save();

//   return payment;
// };

// module.exports = { generateInvoiceForPayment };

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