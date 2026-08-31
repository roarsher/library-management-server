 const PDFDocument = require('pdfkit');
const { cloudinary } = require('../config/cloudinary'); // named export, not default

const generateReceiptPdfBuffer = ({ library, student, payment, booking }) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A5', margin: 40 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text(library.name, { align: 'center' });
    doc.fontSize(10).fillColor('gray').text(library.address, { align: 'center' });
    doc.moveDown(1.5);

    doc.fillColor('black').fontSize(14).text('Fee Receipt', { align: 'center', underline: true });
    doc.moveDown();

    doc.fontSize(11);
    doc.text(`Receipt No: ${payment.invoiceNumber || payment._id}`);
    doc.text(`Date: ${new Date(payment.createdAt || Date.now()).toLocaleDateString()}`);
    doc.moveDown(0.5);

    doc.text(`Student: ${student.userId?.name}`);
    doc.text(`Phone: ${student.userId?.phone}`);
    if (booking?.seatId) doc.text(`Seat No: ${booking.seatId.seatNumber}`);
    doc.moveDown(0.5);

    doc.fontSize(13).text(`Amount Paid: Rs. ${payment.amount}`);
    doc.fontSize(10).fillColor('gray').text(`Payment Method: ${payment.method}`);
    doc.moveDown(1.5);

    doc.fillColor('black').fontSize(9).text('Thank you for choosing us.', { align: 'center' });
    doc.end();
  });
};

const uploadReceiptPdf = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        folder: 'library-app/receipts',
        public_id: `receipt-${Date.now()}`,
        format: 'pdf',
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
};

const generateAndUploadReceipt = async ({ library, student, payment, booking }) => {
  const buffer = await generateReceiptPdfBuffer({ library, student, payment, booking });
  const result = await uploadReceiptPdf(buffer);
  return result.secure_url;
};

module.exports = { generateReceiptPdfBuffer, generateAndUploadReceipt };