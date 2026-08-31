const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendEmail = async (to, subject, text, html) => {
  await transporter.sendMail({
    from: process.env.SMTP_FROM || '"Library App" <no-reply@library.app>',
    to,
    subject,
    text,
    html,
  });
};

const sendOtpEmail = async (email, otp) => {
  await sendEmail(
    email,
    'Your Verification Code',
    `Your OTP is ${otp}. It expires in 10 minutes.`,
    `<p>Your OTP is <strong>${otp}</strong>. It expires in 10 minutes.</p>`
  );
};

module.exports = { sendEmail, sendOtpEmail };
