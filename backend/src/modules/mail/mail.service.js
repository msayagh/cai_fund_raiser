'use strict';

const nodemailer = require('nodemailer');

let transporter = null;

/**
 * Initialize email transporter based on environment variables
 */
function initializeTransporter() {
    // For development, use test accounts or SMTP relay
    // For production, use your email provider (SendGrid, AWS SES, etc.)

    const emailProvider = process.env.EMAIL_PROVIDER || 'smtp';

    if (emailProvider === 'test') {
        // Test account for development
        return nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: process.env.ETHEREAL_USER || 'test@ethereal.email',
                pass: process.env.ETHEREAL_PASSWORD || 'test',
            },
        });
    } else {
        // Production SMTP
        return nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.EMAIL_PORT || '587'),
            secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD,
            },
        });
    }
}

/**
 * Get or initialize transporter
 */
function getTransporter() {
    if (!transporter) {
        transporter = initializeTransporter();
    }
    return transporter;
}

/**
 * Send email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML email body
 * @param {string} text - Plain text email body (optional)
 * @returns {Promise<object>} Send result
 */
async function sendEmail(to, subject, html, text = null) {
    try {
        const transporter = getTransporter();

        const mailOptions = {
            from: process.env.EMAIL_FROM || 'noreply@centrezadalimane.org',
            to,
            subject,
            html,
            ...(text && { text }),
        };

        const info = await transporter.sendMail(mailOptions);

        console.log(`✓ Email sent to ${to}: ${info.messageId}`);
        return {
            success: true,
            messageId: info.messageId,
            response: info.response,
        };
    } catch (err) {
        console.error(`✗ Email failed to ${to}:`, err.message);
        return {
            success: false,
            error: err.message,
        };
    }
}

/**
 * Send registration confirmation email
 */
async function sendRegistrationConfirmation(email, name) {
    const { registrationConfirmationTemplate } = require('./mail.templates');
    const html = registrationConfirmationTemplate({ email, name });

    return sendEmail(
        email,
        'Welcome to Centre Zad Al-Imane - Account Created',
        html
    );
}

/**
 * Send password reset email
 */
async function sendPasswordReset(email, name, resetLink) {
    const { passwordResetTemplate } = require('./mail.templates');
    const html = passwordResetTemplate({ email, name, resetLink });

    return sendEmail(
        email,
        'Reset Your Password - Centre Zad Al-Imane',
        html
    );
}

/**
 * Send payment confirmation email
 */
async function sendPaymentConfirmation(email, name, paymentDetails) {
    const { paymentConfirmationTemplate } = require('./mail.templates');
    const html = paymentConfirmationTemplate({ email, name, ...paymentDetails });

    return sendEmail(
        email,
        'Payment Received - Centre Zad Al-Imane',
        html
    );
}

/**
 * Send request status update email
 */
async function sendRequestStatusUpdate(email, name, requestDetails) {
    const { requestStatusTemplate } = require('./mail.templates');
    const html = requestStatusTemplate({ email, name, ...requestDetails });

    return sendEmail(
        email,
        `Request ${requestDetails.status} - Centre Zad Al-Imane`,
        html
    );
}

/**
 * Send admin account creation email
 */
async function sendAdminAccountCreation(email, name, password) {
    const { adminAccountTemplate } = require('./mail.templates');
    const html = adminAccountTemplate({ email, name, password });

    return sendEmail(
        email,
        'Admin Account Created - Centre Zad Al-Imane',
        html
    );
}

/**
 * Send donor deactivation notification
 */
async function sendDonorDeactivationNotice(email, name, reason = '') {
    const { donorDeactivationTemplate } = require('./mail.templates');
    const html = donorDeactivationTemplate({ email, name, reason });

    return sendEmail(
        email,
        'Account Status Updated - Centre Zad Al-Imane',
        html
    );
}

/**
 * Send recipient email for admin actions
 */
async function sendAdminActionNotification(adminEmail, adminName, actionDetails) {
    const { adminActionTemplate } = require('./mail.templates');
    const html = adminActionTemplate({ adminEmail, adminName, ...actionDetails });

    return sendEmail(
        adminEmail,
        `Action Notification - ${actionDetails.action} - Centre Zad Al-Imane`,
        html
    );
}

/**
 * Send engagement confirmation email
 */
async function sendEngagementConfirmation(email, name, engagement) {
    const { engagementConfirmationTemplate } = require('./mail.templates');
    const html = engagementConfirmationTemplate({ email, name, ...engagement });

    return sendEmail(
        email,
        'Pledge Confirmation - Centre Zad Al-Imane',
        html
    );
}

module.exports = {
    sendEmail,
    sendRegistrationConfirmation,
    sendPasswordReset,
    sendPaymentConfirmation,
    sendRequestStatusUpdate,
    sendAdminAccountCreation,
    sendDonorDeactivationNotice,
    sendAdminActionNotification,
    sendEngagementConfirmation,
    getTransporter,
    initializeTransporter,
};
