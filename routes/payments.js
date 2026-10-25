import express from 'express';
import { protect } from '../middleware/auth.js';
import { withWorkspace, requireRole, CAN_MANAGE } from '../middleware/workspace.js';
import {
  getPlans,
  createOrder,
  verifyPayment,
  getSubscription,
  getPaymentHistory,
  cancelSubscription,
  refreshSubscription,
  downloadInvoice
} from '../controllers/paymentController.js';

const router = express.Router();

const member = [protect, withWorkspace];
const billing = [protect, withWorkspace, requireRole(...CAN_MANAGE)];

router.get('/plans', getPlans);

router.post('/create-order', ...billing, createOrder);
router.post('/verify', ...billing, verifyPayment);
router.get('/subscription', ...member, getSubscription);
router.get('/history', ...billing, getPaymentHistory);
router.post('/cancel', ...billing, cancelSubscription);
router.post('/refresh', ...member, refreshSubscription);
router.get('/invoice/:paymentId', ...billing, downloadInvoice);

export default router;
