import express from 'express';
import { 
  signup, 
  signin, 
  getProfile, 
  updateTheme, 
  updateProfile, 
  changePassword, 
  uploadProfilePicture, 
  googleAuth,
  forgotPassword,
  resetPassword,
  setPasswordForGoogleUser,
  sendEmailVerificationOTP,
  sendPasswordResetOTP,
  verifyEmailOTP,
  verifyResetOTP
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Async wrapper to forward errors to Express error handler
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.post('/signup', signup);
router.post('/signup-with-verification', signup); // Alternative route name
router.post('/signin', signin);
router.post('/google-auth', googleAuth);
router.get('/profile', protect, getProfile);
router.get('/me', protect, getProfile);
router.put('/theme', protect, updateTheme);
router.put('/profile', protect, uploadProfilePicture, updateProfile);

// Password management
router.put('/password', protect, asyncHandler(changePassword));
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.post('/set-password', protect, setPasswordForGoogleUser);

// OTP-based email verification and password reset
router.post('/send-verification-otp', sendEmailVerificationOTP);
router.post('/send-reset-otp', sendPasswordResetOTP);
router.post('/verify-email-otp', verifyEmailOTP);
router.post('/verify-reset-otp', verifyResetOTP);

export default router;
