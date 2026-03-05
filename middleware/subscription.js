import Subscription from '../models/Subscription.js';
import QRCode from '../models/QRCode.js';
import User from '../models/User.js';

// Default plan features
const DEFAULT_PLAN_FEATURES = {
  free: {
    maxQRCodes: 5,
    maxScansPerQR: 20,
    analytics: false,
    advancedAnalytics: false,
    whiteLabel: false,
    removeWatermark: false,
    passwordProtection: false,
    expirationDate: false,
    customScanLimit: false
  },
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
    maxQRCodes: -1, // Unlimited
    maxScansPerQR: -1, // Unlimited
    analytics: true,
    advancedAnalytics: true,
    whiteLabel: true,
    removeWatermark: true,
    passwordProtection: true,
    expirationDate: true,
    customScanLimit: true
  },
  trial: {
    maxQRCodes: -1, // Unlimited (premium level)
    maxScansPerQR: -1, // Unlimited (premium level)
    analytics: true,
    advancedAnalytics: true,
    whiteLabel: true,
    removeWatermark: true,
    passwordProtection: true,
    expirationDate: true,
    customScanLimit: true
  }
};

// Middleware to check subscription limits
export const checkSubscriptionLimits = async (req, res, next) => {
  try {
    const userId = req.user.id;
    console.log('Checking subscription limits for user:', userId);
    
    // Get user's subscription and user data
    const [subscription, user] = await Promise.all([
      Subscription.findOne({ userId }),
      User.findById(userId)
    ]);
    
    let currentPlan = 'free';
    let planFeatures = DEFAULT_PLAN_FEATURES.free;
    
    if (subscription) {
      const now = new Date();
      
      // Check if trial is expired
      if (subscription.isTrialSubscription && subscription.trialEndDate && subscription.trialEndDate < now) {
        console.log('Trial subscription expired, reverting to free plan');
        
        // Update subscription to expired trial and convert to free
        subscription.status = 'expired';
        subscription.planType = 'free';
        subscription.isTrialSubscription = false;
        subscription.features = DEFAULT_PLAN_FEATURES.free;
        subscription.endDate = null; // Free plan never expires
        await subscription.save();
        
        // Update user record
        if (user) {
          user.subscriptionPlan = 'free';
          user.subscriptionStatus = 'expired';
          user.isOnTrial = false;
          await user.save();
        }
        
        // Auto-expire all QR codes for this user
        await QRCode.updateMany(
          { user: userId },
          { status: 'inactive', expirationDate: now }
        );
        
        currentPlan = 'free';
        planFeatures = DEFAULT_PLAN_FEATURES.free;
      } 
      // Check if regular subscription is expired
      else if (!subscription.isTrialSubscription && subscription.endDate && subscription.endDate < now) {
        console.log('Regular subscription expired, reverting to free plan');
        // Update subscription to expired status
        subscription.status = 'expired';
        subscription.planType = 'free';
        subscription.features = DEFAULT_PLAN_FEATURES.free;
        subscription.endDate = null;
        await subscription.save();
        
        // Update user record
        if (user) {
          user.subscriptionPlan = 'free';
          user.subscriptionStatus = 'expired';
          user.isOnTrial = false;
          await user.save();
        }
        
        // Auto-expire all QR codes for this user
        await QRCode.updateMany(
          { user: userId },
          { status: 'inactive', expirationDate: now }
        );
        
        currentPlan = 'free';
        planFeatures = DEFAULT_PLAN_FEATURES.free;
      } else {
        // Subscription is active (trial or paid)
        currentPlan = subscription.planType;
        planFeatures = subscription.features || DEFAULT_PLAN_FEATURES[currentPlan];
      }
    } else {
      // No subscription found, user is on free plan
      console.log('No subscription found, user is on free plan');
    }
    
    console.log('Current plan:', currentPlan, 'Max QR codes:', planFeatures.maxQRCodes);
    
    // Attach subscription info to request
    req.subscription = {
      planType: currentPlan,
      features: planFeatures,
      status: subscription?.status || 'active'
    };
    
    // Check QR code creation limit for POST requests
    if (req.method === 'POST') {
      const qrCodeCount = await QRCode.countDocuments({ user: userId }); // Fix: use 'user' field, not 'userId'
      console.log('Current QR code count:', qrCodeCount, 'Limit:', planFeatures.maxQRCodes);
      
      if (planFeatures.maxQRCodes !== -1 && qrCodeCount >= planFeatures.maxQRCodes) {
        console.log('QR code limit exceeded');
        return res.status(403).json({
          success: false,
          message: `QR code limit reached. Your ${currentPlan} plan allows ${planFeatures.maxQRCodes} QR codes. You currently have ${qrCodeCount} QR codes.`,
          upgradeRequired: true,
          currentPlan: currentPlan,
          currentCount: qrCodeCount,
          maxAllowed: planFeatures.maxQRCodes
        });
      }
    }

    console.log('Subscription check passed');
    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking subscription limits',
      error: error.message
    });
  }
};

// Middleware to check if feature is available in user's plan
export const checkFeatureAccess = (feature) => {
  return async (req, res, next) => {
    try {
      const subscription = req.subscription;
      
      if (!subscription || !subscription.features[feature]) {
        return res.status(403).json({
          success: false,
          message: `This feature is not available in your ${subscription?.planType || 'free'} plan.`,
          upgradeRequired: true,
          currentPlan: subscription?.planType || 'free',
          requiredFeature: feature
        });
      }

      next();
    } catch (error) {
      console.error('Feature access check error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking feature access'
      });
    }
  };
};