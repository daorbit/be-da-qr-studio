import Payment from '../models/Payment.js';
import Subscription from '../models/Subscription.js';
import { expireSubscription } from '../services/subscriptionService.js';

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

export const cleanupExpiredTrials = async () => {
  try {
    const expiredTrials = await Subscription.find({
      isTrialSubscription: true,
      trialEndDate: { $lt: new Date() },
      status: { $ne: 'expired' }
    });

    for (const subscription of expiredTrials) {
      await expireSubscription(subscription);
    }

    console.log(`Cleanup: Moved ${expiredTrials.length} expired trials to the free plan`);
    return { subscriptions: expiredTrials.length };
  } catch (error) {
    console.error('Error cleaning up expired trials:', error);
    throw error;
  }
};

export const cleanupExpiredSubscriptions = async () => {
  try {
    const expiredSubs = await Subscription.find({
      isTrialSubscription: { $ne: true },
      endDate: { $lt: new Date() },
      status: { $ne: 'expired' },
      planType: { $ne: 'free' }
    });

    for (const subscription of expiredSubs) {
      await expireSubscription(subscription);
    }

    console.log(`Cleanup: Moved ${expiredSubs.length} expired subscriptions to the free plan`);
    return { subscriptions: expiredSubs.length };
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