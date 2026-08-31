const axios = require('axios');

const sendSms = async (phone, message) => {
  if (!phone) throw new Error('No phone number on file for this student');

  await axios.post(process.env.SMS_API_URL, {
    apiKey: process.env.SMS_API_KEY,
    to: phone,
    message,
  });
};

module.exports = { sendSms };
