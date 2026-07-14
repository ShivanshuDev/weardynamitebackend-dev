const nodemailer = require('nodemailer');
require('dotenv').config();

console.log('Using SMTP User:', process.env.GMAIL_USER);
console.log('Using Password length:', process.env.GMAIL_APP_PASSWORD ? process.env.GMAIL_APP_PASSWORD.length : 0);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

async function verify() {
  try {
    console.log('Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection is verified and ready!');
  } catch (error) {
    console.error('❌ SMTP connection failed:', error.message);
  }
}

verify();
