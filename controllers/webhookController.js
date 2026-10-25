import crypto from 'crypto';
import Payment from '../models/Payment.js';
import Subscription from '../models/Subscription.js';
import { DEFAULT_PLAN_FEATURES } from '../config/planFeatures.js';

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

const updateUserSubscription = async (paymentRecord) => {
  try {
    const { workspaceId, planType, planDuration } = paymentRecord;

    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + planDuration);

    let subscription = await Subscription.findOne({ workspaceId });

    if (!subscription) {
      subscription = new Subscription({
        workspaceId,
        planType,
        startDate: new Date(),
        endDate,
        paymentId: paymentRecord._id,
        features: DEFAULT_PLAN_FEATURES[planType]
      });
    } else {
      subscription.planType = planType;
      subscription.status = 'active';
      subscription.endDate = endDate;
      subscription.paymentId = paymentRecord._id;
      subscription.features = DEFAULT_PLAN_FEATURES[planType];
      subscription.isTrialSubscription = false;
      subscription.trialStartDate = null;
      subscription.trialEndDate = null;
    }

    await subscription.save();

    console.log('Subscription updated successfully for workspace:', workspaceId);

  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
};