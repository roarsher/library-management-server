require('dotenv').config();

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function testEmail() {
  try {
    console.log('Testing SMTP...');
    console.log('Host:', process.env.SMTP_HOST);
    console.log('Port:', process.env.SMTP_PORT);
    console.log('User:', process.env.SMTP_USER);
    console.log('Password:', process.env.SMTP_PASS ? 'SET' : 'MISSING');

    await transporter.verify();

    console.log('✅ SMTP connection successful!');

    await transporter.sendMail({
      from: `"Library" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER,
      subject: 'Library App SMTP Test',
      text: 'SMTP is working correctly!',
      html: '<h2>Library App</h2><p>SMTP is working correctly!</p>',
    });

    console.log('✅ Test email sent successfully!');
  } catch (error) {
    console.error('❌ SMTP TEST FAILED');
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('Response:', error.response);
  }
}

testEmail();