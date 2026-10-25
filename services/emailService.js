import crypto from 'crypto';
import {
  passwordResetOTPTemplate,
  emailVerificationTemplate,
  welcomeEmailTemplate,
  accountNotificationTemplate
} from './emailTemplates.js';
import { sendMail } from './mailer.js';

// OTP storage (in production, use Redis or database)
const otpStore = new Map();

/**
 * Generate a 6-digit OTP
 * @returns {string} 6-digit OTP
 */
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Store OTP with expiration
 * @param {string} email - User's email
 * @param {string} otp - Generated OTP
 * @param {number} expiryMinutes - OTP expiry time in minutes (default: 10)
 */
const storeOTP = (email, otp, expiryMinutes = 10) => {
  const expiryTime = Date.now() + (expiryMinutes * 60 * 1000);
  const emailKey = email.toLowerCase();

  // Get existing data or initialize
  const existingData = otpStore.get(emailKey) || { requestCount: 0 };

  otpStore.set(emailKey, {
    otp,
    expiryTime,
    attempts: 0,
    requestCount: existingData.requestCount + 1,
    lastRequestTime: Date.now()
  });
};

/**
 * Verify OTP
 * @param {string} email - User's email
 * @param {string} userOTP - OTP entered by user
 * @returns {object} { isValid: boolean, message: string }
 */
const verifyOTP = (email, userOTP) => {
  const emailKey = email.toLowerCase();
  const storedData = otpStore.get(emailKey);

  if (!storedData) {
    return { isValid: false, message: 'OTP not found or expired' };
  }

  // Check if OTP has expired
  if (Date.now() > storedData.expiryTime) {
    otpStore.delete(emailKey);
    return { isValid: false, message: 'OTP has expired' };
  }

  // Check attempts (max 3 attempts)
  if (storedData.attempts >= 3) {
    otpStore.delete(emailKey);
    return { isValid: false, message: 'Too many failed attempts. Please request a new OTP' };
  }

  // Verify OTP
  if (storedData.otp === userOTP) {
    otpStore.delete(emailKey);
    return { isValid: true, message: 'OTP verified successfully' };
  } else {
    storedData.attempts += 1;
    return { isValid: false, message: `Invalid OTP. ${3 - storedData.attempts} attempts remaining` };
  }
};

/**
 * Send OTP via email
 * @param {string} email - Recipient email
 * @param {string} otp - OTP to send
 * @param {string} purpose - Purpose of OTP (verification, reset, etc.)
 * @returns {Promise<object>} Send result
 */
const sendOTPEmail = async (email, otp, purpose = 'verification') => {
  const subjects = {
    verification: "QR Studio - Email Verification Code",
    reset: "QR Studio - Password Reset Code",
    forgot: "QR Studio - Password Reset Code"
  };

  const isReset = purpose === 'reset' || purpose === 'forgot';
  const htmlContent = isReset
    ? passwordResetOTPTemplate(email, otp)
    : emailVerificationTemplate(email, otp);

  return sendMail(email, subjects[purpose] || subjects.verification, htmlContent);
};

/**
 * Send password reset email with link
 * @param {string} email - Recipient email
 * @param {string} resetUrl - Password reset URL
 * @param {string} userName - User's name
 * @returns {Promise<object>} Send result
 */
const sendPasswordResetEmail = async (email, resetUrl, userName = '') => {
  const htmlContent = accountNotificationTemplate(
    userName || 'User',
    'Reset Your Password',
    `We received a request to reset your password for your QR Studio account. Click the button below to create a new secure password. This link will expire in 30 minutes for security.`,
    { url: resetUrl, text: 'Reset My Password' },
    'warning'
  );

  return sendMail(email, "QR Studio - Password Reset Request", htmlContent);
};

/**
 * Send OTP for email verification
 * @param {string} email - User's email
 * @param {string} purpose - Purpose of OTP (verification, reset, forgot)
 * @returns {Promise<object>} Result with success status and message
 */
const sendVerificationOTP = async (email, purpose = 'verification') => {
  try {
    const emailKey = email.toLowerCase();
    const existingData = otpStore.get(emailKey);

    // Check if user has exceeded the maximum number of OTP requests (3)
    if (existingData && existingData.requestCount >= 3) {
      // Check if it's been more than 24 hours since the last request
      const timeSinceLastRequest = Date.now() - existingData.lastRequestTime;
      const twentyFourHours = 24 * 60 * 60 * 1000;

      if (timeSinceLastRequest < twentyFourHours) {
        return {
          success: false,
          message: 'Too many OTP requests. Please try again after 24 hours.'
        };
      } else {
        // Reset the counter after 24 hours
        otpStore.delete(emailKey);
      }
    }

    const otp = generateOTP();

    // Store OTP
    storeOTP(email, otp);

    // Send email
    const emailResult = await sendOTPEmail(email, otp, purpose);

    if (emailResult.success) {
      return {
        success: true,
        message: 'OTP sent successfully to your email'
      };
    } else {
      return {
        success: false,
        message: 'Failed to send OTP email. Please try again.'
      };
    }

  } catch (error) {
    console.error('Error in sendVerificationOTP:', error);
    return {
      success: false,
      message: 'An error occurred while sending OTP. Please try again.'
    };
  }
};

/**
 * Send welcome email to new users
 * @param {string} email - User's email
 * @param {string} userName - User's name
 * @returns {Promise<object>} Send result
 */
const sendWelcomeEmail = async (email, userName) => {
  return sendMail(
    email,
    "Welcome to QR Studio - Let's Get Started!",
    welcomeEmailTemplate(userName || 'User', email)
  );
};

/**
 * Send account notification email
 * @param {string} email - User's email
 * @param {string} userName - User's name
 * @param {string} title - Email title
 * @param {string} message - Email message
 * @param {object} actionButton - Optional action button {url, text}
 * @param {string} type - Email type (info, success, warning, danger)
 * @returns {Promise<object>} Send result
 */
const sendAccountNotification = async (email, userName, title, message, actionButton = null, type = 'info') => {
  return sendMail(
    email,
    `QR Studio - ${title}`,
    accountNotificationTemplate(userName, title, message, actionButton, type)
  );
};

/**
 * Clean up expired OTPs (should be called periodically)
 */
const cleanupExpiredOTPs = () => {
  const now = Date.now();
  for (const [email, data] of otpStore.entries()) {
    if (now > data.expiryTime) {
      otpStore.delete(email);
    }
  }
};

// Clean up expired OTPs every 5 minutes
setInterval(cleanupExpiredOTPs, 5 * 60 * 1000);

export {
  generateOTP,
  storeOTP,
  verifyOTP,
  sendOTPEmail,
  sendPasswordResetEmail,
  sendVerificationOTP,
  sendWelcomeEmail,
  sendAccountNotification,
  cleanupExpiredOTPs
};