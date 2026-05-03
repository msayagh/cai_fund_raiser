'use strict';

const baseTemplate = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #8B4513; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .header p { margin: 5px 0 0 0; font-size: 14px; opacity: 0.9; }
    .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 8px 8px; }
    .content p { margin: 0 0 15px 0; }
    .cta-button { display: inline-block; background: #8B4513; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 20px 0; }
    .footer { background: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; }
    .section { margin: 20px 0; padding: 15px; background: white; border-left: 4px solid #8B4513; }
    .label { font-weight: bold; color: #8B4513; }
  </style>
</head>
<body>
  <div class="container">
    ${content}
    <div class="footer">
      <p>&copy; 2026 Centre Zad Al-Imane. All rights reserved.</p>
      <p>If you have any questions, please contact us at info@centrezadalimane.org</p>
      <p><a href="https://centrezadalimane.org/unsubscribe">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>
`;

const registrationConfirmationTemplate = ({ email, name }) => baseTemplate(`
  <div class="header">
    <h1>Welcome to Centre Zad Al-Imane</h1>
    <p>Your account has been successfully created</p>
  </div>
  <div class="content">
    <p>Dear ${name},</p>
    <p>Welcome to our community! Your donor account has been successfully created.</p>
    
    <div class="section">
      <p><span class="label">Email:</span> ${email}</p>
      <p>You can now log in to your account and start making pledges and donations.</p>
    </div>
    
    <p><a href="https://centrezadalimane.org/login" class="cta-button">Log In to Your Account</a></p>
    
    <p>If you did not create this account, please contact us immediately at support@centrezadalimane.org</p>
    
    <p>Thank you for supporting Centre Zad Al-Imane!</p>
    <p>Best regards,<br>The Centre Zad Al-Imane Team</p>
  </div>
`);

const paymentConfirmationTemplate = ({ email, name, amount, date, method, pledged, totalPaid, remaining }) => baseTemplate(`
  <div class="header">
    <h1>Payment Received</h1>
    <p>Thank you for your generosity</p>
  </div>
  <div class="content">
    <p>Dear ${name},</p>
    <p>We have received your payment. Thank you for your generous support!</p>
    
    <div class="section">
      <p><span class="label">Amount:</span> $${amount.toFixed(2)}</p>
      <p><span class="label">Date:</span> ${new Date(date).toLocaleDateString()}</p>
      <p><span class="label">Method:</span> ${method}</p>
    </div>
    
    ${pledged ? `
      <div class="section">
        <p><span class="label">Your Pledge Progress</span></p>
        <p>Pledged: $${pledged.toFixed(2)}</p>
        <p>Paid: $${totalPaid.toFixed(2)}</p>
        <p>Remaining: $${Math.max(0, pledged - totalPaid).toFixed(2)}</p>
      </div>
    ` : ''}
    
    <p>Your contribution makes a real difference in our community.</p>
    <p>Best regards,<br>The Centre Zad Al-Imane Team</p>
  </div>
`);

const requestStatusTemplate = ({ email, name, status, requestType, message }) => baseTemplate(`
  <div class="header">
    <h1>Request Status Update</h1>
    <p>Centre Zad Al-Imane</p>
  </div>
  <div class="content">
    <p>Dear ${name},</p>
    <p>We have an update on your recent request.</p>
    
    <div class="section">
      <p><span class="label">Status:</span> <strong>${status.toUpperCase()}</strong></p>
      <p><span class="label">Type:</span> ${requestType}</p>
    </div>
    
    ${message ? `
      <div class="section">
        <p><span class="label">Message:</span></p>
        <p>${message}</p>
      </div>
    ` : ''}
    
    <p>If you have any questions, please contact us at support@centrezadalimane.org</p>
    <p>Best regards,<br>The Centre Zad Al-Imane Team</p>
  </div>
`);

const adminAccountTemplate = ({ email, name }) => baseTemplate(`
  <div class="header">
    <h1>Admin Account Created</h1>
    <p>Centre Zad Al-Imane</p>
  </div>
  <div class="content">
    <p>Dear ${name},</p>
    <p>An admin account has been created for you.</p>

    <div class="section">
      <p><span class="label">Email:</span> ${email}</p>
      <p>Sign in by requesting a one-time code at the login page.</p>
    </div>

    <p><a href="https://centrezadalimane.org/login" class="cta-button">Log In as Admin</a></p>

    <p>Best regards,<br>The Centre Zad Al-Imane Team</p>
  </div>
`);

const donorDeactivationTemplate = ({ email, name, reason }) => baseTemplate(`
  <div class="header">
    <h1>Account Status Updated</h1>
    <p>Centre Zad Al-Imane</p>
  </div>
  <div class="content">
    <p>Dear ${name},</p>
    <p>Your donor account has been deactivated.</p>
    
    ${reason ? `
      <div class="section">
        <p><span class="label">Reason:</span> ${reason}</p>
      </div>
    ` : ''}
    
    <p>If you believe this is an error or would like to reactivate your account, please contact us at support@centrezadalimane.org</p>
    <p>Best regards,<br>The Centre Zad Al-Imane Team</p>
  </div>
`);

const adminActionTemplate = ({ adminEmail, adminName, action, details }) => baseTemplate(`
  <div class="header">
    <h1>Action Notification</h1>
    <p>Centre Zad Al-Imane Admin</p>
  </div>
  <div class="content">
    <p>Dear ${adminName},</p>
    <p>A system action has been recorded.</p>
    
    <div class="section">
      <p><span class="label">Action:</span> ${action}</p>
      <p><span class="label">Details:</span> ${details}</p>
      <p><span class="label">Timestamp:</span> ${new Date().toLocaleString()}</p>
    </div>
    
    <p>If you have any questions, please contact administrator support.</p>
    <p>Best regards,<br>The Centre Zad Al-Imane Systems Team</p>
  </div>
`);

const engagementConfirmationTemplate = ({ email, name, totalPledge, startDate, endDate }) => baseTemplate(`
  <div class="header">
    <h1>Pledge Confirmed</h1>
    <p>Thank you for your commitment</p>
  </div>
  <div class="content">
    <p>Dear ${name},</p>
    <p>Your pledge has been confirmed. We look forward to your support!</p>
    
    <div class="section">
      <p><span class="label">Pledged Amount:</span> $${totalPledge.toFixed(2)}</p>
      <p><span class="label">Start Date:</span> ${new Date(startDate).toLocaleDateString()}</p>
      ${endDate ? `<p><span class="label">End Date:</span> ${new Date(endDate).toLocaleDateString()}</p>` : ''}
    </div>
    
    <p>You will receive payment confirmations for each contribution made towards this pledge.</p>
    <p>Thank you for your generous support!</p>
    <p>Best regards,<br>The Centre Zad Al-Imane Team</p>
  </div>
`);

const donorAccountCreationTemplate = ({ email, name }) => baseTemplate(`
  <div class="header">
    <h1>Welcome to Centre Zad Al-Imane</h1>
    <p>Your donor account has been created</p>
  </div>
  <div class="content">
    <p>Dear ${name},</p>
    <p>Your donor account is ready. Sign in by requesting a one-time code at the login page.</p>

    <div class="section">
      <p><span class="label">Email:</span> ${email}</p>
    </div>

    <p><a href="https://centrezadalimane.org/login" class="cta-button">Log In to Your Account</a></p>

    <p>If you did not request this account, please contact us at support@centrezadalimane.org</p>
    <p>Best regards,<br>The Centre Zad Al-Imane Team</p>
  </div>
`);

module.exports = {
    registrationConfirmationTemplate,
    paymentConfirmationTemplate,
    requestStatusTemplate,
    adminAccountTemplate,
    donorAccountCreationTemplate,
    donorDeactivationTemplate,
    adminActionTemplate,
    engagementConfirmationTemplate,
};
