/**
 * Professional Email Templates for QR Studio
 * Beautiful, responsive email templates with modern design
 */

/**
 * Get current date in readable format
 * @returns {string} Formatted date
 */
const getCurrentDate = () => {
  return new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Get user's browser and location info (mock data for now)
 * In production, you would extract this from request headers
 * @param {object} req - Request object
 * @returns {object} Browser and location info
 */
const getRequestInfo = (req = null) => {
  // In production, extract from req.headers
  return {
    browser: 'Chrome',
    location: 'Unknown',
    ip: '***.***.***'
  };
};
 
/**
 * Password Reset OTP Email Template
 * Professional template matching the provided design
 */
const passwordResetOTPTemplate = (email, otp) => {
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Reset Your Password - QR Studio</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #f4f4f5;
      color: #18181b;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    
    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    
    .email-header {
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
      padding: 40px 40px 50px;
      text-align: center;
    }
    
    .lock-icon {
      width: 64px;
      height: 64px;
      background-color: rgba(255,255,255,0.2);
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
    }
    
    .lock-icon svg {
      width: 32px;
      height: 32px;
      fill: #ffffff;
    }
    
    .header-title {
      color: #ffffff;
      font-size: 22px;
      font-weight: 700;
    }
    
    .email-body {
      padding: 40px;
      background-color: #ffffff;
      margin-top: -20px;
      border-radius: 20px 20px 0 0;
      position: relative;
    }
    
    .greeting {
      font-size: 14px;
      color: #71717a;
      margin-bottom: 8px;
    }
    
    .title {
      font-size: 24px;
      font-weight: 700;
      color: #18181b;
      margin-bottom: 16px;
    }
    
    .description {
      font-size: 15px;
      color: #52525b;
      margin-bottom: 32px;
      line-height: 1.7;
    }
    
    .otp-container {
      background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
      border: 2px dashed #fca5a5;
      border-radius: 16px;
      padding: 32px;
      text-align: center;
      margin-bottom: 32px;
    }
    
    .otp-label {
      font-size: 12px;
      font-weight: 600;
      color: #dc2626;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 12px;
    }
    
    .otp-code {
      font-size: 42px;
      font-weight: 700;
      color: #dc2626;
      letter-spacing: 8px;
      font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
    }
    
    .otp-expiry {
      font-size: 13px;
      color: #71717a;
      margin-top: 16px;
    }
    
    .otp-expiry strong {
      color: #dc2626;
    }
    
    .alert-box {
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      border-left: 4px solid #dc2626;
      padding: 16px 20px;
      border-radius: 0 12px 12px 0;
      margin-bottom: 32px;
    }
    
    .alert-title {
      font-size: 14px;
      font-weight: 600;
      color: #991b1b;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .alert-text {
      font-size: 13px;
      color: #b91c1c;
      line-height: 1.5;
    }
    
    .info-box {
      background-color: #f4f4f5;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }
    
    .info-title {
      font-size: 13px;
      font-weight: 600;
      color: #52525b;
      margin-bottom: 12px;
    }
    
    .info-row {
      font-size: 13px;
      color: #71717a;
      margin-bottom: 6px;
      padding-left: 20px;
      position: relative;
    }
    
    .info-row:before {
      content: "•";
      position: absolute;
      left: 8px;
    }
    
    .info-row:last-child {
      margin-bottom: 0;
    }
    
    .divider {
      height: 1px;
      background-color: #e4e4e7;
      margin: 24px 0;
    }
    
    .help-text {
      font-size: 13px;
      color: #71717a;
      text-align: center;
      line-height: 1.6;
    }
    
    .help-text a {
      color: #7c3aed;
      text-decoration: none;
      font-weight: 500;
    }
    
    .email-footer {
      background-color: #fafafa;
      padding: 32px 40px;
      text-align: center;
      border-top: 1px solid #e4e4e7;
    }
    
    .footer-logo {
      width: 32px;
      height: 32px;
      margin-bottom: 16px;
    }
    
    .footer-brand {
      font-size: 14px;
      font-weight: 600;
      color: #18181b;
      margin-bottom: 8px;
    }
    
    .footer-tagline {
      font-size: 12px;
      color: #71717a;
      margin-bottom: 20px;
    }
    
    .footer-links {
      margin-bottom: 16px;
    }
    
    .footer-link {
      font-size: 12px;
      color: #71717a;
      text-decoration: none;
      margin: 0 12px;
    }
    
    .copyright {
      font-size: 11px;
      color: #a1a1aa;
    }
    
    @media only screen and (max-width: 600px) {
      .email-wrapper {
        width: 100% !important;
      }
      
      .email-header, .email-body, .email-footer {
        padding: 24px !important;
      }
      
      .title {
        font-size: 20px !important;
      }
      
      .otp-code {
        font-size: 28px !important;
        letter-spacing: 4px !important;
      }
    }
  </style>
</head>
<body>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" class="email-wrapper" width="600" cellspacing="0" cellpadding="0">
          <!-- Header -->
          <tr>
            <td class="email-header">
              <div class="lock-icon">
                <img src="https://res.cloudinary.com/dj3xx136b/image/upload/v1767616557/tohynya5xavebftekbwr.png" alt="QR Studio" style="width: 48px; height: 48px; border-radius: 8px;">
              </div>
              <div class="header-title">QR Studio</div>
              <div style="color: rgba(255,255,255,0.8); font-size: 14px; font-weight: 400; margin-top: 4px;">Password Reset Request</div>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td class="email-body">
              <p class="greeting">Hello,</p>
              <h1 class="title">Reset Your Password</h1>
              <p class="description">
                We received a request to reset the password for the QR Studio account associated with <strong>${email}</strong>. Use the code below to complete the password reset:
              </p>
              
              <!-- OTP Code -->
              <div class="otp-container">
                <div class="otp-label">Password Reset Code</div>
                <div class="otp-code">${otp}</div>
                <div class="otp-expiry">This code expires in <strong>10 minutes</strong></div>
              </div>
              
              <!-- Security Alert -->
              <div class="alert-box">
                <div class="alert-title">
                  Important Security Notice
                </div>
                <p class="alert-text">
                  If you did not request a password reset, please ignore this email or contact support immediately. Your account may be at risk.
                </p>
              </div>
              
              <div class="divider"></div>
              
              <p class="help-text">
                If you did not make this request, your account is still secure. No changes have been made.<br><br>
                Need help? <a href="https://qr-craft-studio.vercel.app/contact">Contact our support team</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td class="email-footer">
              <img src="https://res.cloudinary.com/dj3xx136b/image/upload/v1767616557/tohynya5xavebftekbwr.png" alt="QR Studio" class="footer-logo">
              <div class="footer-brand">QR Studio</div>
              <div class="footer-tagline">Professional QR Code Solutions</div>
              
              <div class="footer-links">
                <a href="https://qr-craft-studio.vercel.app/privacy" class="footer-link">Privacy Policy</a>
                <a href="https://qr-craft-studio.vercel.app/terms" class="footer-link">Terms of Service</a>
                <a href="https://qr-craft-studio.vercel.app/contact" class="footer-link">Contact Us</a>
              </div>
              
              <p class="copyright">
                © 2026 QR Studio. All rights reserved.<br>
                winning11.in@gmail.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * Email Verification OTP Template
 * Clean, professional verification email
 */
const emailVerificationTemplate = (email, otp) => {
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Verify Your Email - QR Studio</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #f4f4f5;
      color: #18181b;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    
    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    
    .email-header {
      background: linear-gradient(135deg, #0f766e 0%, #0d9488 100%);
      padding: 40px 40px 50px;
      text-align: center;
    }
    
    .verify-icon {
      width: 64px;
      height: 64px;
      background-color: rgba(255,255,255,0.2);
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
    }
    
    .verify-icon svg {
      width: 32px;
      height: 32px;
      fill: #ffffff;
    }
    
    .header-title {
      color: #ffffff;
      font-size: 22px;
      font-weight: 700;
    }
    
    .email-body {
      padding: 40px;
      background-color: #ffffff;
      margin-top: -20px;
      border-radius: 20px 20px 0 0;
      position: relative;
    }
    
    .greeting {
      font-size: 14px;
      color: #71717a;
      margin-bottom: 8px;
    }
    
    .title {
      font-size: 24px;
      font-weight: 700;
      color: #18181b;
      margin-bottom: 16px;
    }
    
    .description {
      font-size: 15px;
      color: #52525b;
      margin-bottom: 32px;
      line-height: 1.7;
    }
    
    .otp-container {
      background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%);
      border: 2px dashed #5eead4;
      border-radius: 16px;
      padding: 32px;
      text-align: center;
      margin-bottom: 32px;
    }
    
    .otp-label {
      font-size: 12px;
      font-weight: 600;
      color: #0f766e;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 12px;
    }
    
    .otp-code {
      font-size: 42px;
      font-weight: 700;
      color: #0f766e;
      letter-spacing: 8px;
      font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
    }
    
    .otp-expiry {
      font-size: 13px;
      color: #71717a;
      margin-top: 16px;
    }
    
    .otp-expiry strong {
      color: #0f766e;
    }
    
    .success-box {
      background-color: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-left: 4px solid #16a34a;
      padding: 16px 20px;
      border-radius: 0 12px 12px 0;
      margin-bottom: 32px;
    }
    
    .success-title {
      font-size: 14px;
      font-weight: 600;
      color: #15803d;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .success-text {
      font-size: 13px;
      color: #16a34a;
      line-height: 1.5;
    }
    
    .divider {
      height: 1px;
      background-color: #e4e4e7;
      margin: 24px 0;
    }
    
    .help-text {
      font-size: 13px;
      color: #71717a;
      text-align: center;
      line-height: 1.6;
    }
    
    .help-text a {
      color: #7c3aed;
      text-decoration: none;
      font-weight: 500;
    }
    
    .email-footer {
      background-color: #fafafa;
      padding: 32px 40px;
      text-align: center;
      border-top: 1px solid #e4e4e7;
    }
    
    .footer-logo {
      width: 32px;
      height: 32px;
      margin-bottom: 16px;
    }
    
    .footer-brand {
      font-size: 14px;
      font-weight: 600;
      color: #18181b;
      margin-bottom: 8px;
    }
    
    .footer-tagline {
      font-size: 12px;
      color: #71717a;
      margin-bottom: 20px;
    }
    
    .footer-links {
      margin-bottom: 16px;
    }
    
    .footer-link {
      font-size: 12px;
      color: #71717a;
      text-decoration: none;
      margin: 0 12px;
    }
    
    .copyright {
      font-size: 11px;
      color: #a1a1aa;
    }
    
    @media only screen and (max-width: 600px) {
      .email-wrapper {
        width: 100% !important;
      }
      
      .email-header, .email-body, .email-footer {
        padding: 24px !important;
      }
      
      .title {
        font-size: 20px !important;
      }
      
      .otp-code {
        font-size: 28px !important;
        letter-spacing: 4px !important;
      }
    }
  </style>
</head>
<body>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" class="email-wrapper" width="600" cellspacing="0" cellpadding="0">
          <!-- Header -->
          <tr>
            <td class="email-header">
              <div class="verify-icon">
                <img src="https://res.cloudinary.com/dj3xx136b/image/upload/v1767616557/tohynya5xavebftekbwr.png" alt="QR Studio" style="width: 48px; height: 48px; border-radius: 8px;">
              </div>
              <div class="header-title">QR Studio</div>
              <div style="color: rgba(255,255,255,0.8); font-size: 14px; font-weight: 400; margin-top: 4px;">Email Verification</div>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td class="email-body">
              <p class="greeting">Welcome to QR Studio!</p>
              <h1 class="title">Verify Your Email Address</h1>
              <p class="description">
                Thank you for signing up with QR Studio! Please verify your email address <strong>${email}</strong> by entering the verification code below:
              </p>
              
              <!-- OTP Code -->
              <div class="otp-container">
                <div class="otp-label">Verification Code</div>
                <div class="otp-code">${otp}</div>
                <div class="otp-expiry">This code expires in <strong>10 minutes</strong></div>
              </div>
              
              <!-- Success Box -->
              <div class="success-box">
                <div class="success-title">
                  Almost There!
                </div>
                <p class="success-text">
                  Once verified, you'll have full access to all QR Studio features including creating unlimited custom QR codes.
                </p>
              </div>
              
              <div class="divider"></div>
              
              <p class="help-text">
                Didn't sign up for QR Studio? You can safely ignore this email.<br><br>
                Need help? <a href="https://qr-craft-studio.vercel.app/contact">Contact our support team</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td class="email-footer">
              <img src="https://res.cloudinary.com/dj3xx136b/image/upload/v1767616557/tohynya5xavebftekbwr.png" alt="QR Studio" class="footer-logo">
              <div class="footer-brand">QR Studio</div>
              <div class="footer-tagline">Professional QR Code Solutions</div>
              
              <div class="footer-links">
                <a href="https://qr-craft-studio.vercel.app/privacy" class="footer-link">Privacy Policy</a>
                <a href="https://qr-craft-studio.vercel.app/terms" class="footer-link">Terms of Service</a>
                <a href="https://qr-craft-studio.vercel.app/contact" class="footer-link">Contact Us</a>
              </div>
              
              <p class="copyright">
                © 2026 QR Studio. All rights reserved.<br>
                winning11.in@gmail.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * Enhanced Welcome Email Template - PROFESSIONAL DESIGN
 * Beautiful onboarding email for new users with prominent logo and comprehensive features
 */
const welcomeEmailTemplate = (userName, email) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Welcome to QR Studio</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #f4f4f5;
      color: #18181b;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    
    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    
    .email-header {
      background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
      padding: 40px 40px 50px;
      text-align: center;
    }
    
    .welcome-icon {
      width: 64px;
      height: 64px;
      background-color: rgba(255,255,255,0.2);
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
    }
    
    .welcome-icon svg {
      width: 32px;
      height: 32px;
      fill: #ffffff;
    }
    
    .header-title {
      color: #ffffff;
      font-size: 22px;
      font-weight: 700;
    }
    
    .email-body {
      padding: 40px;
      background-color: #ffffff;
      margin-top: -20px;
      border-radius: 20px 20px 0 0;
      position: relative;
    }
    
    .greeting {
      font-size: 14px;
      color: #71717a;
      margin-bottom: 8px;
    }
    
    .title {
      font-size: 24px;
      font-weight: 700;
      color: #18181b;
      margin-bottom: 16px;
    }
    
    .description {
      font-size: 15px;
      color: #52525b;
      margin-bottom: 32px;
      line-height: 1.7;
    }
    
    .cta-button {
      background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
      color: white;
      padding: 16px 32px;
      text-decoration: none;
      border-radius: 12px;
      display: inline-block;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
      margin: 24px 0;
    }
    
    .features-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin: 32px 0;
    }
    
    .feature-card {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
    }
    
    .feature-icon {
      font-size: 14px;
      font-weight: 600;
      color: #7c3aed;
      margin-bottom: 12px;
      background-color: #ede9fe;
      padding: 8px 12px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .feature-title {
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 8px;
    }
    
    .feature-desc {
      font-size: 12px;
      color: #64748b;
      line-height: 1.4;
    }
    
    .next-steps {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border-radius: 12px;
      padding: 24px;
      margin: 32px 0;
      text-align: center;
    }
    
    .next-steps h3 {
      color: #0369a1;
      margin-bottom: 12px;
      font-size: 16px;
    }
    
    .next-steps p {
      color: #0284c7;
      font-size: 14px;
      margin-bottom: 16px;
    }
    
    .action-buttons {
      display: flex;
      justify-content: space-around;
      flex-wrap: wrap;
      gap: 12px;
    }
    
    .action-button {
      padding: 8px 16px;
      text-decoration: none;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      color: white;
    }
    
    .btn-primary { background: #0ea5e9; }
    .btn-secondary { background: #7c3aed; }
    .btn-success { background: #059669; }
    
    .divider {
      height: 1px;
      background-color: #e4e4e7;
      margin: 24px 0;
    }
    
    .help-text {
      font-size: 13px;
      color: #71717a;
      text-align: center;
      line-height: 1.6;
    }
    
    .help-text a {
      color: #7c3aed;
      text-decoration: none;
      font-weight: 500;
    }
    
    .email-footer {
      background-color: #fafafa;
      padding: 32px 40px;
      text-align: center;
      border-top: 1px solid #e4e4e7;
    }
    
    .footer-logo {
      width: 32px;
      height: 32px;
      margin-bottom: 16px;
    }
    
    .footer-brand {
      font-size: 14px;
      font-weight: 600;
      color: #18181b;
      margin-bottom: 8px;
    }
    
    .footer-tagline {
      font-size: 12px;
      color: #71717a;
      margin-bottom: 20px;
    }
    
    .footer-links {
      margin-bottom: 16px;
    }
    
    .footer-link {
      font-size: 12px;
      color: #71717a;
      text-decoration: none;
      margin: 0 12px;
    }
    
    .copyright {
      font-size: 11px;
      color: #a1a1aa;
    }
    
    @media only screen and (max-width: 600px) {
      .email-wrapper {
        width: 100% !important;
      }
      
      .email-header, .email-body, .email-footer {
        padding: 24px !important;
      }
      
      .title {
        font-size: 20px !important;
      }
      
      .features-grid {
        grid-template-columns: 1fr !important;
        gap: 16px !important;
      }
      
      .action-buttons {
        flex-direction: column;
        align-items: center;
      }
      
      .action-button {
        width: 200px;
        text-align: center;
      }
    }
  </style>
</head>
<body>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" class="email-wrapper" width="600" cellspacing="0" cellpadding="0">
          <!-- Header -->
          <tr>
            <td class="email-header">
              <div class="welcome-icon">
                <img src="https://res.cloudinary.com/dj3xx136b/image/upload/v1767616557/tohynya5xavebftekbwr.png" alt="QR Studio" style="width: 48px; height: 48px; border-radius: 8px;">
              </div>
              <div class="header-title">QR Studio</div>
              <div style="color: rgba(255,255,255,0.8); font-size: 14px; font-weight: 400; margin-top: 4px;">Welcome to QR Studio!</div>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td class="email-body">
              <p class="greeting">Hello ${userName}!</p>
              <h1 class="title">Welcome to QR Studio</h1>
              <p class="description">
                Thank you for joining QR Studio! We're excited to help you create beautiful, trackable QR codes that elevate your business and personal projects.
              </p>
              
              <center>
                <a href="https://qr-craft-studio.vercel.app/dashboard" class="cta-button">Start Creating QR Codes</a>
              </center>
              
              <!-- Enhanced Features Grid -->
              <div class="features-grid">
                <div class="feature-card">
                  <div class="feature-icon">Custom</div>
                  <div class="feature-title">Custom Designs</div>
                  <div class="feature-desc">Beautiful QR codes with custom colors, logos, frames, and patterns</div>
                </div>
                
                <div class="feature-card">
                  <div class="feature-icon">Analytics</div>
                  <div class="feature-title">Smart Analytics</div>
                  <div class="feature-desc">Track scans, locations, devices, and user engagement in real-time</div>
                </div>
                
                <div class="feature-card">
                  <div class="feature-icon">Dynamic</div>
                  <div class="feature-title">Dynamic QR Codes</div>
                  <div class="feature-desc">Update content without reprinting - perfect for campaigns</div>
                </div>
                
                <div class="feature-card">
                  <div class="feature-icon">Bulk</div>
                  <div class="feature-title">Bulk Generation</div>
                  <div class="feature-desc">Create hundreds of QR codes at once with CSV import</div>
                </div>
                
                <div class="feature-card">
                  <div class="feature-icon">Export</div>
                  <div class="feature-title">High Quality Export</div>
                  <div class="feature-desc">Download in PNG, SVG, PDF formats up to 4K resolution</div>
                </div>
                
                <div class="feature-card">
                  <div class="feature-icon">Types</div>
                  <div class="feature-title">20+ QR Types</div>
                  <div class="feature-desc">URL, WiFi, vCard, SMS, Email, WhatsApp, and more</div>
                </div>
              </div>
              
              <!-- What's Next Section -->
              <div class="next-steps">
                <h3>What's Next?</h3>
                <p>Get started with these quick actions:</p>
                <div class="action-buttons">
                  <a href="https://qr-craft-studio.vercel.app/create" class="action-button btn-primary">Create First QR</a>
                  <a href="https://qr-craft-studio.vercel.app/templates" class="action-button btn-secondary">Browse Templates</a>
                  <a href="https://qr-craft-studio.vercel.app/analytics" class="action-button btn-success">View Analytics</a>
                </div>
              </div>
              
              <div class="divider"></div>
              
              <p class="help-text">
                Need help getting started? <a href="https://qr-craft-studio.vercel.app/contact">Contact our support team</a><br>
                or check out our <a href="https://qr-craft-studio.vercel.app/help">getting started guide</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td class="email-footer">
              <img src="https://res.cloudinary.com/dj3xx136b/image/upload/v1767616557/tohynya5xavebftekbwr.png" alt="QR Studio" class="footer-logo">
              <div class="footer-brand">QR Studio</div>
              <div class="footer-tagline">Professional QR Code Solutions</div>
              
              <div class="footer-links">
                <a href="https://qr-craft-studio.vercel.app/privacy" class="footer-link">Privacy Policy</a>
                <a href="https://qr-craft-studio.vercel.app/terms" class="footer-link">Terms of Service</a>
                <a href="https://qr-craft-studio.vercel.app/contact" class="footer-link">Contact Us</a>
              </div>
              
              <p class="copyright">
                © 2026 QR Studio. All rights reserved.<br>
                winning11.in@gmail.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * Account Notification Email Template
 * For important account updates and security notifications
 */
const accountNotificationTemplate = (title, message, type = 'info', actionUrl = null, actionText = null) => {
  // Define color scheme based on notification type
  const typeColors = {
    info: { bg: '#f0f9ff', border: '#0ea5e9', text: '#0369a1' },
    success: { bg: '#f0fdf4', border: '#22c55e', text: '#16a34a' },
    warning: { bg: '#fefce8', border: '#eab308', text: '#a16207' },
    danger: { bg: '#fef2f2', border: '#ef4444', text: '#dc2626' }
  };
  
  const colors = typeColors[type] || typeColors.info;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title} - QR Studio</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #f4f4f5;
      color: #18181b;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    
    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    
    .email-header {
      background: linear-gradient(135deg, ${colors.border} 0%, ${colors.text} 100%);
      padding: 40px 40px 50px;
      text-align: center;
    }
    
    .notification-icon {
      width: 64px;
      height: 64px;
      background-color: rgba(255,255,255,0.2);
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
    }
    
    .notification-icon svg {
      width: 32px;
      height: 32px;
      fill: #ffffff;
    }
    
    .header-title {
      color: #ffffff;
      font-size: 22px;
      font-weight: 700;
    }
    
    .email-body {
      padding: 40px;
      background-color: #ffffff;
      margin-top: -20px;
      border-radius: 20px 20px 0 0;
      position: relative;
    }
    
    .title {
      font-size: 24px;
      font-weight: 700;
      color: #18181b;
      margin-bottom: 16px;
    }
    
    .message {
      font-size: 15px;
      color: #52525b;
      margin-bottom: 32px;
      line-height: 1.7;
    }
    
    .action-button {
      background: linear-gradient(135deg, ${colors.border} 0%, ${colors.text} 100%);
      color: white;
      padding: 16px 32px;
      text-decoration: none;
      border-radius: 12px;
      display: inline-block;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
      margin: 24px 0;
    }
    
    .notification-box {
      background-color: ${colors.bg};
      border: 1px solid ${colors.border};
      border-left: 4px solid ${colors.border};
      padding: 20px;
      border-radius: 0 12px 12px 0;
      margin-bottom: 24px;
    }
    
    .notification-box h3 {
      color: ${colors.text};
      font-size: 16px;
      margin-bottom: 8px;
    }
    
    .notification-box p {
      color: ${colors.text};
      font-size: 14px;
      line-height: 1.5;
    }
    
    .divider {
      height: 1px;
      background-color: #e4e4e7;
      margin: 24px 0;
    }
    
    .help-text {
      font-size: 13px;
      color: #71717a;
      text-align: center;
      line-height: 1.6;
    }
    
    .help-text a {
      color: #7c3aed;
      text-decoration: none;
      font-weight: 500;
    }
    
    .email-footer {
      background-color: #fafafa;
      padding: 32px 40px;
      text-align: center;
      border-top: 1px solid #e4e4e7;
    }
    
    .footer-logo {
      width: 32px;
      height: 32px;
      margin-bottom: 16px;
    }
    
    .footer-brand {
      font-size: 14px;
      font-weight: 600;
      color: #18181b;
      margin-bottom: 8px;
    }
    
    .footer-tagline {
      font-size: 12px;
      color: #71717a;
      margin-bottom: 20px;
    }
    
    .footer-links {
      margin-bottom: 16px;
    }
    
    .footer-link {
      font-size: 12px;
      color: #71717a;
      text-decoration: none;
      margin: 0 12px;
    }
    
    .copyright {
      font-size: 11px;
      color: #a1a1aa;
    }
    
    @media only screen and (max-width: 600px) {
      .email-wrapper {
        width: 100% !important;
      }
      
      .email-header, .email-body, .email-footer {
        padding: 24px !important;
      }
      
      .title {
        font-size: 20px !important;
      }
    }
  </style>
</head>
<body>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" class="email-wrapper" width="600" cellspacing="0" cellpadding="0">
          <!-- Header -->
          <tr>
            <td class="email-header">
              <div class="notification-icon">
                <img src="https://res.cloudinary.com/dj3xx136b/image/upload/v1767616557/tohynya5xavebftekbwr.png" alt="QR Studio" style="width: 48px; height: 48px; border-radius: 8px;">
              </div>
              <div class="header-title">QR Studio</div>
              <div style="color: rgba(255,255,255,0.8); font-size: 14px; font-weight: 400; margin-top: 4px;">Account Notification</div>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td class="email-body">
              <h1 class="title">${title}</h1>
              <p class="message">${message}</p>
              
              ${actionUrl && actionText ? `
                <center>
                  <a href="${actionUrl}" class="action-button">${actionText}</a>
                </center>
              ` : ''}
              
              <div class="notification-box">
                <h3>Important Information</h3>
                <p>This notification was sent to keep you informed about important changes to your QR Studio account.</p>
              </div>
              
              <div class="divider"></div>
              
              <p class="help-text">
                Questions about this notification? <a href="https://qr-craft-studio.vercel.app/contact">Contact our support team</a><br>
                or visit our <a href="https://qr-craft-studio.vercel.app/help">help center</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td class="email-footer">
              <img src="https://res.cloudinary.com/dj3xx136b/image/upload/v1767616557/tohynya5xavebftekbwr.png" alt="QR Studio" class="footer-logo">
              <div class="footer-brand">QR Studio</div>
              <div class="footer-tagline">Professional QR Code Solutions</div>
              
              <div class="footer-links">
                <a href="https://qr-craft-studio.vercel.app/privacy" class="footer-link">Privacy Policy</a>
                <a href="https://qr-craft-studio.vercel.app/terms" class="footer-link">Terms of Service</a>
                <a href="https://qr-craft-studio.vercel.app/contact" class="footer-link">Contact Us</a>
              </div>
              
              <p class="copyright">
                © 2026 QR Studio. All rights reserved.<br>
                winning11.in@gmail.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * Professional Invoice Email Template
 * Clean invoice design matching the provided specification
 */
const invoiceEmailTemplate = (invoiceData) => {
  const {
    invoiceNumber,
    invoiceDate,
    orderId,
    customerName,
    customerEmail,
    description,
    plan,
    amount,
    totalAmount,
    paymentStatus = 'PAID'
  } = invoiceData;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Invoice - QR Studio</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #f8fafc;
      color: #1e293b;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    
    .email-wrapper {
      max-width: 700px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 16px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    
    .invoice-header {
      background-color: #ffffff;
      padding: 40px 40px 20px;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .company-info {
      display: flex;
      align-items: center;
      margin-bottom: 32px;
    }
    
    .company-logo {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      margin-right: 16px;
    }
    
    .company-details h1 {
      font-size: 24px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 4px;
    }
    
    .company-tagline {
      font-size: 14px;
      color: #64748b;
      font-weight: 500;
    }
    
    .invoice-title {
      text-align: center;
      margin-bottom: 32px;
    }
    
    .invoice-title h2 {
      font-size: 32px;
      font-weight: 700;
      color: #1e293b;
      letter-spacing: -0.5px;
    }
    
    .invoice-body {
      padding: 0 40px 40px;
    }
    
    .invoice-details-section {
      background-color: #f8fafc;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 32px;
      border: 1px solid #e2e8f0;
    }
    
    .section-header {
      display: flex;
      align-items: center;
      margin-bottom: 20px;
    }
    
    .section-icon {
      width: 20px;
      height: 20px;
      margin-right: 8px;
      color: #64748b;
    }
    
    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #334155;
    }
    
    .invoice-meta {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
    }
    
    .meta-item {
      display: flex;
      flex-direction: column;
    }
    
    .meta-label {
      font-size: 12px;
      font-weight: 500;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    
    .meta-value {
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
    }
    
    .bill-to-section {
      margin-bottom: 32px;
    }
    
    .bill-to-header {
      font-size: 18px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 16px;
    }
    
    .customer-info {
      background-color: #f8fafc;
      border-radius: 12px;
      padding: 20px;
      border: 1px solid #e2e8f0;
    }
    
    .customer-name {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
    }
    
    .customer-avatar {
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 14px;
      margin-right: 12px;
    }
    
    .customer-details h3 {
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 2px;
    }
    
    .customer-email {
      font-size: 14px;
      color: #64748b;
    }
    
    .invoice-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    }
    
    .invoice-table thead {
      background-color: #f8fafc;
    }
    
    .invoice-table th {
      padding: 16px 20px;
      text-align: left;
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .invoice-table td {
      padding: 20px;
      font-size: 14px;
      color: #374151;
      border-bottom: 1px solid #f3f4f6;
    }
    
    .invoice-table tr:last-child td {
      border-bottom: none;
    }
    
    .description-cell {
      font-weight: 500;
      color: #1f2937;
    }
    
    .plan-cell {
      color: #6b7280;
    }
    
    .amount-cell {
      font-weight: 600;
      color: #1f2937;
      text-align: right;
    }
    
    .total-section {
      text-align: right;
      margin-bottom: 24px;
    }
    
    .total-row {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      margin-bottom: 16px;
    }
    
    .total-label {
      font-size: 18px;
      font-weight: 600;
      color: #1e293b;
      margin-right: 32px;
    }
    
    .total-amount {
      font-size: 24px;
      font-weight: 700;
      color: #059669;
    }
    
    .payment-status {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 32px;
    }
    
    .status-badge {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .thank-you-section {
      text-align: center;
      margin-bottom: 32px;
    }
    
    .thank-you-title {
      font-size: 20px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 12px;
    }
    
    .support-info {
      font-size: 14px;
      color: #64748b;
      line-height: 1.5;
    }
    
    .support-email {
      color: #059669;
      text-decoration: none;
      font-weight: 600;
    }
    
    .invoice-footer {
      background-color: #f8fafc;
      padding: 32px 40px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    
    .footer-text {
      font-size: 12px;
      color: #64748b;
      margin-bottom: 8px;
    }
    
    .footer-email {
      font-size: 12px;
      color: #374151;
      font-weight: 500;
    }
    
    @media only screen and (max-width: 768px) {
      .email-wrapper {
        margin: 20px;
        border-radius: 12px;
      }
      
      .invoice-header, .invoice-body, .invoice-footer {
        padding: 24px !important;
      }
      
      .invoice-meta {
        grid-template-columns: 1fr !important;
        gap: 12px !important;
      }
      
      .company-info {
        flex-direction: column;
        align-items: flex-start;
        text-align: left;
      }
      
      .company-logo {
        margin-right: 0;
        margin-bottom: 12px;
      }
      
      .invoice-table th,
      .invoice-table td {
        padding: 12px 16px !important;
        font-size: 13px !important;
      }
      
      .total-row {
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
      }
      
      .total-label {
        margin-right: 0;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <!-- Header -->
    <div class="invoice-header">
      <div class="company-info">
        <img src="https://res.cloudinary.com/dj3xx136b/image/upload/v1767616557/tohynya5xavebftekbwr.png" alt="QR Studio" class="company-logo">
        <div class="company-details">
          <h1>QR Studio</h1>
          <div class="company-tagline">Digital Solutions Provider</div>
        </div>
      </div>
      
      <div class="invoice-title">
        <h2>INVOICE</h2>
      </div>
    </div>

    <!-- Body -->
    <div class="invoice-body">
      <!-- Invoice Details -->
      <div class="invoice-details-section">
        <div class="section-header">
          <svg class="section-icon" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
          </svg>
          <div class="section-title">Invoice Details</div>
        </div>
        
        <div class="invoice-meta">
          <div class="meta-item">
            <div class="meta-label">Invoice Number:</div>
            <div class="meta-value">\${invoiceNumber}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Invoice Date:</div>
            <div class="meta-value">\${invoiceDate}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Order ID:</div>
            <div class="meta-value">\${orderId}</div>
          </div>
        </div>
      </div>

      <!-- Bill To -->
      <div class="bill-to-section">
        <h3 class="bill-to-header">Bill To:</h3>
        <div class="customer-info">
          <div class="customer-name">
            <div class="customer-avatar">\${customerName.charAt(0).toUpperCase()}</div>
            <div class="customer-details">
              <h3>\${customerName}</h3>
              <div class="customer-email">\${customerEmail}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Invoice Table -->
      <table class="invoice-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Plan</th>
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="description-cell">\${description}</td>
            <td class="plan-cell">\${plan}</td>
            <td class="amount-cell">$\${amount}</td>
          </tr>
        </tbody>
      </table>

      <!-- Total -->
      <div class="total-section">
        <div class="total-row">
          <div class="total-label">Total Amount:</div>
          <div class="total-amount">$\${totalAmount}</div>
        </div>
      </div>

      <!-- Payment Status -->
      <div class="payment-status">
        <div class="status-badge">Payment Status: \${paymentStatus}</div>
      </div>

      <!-- Thank You -->
      <div class="thank-you-section">
        <h3 class="thank-you-title">Thank you for your business!</h3>
        <p class="support-info">
          For any queries, please contact<br>
          <a href="mailto:support@qrstudio.com" class="support-email">support@qrstudio.com</a>
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div class="invoice-footer">
      <div class="footer-text">© 2026 QR Studio. All rights reserved.</div>
      <div class="footer-email">winning11.in@gmail.com</div>
    </div>
  </div>
</body>
</html>`;
};

// Export all templates
export {
  passwordResetOTPTemplate,
  emailVerificationTemplate,
  welcomeEmailTemplate,
  accountNotificationTemplate,
  invoiceEmailTemplate,
  getCurrentDate,
  getRequestInfo
};