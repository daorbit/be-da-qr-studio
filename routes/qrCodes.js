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
import { withWorkspace, requireRole, CAN_EDIT } from '../middleware/workspace.js';

const router = express.Router();

const member = [protect, withWorkspace];
const editor = [protect, withWorkspace, requireRole(...CAN_EDIT)];

router.get('/stats', ...member, getStats);

router.get('/limits', ...member, checkUserLimits);

router.route('/')
  .get(...member, getUserQRCodes)
  .post(...editor, checkSubscriptionLimits, createQRCode);

router.route('/:id')
  .get(getQRCode)
  .put(...editor, updateQRCode)
  .delete(...editor, deleteQRCode);

router.post('/:id/scan', incrementScan);

router.get('/:id/scans', ...member, getQRCodeScans);
router.get('/:id/analytics', ...member, getQRCodeAnalytics);

export default router;
