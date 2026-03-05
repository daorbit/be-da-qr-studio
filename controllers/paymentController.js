import Razorpay from 'razorpay';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Payment from '../models/Payment.js';
import Subscription from '../models/Subscription.js';
import User from '../models/User.js';
import PlanPrices from '../models/PlanPrices.js';
import InvoiceGenerator from '../utils/invoiceGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load plan prices from database
export const loadPlanPrices = async () => {
  try {
    const prices = await PlanPrices.find({});
    const priceMap = {};

    prices.forEach(price => {
      priceMap[price.planType] = {
        monthlyPrice: price.monthlyPrice,
        yearlyPrice: price.yearlyPrice
      };
    });

    // If no prices in DB, return defaults and initialize DB
    if (Object.keys(priceMap).length === 0) {
      const defaultPrices = {
        basic: { monthlyPrice: 149, yearlyPrice: 1700 },
        pro: { monthlyPrice: 299, yearlyPrice: 3500 }
      };

      // Initialize database with default prices
      await initializeDefaultPrices(defaultPrices);
      return defaultPrices;
    }

    return priceMap;
  } catch (error) {
    console.error('Error loading plan prices:', error);
    // Return default prices
    return {
      basic: { monthlyPrice: 149, yearlyPrice: 1700 },
      pro: { monthlyPrice: 299, yearlyPrice: 3500 }
    };
  }
};

// Initialize default prices in database
const initializeDefaultPrices = async (prices) => {
  try {
    const pricePromises = Object.entries(prices).map(([planType, priceData]) =>
      PlanPrices.findOneAndUpdate(
        { planType },
        {
          planType,
          monthlyPrice: priceData.monthlyPrice,
          yearlyPrice: priceData.yearlyPrice
        },
        { upsert: true, new: true }
      )
    );
    await Promise.all(pricePromises);
    console.log('Default plan prices initialized in database');
  } catch (error) {
    console.error('Error initializing default prices:', error);
  }
};

// Save plan prices to database
export const savePlanPrices = async (prices) => {
  try {
    const pricePromises = Object.entries(prices).map(([planType, priceData]) =>
      PlanPrices.findOneAndUpdate(
        { planType },
        {
          planType,
          monthlyPrice: priceData.monthlyPrice,
          yearlyPrice: priceData.yearlyPrice
        },
        { upsert: true, new: true }
      )
    );
    await Promise.all(pricePromises);
  } catch (error) {
    console.error('Error saving plan prices:', error);
    throw error;
  }
};

// Initialize Razorpay instance only when needed
const getRazorpayInstance = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  
  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.');
  }
  
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });
};

// Pricing plans
const getAllPlans = async () => {
  const prices = await loadPlanPrices();
  return {
    basic: {
      name: 'Basic Plan',
      monthlyPrice: prices.basic.monthlyPrice,
      yearlyPrice: prices.basic.yearlyPrice,
      features: {
        maxQRCodes: 50,
        maxScansPerQR: 1000,
        analytics: true,
        advancedAnalytics: false,
        whiteLabel: false,
        removeWatermark: false,
        passwordProtection: true,
        expirationDate: true,
        customScanLimit: true
      }
    },
    pro: {
      name: 'Pro Plan', 
      monthlyPrice: prices.pro.monthlyPrice,
      yearlyPrice: prices.pro.yearlyPrice,
      features: {
        maxQRCodes: 200,
        maxScansPerQR: 10000,
        analytics: true,
        advancedAnalytics: true,
        whiteLabel: true,
        removeWatermark: true,
        passwordProtection: true,
        expirationDate: true,
        customScanLimit: true
      }
    },
    enterprise: {
      name: 'Enterprise Plan',
      monthlyPrice: 0, // Contact support
      yearlyPrice: 0, // Contact support
      features: {
        maxQRCodes: -1, // Unlimited
        maxScansPerQR: -1, // Unlimited
        analytics: true,
        advancedAnalytics: true,
        whiteLabel: true,
        removeWatermark: true,
        passwordProtection: true,
        expirationDate: true,
        customScanLimit: true
      }
    },
    trial: {
      name: 'Trial Plan',
      monthlyPrice: 0, // Free trial
      yearlyPrice: 0, // Free trial
      features: {
        maxQRCodes: -1, // Unlimited
        maxScansPerQR: -1, // Unlimited
        analytics: true,
        advancedAnalytics: true,
        whiteLabel: true,
        removeWatermark: true,
        passwordProtection: true,
        expirationDate: true,
        customScanLimit: true
      }
    }
  };
};

// Get available plans
export const getPlans = async (req, res) => {
  try {
    const plans = await getAllPlans();
    res.status(200).json({
      success: true,
      plans: plans
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching plans',
      error: error.message
    });
  }
};

// Create payment order
export const createOrder = async (req, res) => {
  try {
    const { planType, duration = 1 } = req.body; // duration in months
    const userId = req.user.id;

    const PLANS = await getAllPlans();
    if (!PLANS[planType]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan type'
      });
    }

    const plan = PLANS[planType];
    
    // Enterprise plan requires contacting support
    if (planType === 'enterprise') {
      return res.status(400).json({
        success: false,
        message: 'Please contact support for enterprise pricing'
      });
    }
    
    let price;
    if (duration === 12) {
      price = plan.yearlyPrice;
    } else {
      price = plan.monthlyPrice;
    }
    
    const amount = price * 100; // Amount in paise
    const currency = 'INR';
    // Create a short receipt (max 40 chars) using user ID substring and short timestamp
    const shortUserId = userId.slice(-8); // Last 8 chars of userId
    const shortTimestamp = Date.now().toString().slice(-8); // Last 8 digits of timestamp
    const receipt = `ord_${shortUserId}_${shortTimestamp}`;

    const options = {
      amount,
      currency,
      receipt,
      notes: {
        userId,
        planType,
        duration
      }
    };

    // Get Razorpay instance
    const razorpay = getRazorpayInstance();
    const order = await razorpay.orders.create(options);

    // Save payment record
    const payment = new Payment({
      userId,
      orderId: order.id,
      amount: amount / 100, // Store in rupees
      currency,
      planType,
      planDuration: duration,
      receipt,
      notes: options.notes,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes expiry
    });

    await payment.save();

    res.status(200).json({
      success: true,
      order: {
        id: order.id,
        amount,
        currency,
        planType,
        planName: plan.name,
        duration
      }
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating payment order',
      error: error.message
    });
  }
};

// Verify payment
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const userId = req.user.id;

    const PLANS = await getAllPlans();

    // Find the payment record
    const payment = await Payment.findOne({ 
      orderId: razorpay_order_id,
      userId 
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    // Verify signature
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest('hex');

    if (razorpay_signature !== expectedSignature) {
      // Update payment status to failed
      payment.status = 'failed';
      await payment.save();

      return res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }

    // Payment verified successfully
    payment.paymentId = razorpay_payment_id;
    payment.signature = razorpay_signature;
    payment.status = 'paid';
    payment.paidAt = new Date();
    await payment.save();

    // Update or create subscription
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + payment.planDuration);

    let subscription = await Subscription.findOne({ userId });
    
    if (!subscription) {
      // Create new subscription
      subscription = new Subscription({
        userId,
        planType: payment.planType,
        startDate: new Date(),
        endDate,
        paymentId: payment._id,
        features: PLANS[payment.planType].features
      });
    } else {
      // Update existing subscription
      subscription.planType = payment.planType;
      subscription.status = 'active';
      subscription.endDate = endDate;
      subscription.paymentId = payment._id;
      subscription.features = PLANS[payment.planType].features;
      
      // Clear trial fields when upgrading to paid plan
      subscription.isTrialSubscription = false;
      subscription.trialStartDate = null;
      subscription.trialEndDate = null;
    }

    await subscription.save();

    // Update user's subscription status and clear trial fields
    await User.findByIdAndUpdate(userId, {
      subscriptionPlan: payment.planType,
      subscriptionStatus: 'active',
      // Clear trial fields when upgrading to paid plan
      isOnTrial: false,
      trialStartDate: null,
      trialEndDate: null
    });

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      subscription: {
        planType: subscription.planType,
        endDate: subscription.endDate,
        features: subscription.features
      }
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying payment',
      error: error.message
    });
  }
};

// Get user's current subscription
export const getSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const subscription = await Subscription.findOne({ userId })
      .populate('paymentId', 'amount createdAt paidAt');

    if (!subscription) {
      // Return free plan details
      return res.status(200).json({
        success: true,
        subscription: {
          planType: 'free',
          status: 'active',
          endDate: null,
          features: {
            maxQRCodes: 5,
            maxScansPerQR: 100,
            customDomains: false,
            analytics: false,
            apiAccess: false,
            prioritySupport: false
          }
        }
      });
    }

    // Check if subscription is expired
    if (subscription.endDate < new Date() && subscription.planType !== 'free') {
      subscription.status = 'expired';
      subscription.planType = 'free';
      subscription.features = {
        maxQRCodes: 5,
        maxScansPerQR: 100,
        customDomains: false,
        analytics: false,
        apiAccess: false,
        prioritySupport: false
      };
      await subscription.save();

      // Update user's subscription status
      await User.findByIdAndUpdate(userId, {
        subscriptionPlan: 'free',
        subscriptionStatus: 'expired'
      });
    }

    res.status(200).json({
      success: true,
      subscription
    });

  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscription',
      error: error.message
    });
  }
};

// Get payment history
export const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    // Only show successful payments and failed payments, not pending ones
    const payments = await Payment.find({ 
      userId, 
      status: { $in: ['paid', 'failed', 'refunded'] } 
    })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments({ 
      userId, 
      status: { $in: ['paid', 'failed', 'refunded'] } 
    });

    res.status(200).json({
      success: true,
      payments,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment history',
      error: error.message
    });
  }
};

// Cancel subscription
export const cancelSubscription = async (req, res) => {
  try {
    const userId = req.user.id;

    const subscription = await Subscription.findOne({ userId });
    
    if (!subscription || subscription.planType === 'free') {
      return res.status(400).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    subscription.status = 'cancelled';
    await subscription.save();

    // Update user's subscription status
    await User.findByIdAndUpdate(userId, {
      subscriptionStatus: 'cancelled'
    });

    res.status(200).json({
      success: true,
      message: 'Subscription cancelled successfully',
      subscription
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling subscription',
      error: error.message
    });
  }
};

// Refresh subscription features
export const refreshSubscription = async (req, res) => {
  try {
    const userId = req.user.id;

    const subscription = await Subscription.findOne({ userId });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No subscription found'
      });
    }

    // Load current plans and update subscription features accordingly
    const PLANS = await getAllPlans();

    subscription.features = (PLANS && PLANS[subscription.planType]?.features) || {
      maxQRCodes: 5,
      maxScansPerQR: 100,
      analytics: false,
      advancedAnalytics: false,
      whiteLabel: false,
      removeWatermark: false,
      passwordProtection: false,
      expirationDate: false,
      customScanLimit: false,
    };

    await subscription.save();

    res.status(200).json({
      success: true,
      message: 'Subscription refreshed successfully',
      subscription
    });

  } catch (error) {
    console.error('Refresh subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error refreshing subscription',
      error: error.message
    });
  }
};

// @desc    Download invoice for a payment
// @route   GET /api/payments/invoice/:paymentId
// @access  Private
export const downloadInvoice = async (req, res) => {
  const { paymentId } = req.params;

  // Find the payment
  const payment = await Payment.findById(paymentId).populate({
    path: 'userId',
    select: 'name email',
    strictPopulate: false
  });

  if (!payment) {
    return res.status(404).json({
      success: false,
      message: 'Payment not found'
    });
  }

  // Check if payment belongs to the authenticated user
  if (payment.userId._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Only allow invoice download for successful payments
  if (payment.status !== 'paid') {
    return res.status(400).json({
      success: false,
      message: 'Invoice is only available for successful payments'
    });
  }

  // Generate professional PDF invoice using utility
  const PDFDocument = (await import('pdfkit')).default;
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    bufferPages: true
  });

  try {
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${payment.orderId}.pdf"`);

    // Pipe the PDF to the response
    doc.pipe(res);

    // Use the professional invoice generator
    const invoiceGenerator = new InvoiceGenerator();
    
    const invoiceData = {
      payment,
      user: payment.userId
    };

    await invoiceGenerator.generateInvoice(doc, invoiceData);

    // Finalize the PDF
    doc.end();
  } catch (error) {
    console.error('Download invoice error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Error generating invoice',
        error: error.message
      });
    } else {
      console.error('Error after headers sent:', error);
      // Response might be partially sent, can't send error response
    }
  }
};