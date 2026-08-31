// Simple invoice number: INV-<libraryShortId>-<timestamp>
const generateInvoiceNumber = (libraryId) => {
  const shortId = libraryId.toString().slice(-6).toUpperCase();
  const stamp = Date.now().toString().slice(-8);
  return `INV-${shortId}-${stamp}`;
};

module.exports = generateInvoiceNumber;
