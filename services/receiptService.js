 const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { cloudinary } = require('../config/cloudinary');

const LOGO_PATH = path.join(__dirname, '../assets/gyan-library-logo.png');

const PAYMENT_MODE_LABEL = { cash: 'Cash', manual_qr: 'Online (QR)' };

const generateReceiptPdfBuffer = ({ library, student, payment, booking }) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A5', margin: 30, layout: 'landscape' });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - 60;
    const startX = 30;
    let y = 25;

    // Logo — top-left, matches the physical receipt layout
    const logoSize = 55;
    if (fs.existsSync(LOGO_PATH)) {
      try {
        doc.image(LOGO_PATH, startX, y, { width: logoSize, height: logoSize });
      } catch (err) {
        console.warn('Receipt logo failed to embed:', err.message);
      }
    }

    // Header text — offset right of the logo
    const textStartX = startX + logoSize + 12;
    const textWidth = pageWidth - logoSize - 12;

    doc.fontSize(26).fillColor('#e53935').font('Helvetica-Bold')
      .text(library.name?.toUpperCase() || 'LIBRARY', textStartX, y, { width: textWidth });
    y += 30;

    doc.fontSize(10).fillColor('#2e7d32').font('Helvetica-Bold')
      .text('24X7 A Self Study Library', textStartX, y, { width: textWidth });
    y = 25 + logoSize + 8; // reset below the logo height too, in case text was shorter

    doc.fontSize(9).fillColor('#1565c0').font('Helvetica')
      .text(`Receipt No. ${payment.invoiceNumber || payment._id}`, startX, y);
    doc.fillColor('#333')
      .text(library.address || '', startX, y, { align: 'center', width: pageWidth });
    y += 14;
    doc.fontSize(8).fillColor('#555')
      .text(`Email: ${library.contactEmail || ''}  Contact: ${library.contactPhone || ''}`, startX, y, {
        align: 'center', width: pageWidth,
      });
    y += 20;

    doc.moveTo(startX, y).lineTo(startX + pageWidth, y).strokeColor('#ccc').stroke();
    y += 10;

    doc.fontSize(13).fillColor('#e53935').font('Helvetica-Bold')
      .text('FEE RECEIPT', startX, y, { align: 'center', width: pageWidth });
    y += 24;

    const colWidth = pageWidth / 2;
    const rowHeight = 26;
    const drawRow = (leftLabel, leftValue, rightLabel, rightValue) => {
      doc.rect(startX, y, colWidth, rowHeight).strokeColor('#4caf50').stroke();
      doc.rect(startX + colWidth, y, colWidth, rowHeight).strokeColor('#4caf50').stroke();

      doc.fontSize(9).fillColor('#e53935').font('Helvetica-Bold').text(leftLabel, startX + 6, y + 8);
      doc.fillColor('#1565c0').font('Helvetica-Bold').text(String(leftValue ?? '-'), startX + 90, y + 8);

      doc.fillColor('#e53935').font('Helvetica-Bold').text(rightLabel, startX + colWidth + 6, y + 8);
      doc.fillColor('#1565c0').font('Helvetica-Bold').text(String(rightValue ?? '-'), startX + colWidth + 90, y + 8);

      y += rowHeight;
    };

    const studentName = student.userId?.name || '';
    const mobile = student.userId?.phone || '';
    const shiftLabel = booking?.timeSlotId?.label || '';
    const validUpto = booking?.endDate ? new Date(booking.endDate).toLocaleDateString('en-GB') : '-';
    const dateStr = new Date(payment.createdAt || Date.now()).toLocaleDateString('en-GB');
    const seatNo = booking?.seatId?.seatNumber || '-';
    const modeLabel = PAYMENT_MODE_LABEL[payment.method] || payment.method;

    drawRow('Date', dateStr, 'Reg. No.', student.registrationNumber || '-');
    drawRow('Name', studentName, 'Mobile No.', mobile);
    drawRow('Shift Time', shiftLabel, 'Valid Upto', validUpto);

    doc.rect(startX, y, pageWidth, rowHeight).strokeColor('#4caf50').stroke();
    const quarter = pageWidth / 4;
    doc.fontSize(9).fillColor('#e53935').font('Helvetica-Bold').text('Fee Received', startX + 6, y + 8);
    doc.fillColor('#1565c0').text(`₹${payment.amount}`, startX + 6, y + 18);

    doc.fillColor('#e53935').text('Dues', startX + quarter + 6, y + 8);
    doc.fillColor('#7b1fa2').text(`₹${payment.dueAmount || 0}`, startX + quarter + 6, y + 18);

    doc.fillColor('#e53935').text('Seat No.', startX + quarter * 2 + 6, y + 8);
    doc.fillColor('#1565c0').text(seatNo, startX + quarter * 2 + 6, y + 18);

    doc.fillColor('#e53935').text('Mode', startX + quarter * 3 + 6, y + 8);
    doc.fillColor('#1565c0').text(modeLabel, startX + quarter * 3 + 6, y + 18);
    y += rowHeight + 20;

    doc.fontSize(8).fillColor('#333').font('Helvetica')
      .text('➤ Fees once paid are not refundable in any circumstances.', startX, y);
    y += 30;

    doc.fontSize(9).text('_________________________', startX, y);
    doc.text("STUDENT'S Signature", startX, y + 12);

    doc.end();
  });
};

const uploadReceiptPdf = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'raw', folder: 'library-app/receipts', public_id: `receipt-${Date.now()}`, format: 'pdf' },
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