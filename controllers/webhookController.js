import crypto from 'crypto';
import Payment from '../models/Payment.js';
import Subscription from '../models/Subscription.js';
import User from '../models/User.js';

// Razorpay webhook signature verification
const verifyWebhookSignature = (body, signature, secret) => {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(body))
    .digest('hex');
  
  return expectedSignature === signature;
};

// Handle Razorpay webhooks
export const handleWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const webhookSignature = req.headers['x-razorpay-signature'];
    
    if (!webhookSecret) {
      console.error('Webhook secret not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    // Verify webhook signature
    if (!verifyWebhookSignature(req.body, webhookSignature, webhookSecret)) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body;
    console.log('Webhook event received:', event.event, event.payload);

    switch (event.event) {
      case 'payment.captured':
        await handlePaymentCaptured(event.payload.payment);
        break;
        
      case 'payment.failed':
        await handlePaymentFailed(event.payload.payment);
        break;
        
      case 'order.paid':
        await handleOrderPaid(event.payload.order);
        break;
        
      case 'payment.authorized':
        console.log('Payment authorized:', event.payload.payment.entity.id);
        break;
        
      default:
        console.log('Unhandled webhook event:', event.event);
    }

    res.status(200).json({ status: 'success' });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

// Handle successful payment capture
const handlePaymentCaptured = async (payment) => {
  try {
    console.log('Processing payment captured:', payment.entity.id);
    
    // Find payment record by order ID
    const paymentRecord = await Payment.findOne({ 
      orderId: payment.entity.order_id 
    });

    if (!paymentRecord) {
      console.error('Payment record not found for order:', payment.entity.order_id);
      return;
    }

    // Update payment record if not already updated
    if (paymentRecord.status !== 'paid') {
      paymentRecord.paymentId = payment.entity.id;
      paymentRecord.status = 'paid';
      paymentRecord.paidAt = new Date();
      await paymentRecord.save();

      // Update subscription
      await updateUserSubscription(paymentRecord);
      
      console.log('Payment record updated successfully:', payment.entity.id);
    }
    
  } catch (error) {
    console.error('Error processing payment captured:', error);
  }
};

// Handle failed payment
const handlePaymentFailed = async (payment) => {
  try {
    console.log('Processing payment failed:', payment.entity.id);
    
    // Find payment record by order ID
    const paymentRecord = await Payment.findOne({ 
      orderId: payment.entity.order_id 
    });

    if (!paymentRecord) {
      console.error('Payment record not found for order:', payment.entity.order_id);
      return;
    }

    // Update payment status to failed
    paymentRecord.paymentId = payment.entity.id;
    paymentRecord.status = 'failed';
    await paymentRecord.save();
    
    console.log('Payment marked as failed:', payment.entity.id);
    
  } catch (error) {
    console.error('Error processing payment failed:', error);
  }
};

// Handle order paid (backup handler)
const handleOrderPaid = async (order) => {
  try {
    console.log('Processing order paid:', order.entity.id);
    
    // Find payment record
    const paymentRecord = await Payment.findOne({ 
      orderId: order.entity.id 
    });

    if (!paymentRecord) {
      console.error('Payment record not found for order:', order.entity.id);
      return;
    }

    // Update if not already processed
    if (paymentRecord.status !== 'paid') {
      paymentRecord.status = 'paid';
      paymentRecord.paidAt = new Date();
      await paymentRecord.save();

      // Update subscription
      await updateUserSubscription(paymentRecord);
      
      console.log('Order marked as paid:', order.entity.id);
    }
    
  } catch (error) {
    console.error('Error processing order paid:', error);
  }
};

// Update user subscription based on payment
const updateUserSubscription = async (paymentRecord) => {
  try {
    const { userId, planType, planDuration } = paymentRecord;
    
    // Plan features mapping
    const PLAN_FEATURES = {
      basic: {
        maxQRCodes: 50,
        maxScansPerQR: 1000,
        analytics: true,
        advancedAnalytics: false,
        whiteLabel: false,
        removeWatermark: false,
        passwordProtection: true,
        expirationDate: true,
        customScanLimit: true
      },
      pro: {
        maxQRCodes: 200,
        maxScansPerQR: 10000,
        analytics: true,
        advancedAnalytics: true,
        whiteLabel: true,
        removeWatermark: true,
        passwordProtection: true,
        expirationDate: true,
        customScanLimit: true
      },
      enterprise: {
        maxQRCodes: -1,
        maxScansPerQR: -1,
        analytics: true,
        advancedAnalytics: true,
        whiteLabel: true,
        removeWatermark: true,
        passwordProtection: true,
        expirationDate: true,
        customScanLimit: true
      }
    };

    // Calculate end date
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + planDuration);

    // Find existing subscription or create new one
    let subscription = await Subscription.findOne({ userId });
    
    if (!subscription) {
      subscription = new Subscription({
        userId,
        planType,
        startDate: new Date(),
        endDate,
        paymentId: paymentRecord._id,
        features: PLAN_FEATURES[planType]
      });
    } else {
      // Update existing subscription
      subscription.planType = planType;
      subscription.status = 'active';
      subscription.endDate = endDate;
      subscription.paymentId = paymentRecord._id;
      subscription.features = PLAN_FEATURES[planType];
    }

    await subscription.save();

    // Update user record
    await User.findByIdAndUpdate(userId, {
      subscriptionPlan: planType,
      subscriptionStatus: 'active'
    });

    console.log('Subscription updated successfully for user:', userId);
    
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
};