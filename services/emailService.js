 const axios = require('axios');

const sendEmail = async (to, subject, text, html) => {
  try {
    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: {
          name: process.env.BREVO_FROM_NAME || 'Library App',
          email: process.env.BREVO_FROM_EMAIL,
        },
        to: [
          {
            email: to,
          },
        ],
        subject,
        textContent: text,
        htmlContent: html,
      },
      {
        headers: {
          accept: 'application/json',
          'api-key': process.env.BREVO_API_KEY,
          'content-type': 'application/json',
        },
      }
    );

    console.log('Email sent successfully:', response.data);

    return response.data;
  } catch (error) {
    console.error(
      'Brevo email failed:',
      error.response?.data || error.message
    );

    throw error;
  }
};

const sendOtpEmail = async (email, otp) => {
  return sendEmail(
    email,
    'Your Library Verification Code',
    `Your OTP is ${otp}. It expires in 10 minutes.`,
    `
      <div style="font-family: Arial, sans-serif;">
        <h2>Library Account Verification</h2>
        <p>Your verification code is:</p>

        <h1 style="letter-spacing: 5px;">
          ${otp}
        </h1>

        <p>This OTP expires in <strong>10 minutes</strong>.</p>

        <p>If you did not request this code, you can ignore this email.</p>
      </div>
    `
  );
};

module.exports = {
  sendEmail,
  sendOtpEmail,
};