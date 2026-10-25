import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let transporter = null;

export const mailConfigured = () => Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

export const mailFrom = () => {
  const address = process.env.SMTP_FROM || process.env.SMTP_USER || '';
  const name = process.env.SMTP_FROM_NAME || 'QR Studio';
  return address ? `"${name}" <${address}>` : '';
};

const getTransport = () => {
  if (transporter) return transporter;

  const port = Number(process.env.SMTP_PORT) || 465;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    // 465 is implicit TLS; 587 upgrades with STARTTLS instead.
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      // A Gmail app password, not the account password.
      pass: process.env.SMTP_PASS,
    },
    pool: true,
    maxConnections: 1,
    maxMessages: 50,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  return transporter;
};

/**
 * Send one HTML email over SMTP
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML body
 * @returns {Promise<object>} { success, messageId } or { success: false, error }
 */
export const sendMail = async (to, subject, html) => {
  if (!mailConfigured()) {
    return { success: false, error: 'Email is not configured. Set SMTP_USER and SMTP_PASS.' };
  }

  try {
    const from = mailFrom();
    const info = await getTransport().sendMail({ from, to, replyTo: from, subject, html });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`Error sending "${subject}" email:`, error.message);
    return { success: false, error: error.message || 'Failed to send email' };
  }
};

if (!mailConfigured()) {
  console.warn('SMTP_USER / SMTP_PASS are not configured. Email sending will fail.');
}
