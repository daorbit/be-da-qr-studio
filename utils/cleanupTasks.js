import Payment from '../models/Payment.js';
import Subscription from '../models/Subscription.js';
import QRCode from '../models/QRCode.js';
import User from '../models/User.js';

/**
 * Clean up expired unpaid orders
 * This should be called periodically (e.g., via cron job)
 */
export const cleanupExpiredOrders = async () => {
  try {
    const result = await Payment.deleteMany({
      status: 'created',
      expiresAt: { $lt: new Date() }
    });
    
    console.log(`Cleanup: Removed ${result.deletedCount} expired unpaid orders`);
    return result.deletedCount;
  } catch (error) {
    console.error('Error cleaning up expired orders:', error);
    throw error;
  }
};

/**
 * Clean up expired trial subscriptions and auto-expire QR codes
 * This should be called periodically (e.g., via cron job)
 */
export const cleanupExpiredTrials = async () => {
  try {
    const now = new Date();
    
    // Find all expired trials (now using planType = 'trial')
    const expiredTrials = await Subscription.find({
      planType: 'trial',
      trialEndDate: { $lt: now },
      status: { $ne: 'expired' }
    }).populate('userId');

    let updatedSubscriptions = 0;
    let updatedUsers = 0;

    for (const subscription of expiredTrials) {
      // Update subscription to free plan
      subscription.status = 'active'; // Active free plan, not expired
      subscription.planType = 'free';
      subscription.isTrialSubscription = false;
      subscription.features = {
        maxQRCodes: 5,
        maxScansPerQR: 20,
        analytics: false,
        advancedAnalytics: false,
        whiteLabel: false,
        removeWatermark: false,
        passwordProtection: false,
        expirationDate: false,
        customScanLimit: false
      };
      subscription.endDate = null; // Free plan never expires
      await subscription.save();
      updatedSubscriptions++;

      // Update user record
      const user = await User.findById(subscription.userId);
      if (user) {
        user.subscriptionPlan = 'free';
        user.subscriptionStatus = 'active'; // Active on free plan
        user.isOnTrial = false;
        await user.save();
        updatedUsers++;

        // Keep QR codes active but they'll be limited by free plan limits
        // Don't auto-expire them - let the user decide what to keep
      }
    }
    
    console.log(`Cleanup: Updated ${updatedSubscriptions} expired trials to free plan, ${updatedUsers} users updated`);
    return { subscriptions: updatedSubscriptions, users: updatedUsers };
  } catch (error) {
    console.error('Error cleaning up expired trials:', error);
    throw error;
  }
};

/**
 * Clean up expired regular subscriptions
 */
export const cleanupExpiredSubscriptions = async () => {
  try {
    const now = new Date();
    
    // Find all expired regular subscriptions (not trials)
    const expiredSubs = await Subscription.find({
      isTrialSubscription: { $ne: true },
      endDate: { $lt: now },
      status: { $ne: 'expired' },
      planType: { $ne: 'free' }
    });

    let updatedSubscriptions = 0;
    let updatedUsers = 0;
    let expiredQRCodes = 0;

    for (const subscription of expiredSubs) {
      // Update subscription to free plan
      subscription.status = 'expired';
      subscription.planType = 'free';
      subscription.features = {
        maxQRCodes: 5,
        maxScansPerQR: 20,
        analytics: false,
        advancedAnalytics: false,
        whiteLabel: false,
        removeWatermark: false,
        passwordProtection: false,
        expirationDate: false,
        customScanLimit: false
      };
      subscription.endDate = null; // Free plan never expires
      await subscription.save();
      updatedSubscriptions++;

      // Update user record
      const user = await User.findById(subscription.userId);
      if (user) {
        user.subscriptionPlan = 'free';
        user.subscriptionStatus = 'expired';
        user.isOnTrial = false;
        await user.save();
        updatedUsers++;

        // Auto-expire all QR codes for this user
        const qrResult = await QRCode.updateMany(
          { user: user._id, status: 'active' },
          { status: 'inactive', expirationDate: now }
        );
        expiredQRCodes += qrResult.modifiedCount;
      }
    }
    
    console.log(`Cleanup: Updated ${updatedSubscriptions} expired subscriptions, ${updatedUsers} users, expired ${expiredQRCodes} QR codes`);
    return { subscriptions: updatedSubscriptions, users: updatedUsers, qrCodes: expiredQRCodes };
  } catch (error) {
    console.error('Error cleaning up expired subscriptions:', error);
    throw error;
  }
};

/**
 * Get cleanup statistics
 */
export const getCleanupStats = async () => {
  try {
    const now = new Date();
    
    const expiredOrdersCount = await Payment.countDocuments({
      status: 'created',
      expiresAt: { $lt: now }
    });
    
    const pendingOrdersCount = await Payment.countDocuments({
      status: 'created',
      expiresAt: { $gte: now }
    });
    
    const paidOrdersCount = await Payment.countDocuments({
      status: 'paid'
    });

    const expiredTrialsCount = await Subscription.countDocuments({
      isTrialSubscription: true,
      trialEndDate: { $lt: now },
      status: { $ne: 'expired' }
    });

    const activeTrialsCount = await Subscription.countDocuments({
      isTrialSubscription: true,
      trialEndDate: { $gte: now },
      status: 'active'
    });

    const expiredSubscriptionsCount = await Subscription.countDocuments({
      isTrialSubscription: { $ne: true },
      endDate: { $lt: now },
      status: { $ne: 'expired' },
      planType: { $ne: 'free' }
    });
    
    return {
      orders: {
        expired: expiredOrdersCount,
        pending: pendingOrdersCount,
        paid: paidOrdersCount
      },
      trials: {
        expired: expiredTrialsCount,
        active: activeTrialsCount
      },
      subscriptions: {
        expired: expiredSubscriptionsCount
      }
    };
  } catch (error) {
    console.error('Error getting cleanup stats:', error);
    throw error;
  }
};

// Auto-cleanup function that can be called on server start
export const scheduleCleanup = () => {
  // Clean up every hour
  setInterval(async () => {
    try {
      await cleanupExpiredOrders();
      await cleanupExpiredTrials();
      await cleanupExpiredSubscriptions();
    } catch (error) {
      console.error('Scheduled cleanup failed:', error);
    }
  }, 60 * 60 * 1000); // 1 hour
  
  console.log('Scheduled cleanup tasks initialized (orders, trials, subscriptions)');
};