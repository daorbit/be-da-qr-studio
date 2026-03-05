import express from 'express';
import {
  createQRCode,
  getUserQRCodes,
  getQRCode,
  updateQRCode,
  deleteQRCode,
  incrementScan,
  getStats,
} from '../controllers/qrCodeController.js';
import {
  getQRCodeScans,
  getQRCodeAnalytics,
} from '../controllers/scanController.js';
import { checkUserLimits } from '../controllers/limitsController.js';
import { protect } from '../middleware/auth.js';
import { checkSubscriptionLimits } from '../middleware/subscription.js';

const router = express.Router();

// Stats endpoint (must be before /:id routes)
router.get('/stats', protect, getStats);

// Test endpoint to check limits
router.get('/limits', protect, checkUserLimits);

router.route('/')
  .get(protect, getUserQRCodes)
  .post(protect, checkSubscriptionLimits, createQRCode);

router.route('/:id')
  .get(getQRCode)  // Make public so scan redirect can fetch QR data
  .put(protect, updateQRCode)
  .delete(protect, deleteQRCode);

// Scan tracking (public endpoint)
router.post('/:id/scan', incrementScan);

// Analytics endpoints (protected)
router.get('/:id/scans', protect, getQRCodeScans);
router.get('/:id/analytics', protect, getQRCodeAnalytics);

export default router;
