import express from 'express';
import { protect } from '../middleware/auth.js';
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

// Get available plans (public route)
router.get('/plans', getPlans);

// Protected routes
router.post('/create-order', protect, createOrder);
router.post('/verify', protect, verifyPayment);
router.get('/subscription', protect, getSubscription);
router.get('/history', protect, getPaymentHistory);
router.post('/cancel', protect, cancelSubscription);
router.post('/refresh', protect, refreshSubscription);
router.get('/invoice/:paymentId', protect, downloadInvoice);

export default router;