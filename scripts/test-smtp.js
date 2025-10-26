import 'dotenv/config';
import { sendMail } from '../src/utils/mailer.js';

async function main() {
  try {
    const to = process.env.SMTP_USER || process.env.SENDER_EMAIL;
    if (!to) {
      console.error('No recipient configured (SMTP_USER or SENDER_EMAIL missing)');
      process.exit(2);
    }
    console.log('Using SMTP_USER:', process.env.SMTP_USER ? 'set' : 'unset');
    console.log('Sending test email to:', to);

    const res = await sendMail({
      to,
      from: process.env.SENDER_EMAIL || process.env.SMTP_USER,
      subject: 'Test SMTP from local test-smtp.js',
      text: 'This is a test email sent by scripts/test-smtp.js',
      html: '<p>This is a test email sent by <strong>scripts/test-smtp.js</strong></p>',
    });

    console.log('sendMail result:', res);
    process.exit(0);
  } catch (err) {
    console.error('sendMail failed:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
}

main();
