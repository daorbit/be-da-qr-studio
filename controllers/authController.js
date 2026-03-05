import User from '../models/User.js';
import Subscription from '../models/Subscription.js';
import { generateToken } from '../utils/jwt.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import cloudinary from 'cloudinary';
import crypto from 'crypto';
import { sendPasswordResetEmail, sendVerificationOTP, verifyOTP } from '../services/emailService.js';

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: "dj3xx136b",
  api_key: "526198336185966",
  api_secret: "zIbgT48P52UwvQy-dgc_u8pmrMo",
});

// Configure multer for profile picture upload (memory storage for Cloudinary)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 3 * 1024 * 1024 // 3MB limit
  }
});

// Wrap multer middleware to return friendly error messages for file size / type
export const uploadProfilePicture = (req, res, next) => {
  upload.single('profilePicture')(req, res, (err) => {
    if (err) {
      // Multer uses 'LIMIT_FILE_SIZE' for file size errors
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'Profile picture must be 3MB or smaller' });
      }
      return res.status(400).json({ success: false, message: err.message || 'Invalid file upload' });
    }
    next();
  });
};


// @desc    Register new user
// @route   POST /api/auth/signup
// @access  Public
export const signup = async (req, res) => {
  try {
    const { name, email, password, verificationToken } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email, and password' });
    }

    // Check if user exists
    const userExists = await User.findOne({ email: email.toLowerCase() });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // For new signup flow with email verification, require verification token
    // This is a temporary token created after successful OTP verification
    if (!verificationToken) {
      return res.status(400).json({ 
        message: 'Email verification is required for account creation. Please verify your email address first.',
        code: 'EMAIL_VERIFICATION_REQUIRED',
        requiresVerification: true 
      });
    }

    // Verify the verification token (this should be set after successful OTP verification)
    // For now, we'll check if it matches a simple pattern, but in production this should be a JWT or database record
    if (verificationToken !== `verified_${email.toLowerCase()}`) {
      return res.status(400).json({ 
        message: 'Invalid or expired verification token. Please verify your email address again.',
        code: 'INVALID_VERIFICATION_TOKEN',
        requiresVerification: true 
      });
    }

    // Create user with verified email status
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      isEmailVerified: true, // Mark as verified since they passed OTP verification
    });

    if (user) {
      // Create trial subscription for new user with pro features for 3 months
      const trialStartDate = new Date();
      const trialEndDate = new Date();
      trialEndDate.setMonth(trialEndDate.getMonth() + 3); // Add 3 months

      await Subscription.create({
        userId: user._id,
        planType: 'trial',  // Use proper trial plan type
        status: 'active',
        isTrialSubscription: true,
        trialStartDate,
        trialEndDate,
        startDate: trialStartDate,
        endDate: trialEndDate,
        features: {
          maxQRCodes: -1,        // Unlimited QR codes (above Enterprise)
          maxScansPerQR: -1,     // Unlimited scans per QR (above Enterprise)
          analytics: true,
          advancedAnalytics: true,
          whiteLabel: true,
          removeWatermark: true,
          passwordProtection: true,
          expirationDate: true,
          customScanLimit: true
        }
      });

      // Update user trial fields
      user.trialStartDate = trialStartDate;
      user.trialEndDate = trialEndDate;
      user.hasUsedTrial = true;
      user.isOnTrial = true;
      user.subscriptionPlan = 'trial';  // Set to proper trial plan
      user.subscriptionStatus = 'active';
      await user.save();

      console.log('Created trial subscription for new user:', user._id);

      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        theme: user.theme,
        mobile: user.mobile,
        country: user.country,
        city: user.city,
        profilePicture: user.profilePicture,
        language: user.language,
        timezone: user.timezone,
        timeFormat: user.timeFormat,
        removeWatermark: user.removeWatermark,
        watermarkText: user.watermarkText,
        whiteLabel: user.whiteLabel,
        subscriptionPlan: 'pro',
        subscriptionStatus: 'active',
        isOnTrial: true,
        trialStartDate: user.trialStartDate,
        trialEndDate: user.trialEndDate,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Authenticate user
// @route   POST /api/auth/signin
// @access  Public
export const signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Check for user email
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if user has a password (not a Google user)
    if (!user.password) {
      return res.status(401).json({ 
        message: 'This account uses Google sign-in. Please sign in with Google, or use "Forgot Password" to set a backup password.',
        isGoogleUser: true
      });
    }

    // Verify password
    const isPasswordMatch = await user.matchPassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.blocked) {
      return res.status(403).json({ message: 'Account is blocked, contact support' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      theme: user.theme,
      mobile: user.mobile,
      country: user.country,
      city: user.city,
      profilePicture: user.profilePicture,
      language: user.language,
      timezone: user.timezone,
      timeFormat: user.timeFormat,
      removeWatermark: user.removeWatermark,
      watermarkText: user.watermarkText,
      whiteLabel: user.whiteLabel,
      subscriptionPlan: user.subscriptionPlan,
      subscriptionStatus: user.subscriptionStatus,
      isOnTrial: user.isOnTrial || false,
      trialStartDate: user.trialStartDate,
      trialEndDate: user.trialEndDate,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        theme: user.theme,
        mobile: user.mobile,
        country: user.country,
        city: user.city,
        profilePicture: user.profilePicture,
        language: user.language,
        timezone: user.timezone,
        timeFormat: user.timeFormat,
        removeWatermark: user.removeWatermark,
        watermarkText: user.watermarkText,
        whiteLabel: user.whiteLabel,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionStatus: user.subscriptionStatus,
        isOnTrial: user.isOnTrial || false,
        trialStartDate: user.trialStartDate,
        trialEndDate: user.trialEndDate,
        createdAt: user.createdAt,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const { name, mobile, country, city, language, timezone, timeFormat, removeWatermark, watermarkText, whiteLabel } = req.body;

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const updateData = {
      name: name.trim(),
      mobile: mobile ? mobile.trim() : undefined,
      country: country ? country.trim() : undefined,
      city: city ? city.trim() : undefined,
      language: language || 'en',
      timezone: timezone || 'UTC',
      timeFormat: timeFormat || '12',
      removeWatermark: removeWatermark !== undefined ? removeWatermark : undefined,
      watermarkText: watermarkText ? watermarkText.trim() : undefined,
    };

    // Handle whiteLabel if provided
    if (whiteLabel) {
      try {
        const whiteLabelConfig = typeof whiteLabel === 'string' ? JSON.parse(whiteLabel) : whiteLabel;
        updateData.whiteLabel = {
          enabled: whiteLabelConfig.enabled || false,
          brandName: whiteLabelConfig.brandName ? whiteLabelConfig.brandName.trim() : undefined,
          primaryColor: whiteLabelConfig.primaryColor || '#6366f1',
          loadingText: whiteLabelConfig.loadingText ? whiteLabelConfig.loadingText.trim() : undefined,
          showPoweredBy: whiteLabelConfig.showPoweredBy !== undefined ? whiteLabelConfig.showPoweredBy : true,
        };
      } catch (error) {
        return res.status(400).json({ message: 'Invalid whiteLabel configuration' });
      }
    }

    // Handle profile picture upload/removal
    if (req.file) {
      try {
        // Upload to Cloudinary
        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.v2.uploader.upload_stream(
            {
              folder: 'qr-craft-profiles',
              public_id: `profile-${req.user._id}-${Date.now()}`,
              transformation: [
                { width: 200, height: 200, crop: 'fill' },
                { quality: 'auto' }
              ]
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          stream.end(req.file.buffer);
        });

        updateData.profilePicture = result.secure_url;
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return res.status(500).json({ message: 'Failed to upload profile picture' });
      }
    } else if (req.body.profilePicture === '') {
      // Remove profile picture
      updateData.profilePicture = null;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true }
    ).select('-password');

    if (user) {
      res.json({
        success: true,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin,
          theme: user.theme,
          mobile: user.mobile,
          country: user.country,
          city: user.city,
          profilePicture: user.profilePicture,
          language: user.language,
          timezone: user.timezone,
          timeFormat: user.timeFormat,
          removeWatermark: user.removeWatermark,
          watermarkText: user.watermarkText,
          whiteLabel: user.whiteLabel,
          createdAt: user.createdAt,
        },
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user theme
// @route   PUT /api/auth/theme
// @access  Private
export const updateTheme = async (req, res) => {
  try {
    const { theme } = req.body;

    // Validate theme
    const validThemes = ['purple', 'blue', 'green', 'orange', 'rose', 'slate', 'teal', 'indigo', 'emerald', 'cyan', 'violet', 'fuchsia', 'gradient_sunset', 'gradient_ocean', 'gradient_forest', 'gradient_royal'];
    if (!validThemes.includes(theme)) {
      return res.status(400).json({ message: 'Invalid theme' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { theme },
      { new: true }
    ).select('-password');

    if (user) {
      res.json({
        success: true,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin,
          theme: user.theme,
          createdAt: user.createdAt,
        },
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Change password
// @route   PUT /api/auth/password
// @access  Private
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide current and new password' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user || !(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    await user.setPassword(newPassword);
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Google OAuth authentication
// @route   POST /api/auth/google-auth
// @access  Public
export const googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required' });
    }

    // Decode Google credential (JWT token)
    // The credential is a JWT with 3 parts: header.payload.signature
    const payload = JSON.parse(Buffer.from(credential.split('.')[1], 'base64').toString());

    // Verify essential fields
    if (!payload.email || !payload.sub) {
      return res.status(400).json({ message: 'Invalid Google credential' });
    }

    // Check if user exists
    let user = await User.findOne({ email: payload.email.toLowerCase() });

    if (!user) {
      // Create new user with Google info
      user = await User.create({
        email: payload.email.toLowerCase(),
        googleId: payload.sub,
        name: payload.name || payload.email.split('@')[0],
        picture: payload.picture,
        isVerified: true, // Google accounts are pre-verified
        profilePicture: payload.picture, // Store in both fields for consistency
      });

      // Create trial subscription for new Google user with pro features for 3 months
      const trialStartDate = new Date();
      const trialEndDate = new Date();
      trialEndDate.setMonth(trialEndDate.getMonth() + 3); // Add 3 months

      await Subscription.create({
        userId: user._id,
        planType: 'trial',  // Use proper trial plan type
        status: 'active',
        isTrialSubscription: true,
        trialStartDate,
        trialEndDate,
        startDate: trialStartDate,
        endDate: trialEndDate,
        features: {
          maxQRCodes: -1,        // Unlimited QR codes (above Enterprise)
          maxScansPerQR: -1,     // Unlimited scans per QR (above Enterprise)
          analytics: true,
          advancedAnalytics: true,
          whiteLabel: true,
          removeWatermark: true,
          passwordProtection: true,
          expirationDate: true,
          customScanLimit: true
        }
      });

      // Update user trial fields
      user.trialStartDate = trialStartDate;
      user.trialEndDate = trialEndDate;
      user.hasUsedTrial = true;
      user.isOnTrial = true;
      user.subscriptionPlan = 'trial';  // Set to proper trial plan
      user.subscriptionStatus = 'active';
      await user.save();

      console.log('Created trial subscription for new Google user:', user._id);
    } else {
      // User exists - update Google info if not already set
      if (!user.googleId) {
        user.googleId = payload.sub;
        user.name = user.name || payload.name || payload.email.split('@')[0];
        user.picture = payload.picture;
        user.isVerified = true;
        user.profilePicture = user.profilePicture || payload.picture;
        await user.save();
      }
    }

    // Check if user is blocked
    if (user.blocked) {
      return res.status(403).json({ message: 'Account is blocked, contact support' });
    }

    // Return user data with token
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      theme: user.theme,
      mobile: user.mobile,
      country: user.country,
      city: user.city,
      profilePicture: user.profilePicture || user.picture,
      picture: user.picture,
      language: user.language,
      timezone: user.timezone,
      timeFormat: user.timeFormat,
      removeWatermark: user.removeWatermark,
      watermarkText: user.watermarkText,
      whiteLabel: user.whiteLabel,
      isVerified: user.isVerified,
      subscriptionPlan: user.subscriptionPlan,
      subscriptionStatus: user.subscriptionStatus,
      isOnTrial: user.isOnTrial || false,
      trialStartDate: user.trialStartDate,
      trialEndDate: user.trialEndDate,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ message: 'Google authentication failed', error: error.message });
  }
};

// @desc    Set password for Google users or initiate password reset
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Please provide your email' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({ 
        success: true, 
        message: 'If an account exists with this email, a password reset link will be sent.' 
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes

    await user.save();

    // Create reset URL
    const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;
    
    // Send password reset email
    const emailResult = await sendPasswordResetEmail(user.email, resetUrl, user.name);
    
    if (emailResult.success) {
      res.json({ 
        success: true, 
        message: 'Password reset instructions sent to your email'
      });
    } else {
      console.error('Failed to send password reset email:', emailResult.error);
      res.json({ 
        success: true, 
        message: 'If an account exists with this email, a password reset link will be sent.'
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Error processing password reset request' });
  }
};

// @desc    Reset password with token
// @route   POST /api/auth/reset-password/:token
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Please provide a new password' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Hash the token to compare with stored hash
    const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    }).select('+resetPasswordToken +resetPasswordExpire');

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Set new password using the setPassword method
    await user.setPassword(password);
    
    // Clear reset token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    
    await user.save();

    res.json({ 
      success: true, 
      message: 'Password has been reset successfully. You can now sign in with your new password.' 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: error.message || 'Error resetting password' });
  }
};

// @desc    Set password for logged-in Google users
// @route   POST /api/auth/set-password
// @access  Private
export const setPasswordForGoogleUser = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Please provide a password' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Set the password
    await user.setPassword(password);
    await user.save();

    res.json({ 
      success: true, 
      message: 'Password set successfully. You can now use email/password to sign in.' 
    });
  } catch (error) {
    console.error('Set password error:', error);
    res.status(500).json({ message: error.message || 'Error setting password' });
  }
};

// @desc    Send OTP for email verification
// @route   POST /api/auth/send-verification-otp
// @access  Public
export const sendEmailVerificationOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide an email address' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide a valid email address' 
      });
    }

    // Check if user already exists with verified email
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser && existingUser.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified and registered'
      });
    }

    const result = await sendVerificationOTP(email, 'verification');

    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    console.error('Send verification OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while sending verification OTP' 
    });
  }
};

// @desc    Send OTP for password reset
// @route   POST /api/auth/send-reset-otp
// @access  Public
export const sendPasswordResetOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide an email address' 
      });
    }

    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({ 
        success: true, 
        message: 'If an account exists with this email, a password reset OTP will be sent.' 
      });
    }

    const result = await sendVerificationOTP(email, 'reset');

    if (result.success) {
      res.json({
        success: true,
        message: 'Password reset OTP sent to your email'
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    console.error('Send password reset OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while sending password reset OTP' 
    });
  }
};

// @desc    Verify OTP and complete email verification
// @route   POST /api/auth/verify-email-otp
// @access  Public
export const verifyEmailOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide both email and OTP' 
      });
    }

    const result = verifyOTP(email, otp);

    if (result.isValid) {
      // For existing users, just update their verification status
      const user = await User.findOne({ email: email.toLowerCase() });
      if (user) {
        user.isEmailVerified = true;
        await user.save();
      }

      // Return verification token for new user signup
      const verificationToken = `verified_${email.toLowerCase()}`;

      res.json({
        success: true,
        message: 'Email verified successfully',
        verificationToken: verificationToken // This will be used in signup
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    console.error('Verify email OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while verifying OTP' 
    });
  }
};

// @desc    Verify OTP and reset password
// @route   POST /api/auth/verify-reset-otp
// @access  Public
export const verifyResetOTP = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide email, OTP, and new password' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long' 
      });
    }

    const result = verifyOTP(email, otp);

    if (result.isValid) {
      // Find user and update password
      const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }

      // Update password
      await user.setPassword(newPassword);
      await user.save();

      res.json({
        success: true,
        message: 'Password has been reset successfully. You can now sign in with your new password.'
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    console.error('Verify reset OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while resetting password' 
    });
  }
};






