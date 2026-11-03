require('dotenv').config();

const sendMail = require('./backend/utils/mailer');

const recipient = process.argv[2];

if (!recipient) {
  console.error('Usage: node test-email.js <recipient-email>');
  process.exitCode = 1;
} else if (!process.env.RESEND_API_KEY) {
  console.error('RESEND_API_KEY is not configured in .env');
  process.exitCode = 1;
} else if (!process.env.MAIL_FROM) {
  console.error('MAIL_FROM is not configured in .env');
  process.exitCode = 1;
} else {
  sendMail({
    to: recipient,
    subject: 'Smart Student Service Portal email test',
    text: 'This is a test email from the Smart Student Service Portal.',
    html: '<p>This is a test email from the Smart Student Service Portal.</p>',
  }).then((result) => {
    if (!result?.id) {
      throw new Error('Resend accepted the request but did not return an email id.');
    }
    console.log(`Test email sent. Resend email id: ${result.id}`);
  }).catch((error) => {
    console.error(`Test email failed: ${error.message}`);
    console.error('Hint: onboarding@resend.dev can only send to your own Resend account email.');
    process.exitCode = 1;
  });
}
