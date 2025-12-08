require('dotenv').config();
const sendEmail = require('../utils/email');

const testEmail = async () => {
    console.log('📧 Testing email service...');
    const to = process.env.EMAIL_USER; // Send to self for testing
    if (!to) {
        console.error('❌ EMAIL_USER not set in .env');
        return;
    }

    const subject = 'Test Email from CRIMS';
    const html = '<h3>It works!</h3><p>This is a test email from the CRIMS backend.</p>';

    const success = await sendEmail(to, subject, html);

    if (success) {
        console.log('✅ Test email sent successfully!');
    } else {
        console.error('❌ Failed to send test email.');
    }
};

testEmail();
