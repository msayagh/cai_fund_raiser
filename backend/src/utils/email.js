'use strict';

const nodemailer = require('nodemailer');
const config = require('../config/env');
const logger = require('./logger');

let transporter = null;

const hasSmtp = !!(config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS);

if (hasSmtp) {
  transporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_PORT === 465,
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASS,
    },
  });
}

/**
 * Sends an OTP email to the given address.
 * Falls back to console logging when SMTP is not configured (dev mode).
 */
const sendOtpEmail = async (email, otp, purpose = 'verification') => {
  const purposeLabel = purpose === 'reset' ? 'password reset' : 'email verification';
  const subject = `Centre Zad Al-Imane — Your ${purposeLabel} code`;
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #1a6b3a;">Centre Zad Al-Imane</h2>
      <p>Assalamu Alaikum,</p>
      <p>Your ${purposeLabel} code is:</p>
      <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px;
                  padding: 20px; background: #f0f9f4; border-radius: 8px;
                  text-align: center; color: #1a6b3a;">
        ${otp}
      </div>
      <p>This code expires in <strong>10 minutes</strong>.</p>
      <p>If you did not request this, please ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #888;">Centre Zad Al-Imane Donation Portal</p>
    </div>
  `;

  if (!hasSmtp || !transporter) {
    logger.warn(`[DEV MODE] OTP for ${email} (${purposeLabel}): ${otp}`);
    return;
  }

  try {
    await transporter.sendMail({
      from: config.EMAIL_FROM,
      to: email,
      subject,
      html,
    });
    logger.info('OTP email sent', { email, purpose });
  } catch (err) {
    logger.error('Failed to send OTP email', { email, error: err.message });
    throw err;
  }
};

module.exports = { sendOtpEmail };
