import express from 'express';
import { handleWebhook } from '../controllers/webhookController.js';

const router = express.Router();

// Webhook endpoint (no auth required as it comes from Razorpay)
// Note: This should be configured to receive raw body, not JSON parsed
router.post('/razorpay', express.raw({ type: 'application/json' }), (req, res, next) => {
  // Convert raw buffer back to object for processing
  try {
    req.body = JSON.parse(req.body);
    next();
  } catch (error) {
    console.error('Invalid webhook payload:', error);
    return res.status(400).json({ error: 'Invalid payload' });
  }
}, handleWebhook);

export default router;