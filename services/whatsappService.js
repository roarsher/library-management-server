//  const twilioClient = require('../config/twilio');

//  const toWhatsAppAddress = (phone) => {
//   let digitsOnly = phone.replace(/\D/g, '');
//   if (digitsOnly.length === 10) {
//     digitsOnly = `91${digitsOnly}`; // assume India if no country code present
//   }
//   return `whatsapp:+${digitsOnly}`;
// };
// // @desc    Send a plain text WhatsApp message
// const sendWhatsAppMessage = async (phone, message) => {
//   if (!phone) throw new Error('No phone number on file for this student');

//   await twilioClient.messages.create({
//     from: process.env.TWILIO_WHATSAPP_FROM,
//     to: toWhatsAppAddress(phone),
//     body: message,
//   });
// };

// // @desc    Send a message with a media attachment (e.g. a fee receipt PDF)
//  const sendWhatsAppMedia = async (phone, message, mediaUrl) => {
//   if (!phone) throw new Error('No phone number on file for this student');

//   try {
//     await twilioClient.messages.create({
//       from: process.env.TWILIO_WHATSAPP_FROM,
//       to: toWhatsAppAddress(phone),
//       body: message,
//       mediaUrl: [mediaUrl],
//     });
//   } catch (err) {
//     console.warn('WhatsApp media send failed, falling back to text+link:', err.message);
//     await sendWhatsAppMessage(phone, `${message}\n\nView your receipt: ${mediaUrl}`);
//   }
// };

// // @desc    Send the same message to a list of phone numbers (admin broadcast)
// // const sendBulkWhatsAppMessages = async (phones, message) => {
// //   const results = await Promise.allSettled(phones.map((phone) => sendWhatsAppMessage(phone, message)));
// //   const delivered = results.filter((r) => r.status === 'fulfilled').length;
// //   const failed = results.filter((r) => r.status === 'rejected').length;
// //   return { delivered, failed };
// // };
// const sendBulkWhatsAppMessages = async (phones, message) => {
//   const results = await Promise.allSettled(phones.map((phone) => sendWhatsAppMessage(phone, message)));

//   results.forEach((r, i) => {
//     if (r.status === 'rejected') {
//       console.error(`WhatsApp send failed for ${phones[i]}:`, r.reason?.message || r.reason);
//     }
//   });

//   const delivered = results.filter((r) => r.status === 'fulfilled').length;
//   const failed = results.filter((r) => r.status === 'rejected').length;

//   return { delivered, failed };
// };
// module.exports = { sendWhatsAppMessage, sendWhatsAppMedia, sendBulkWhatsAppMessages };
const twilioClient = require('../config/twilio');

const toWhatsAppAddress = (phone) => {
  let digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length === 10) {
    digitsOnly = `91${digitsOnly}`; // assume India if no country code present
  }
  return `whatsapp:+${digitsOnly}`;
};

// @desc    Send a plain text WhatsApp message via an approved Content Template
//          (required outside the 24hr session window, per WhatsApp Business rules)
const sendWhatsAppMessage = async (phone, message) => {
  if (!phone) throw new Error('No phone number on file for this student');

  await twilioClient.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM,
    to: toWhatsAppAddress(phone),
    contentSid: process.env.TWILIO_GENERIC_TEMPLATE_SID,
    contentVariables: JSON.stringify({ 1: message }),
  });
};

// @desc    Send a message with a media attachment (e.g. a fee receipt PDF)
const sendWhatsAppMedia = async (phone, message, mediaUrl) => {
  if (!phone) throw new Error('No phone number on file for this student');

  try {
    await twilioClient.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: toWhatsAppAddress(phone),
      body: message,
      mediaUrl: [mediaUrl],
    });
  } catch (err) {
    console.warn('WhatsApp media send failed, falling back to text+link:', err.message);
    await sendWhatsAppMessage(phone, `${message}\n\nView your receipt: ${mediaUrl}`);
  }
};

const sendBulkWhatsAppMessages = async (phones, message) => {
  const results = await Promise.allSettled(phones.map((phone) => sendWhatsAppMessage(phone, message)));

  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`WhatsApp send failed for ${phones[i]}:`, r.reason?.message || r.reason);
    }
  });

  const delivered = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  return { delivered, failed };
};

module.exports = { sendWhatsAppMessage, sendWhatsAppMedia, sendBulkWhatsAppMessages };