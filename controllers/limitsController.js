import Subscription from '../models/Subscription.js';
import QRCode from '../models/QRCode.js';
import User from '../models/User.js';

// Test endpoint to check user's current limits
export const checkUserLimits = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user data
    const user = await User.findById(userId);
    const subscription = await Subscription.findOne({ userId });
    const qrCodeCount = await QRCode.countDocuments({ user: userId }); // Fix: use 'user' field
    
    let currentPlan = 'free';
    let maxQRCodes = 5;
    
    if (subscription && subscription.endDate > new Date()) {
      currentPlan = subscription.planType;
      maxQRCodes = subscription.features.maxQRCodes;
    }
    
    const response = {
      success: true,
      data: {
        userId,
        userName: user?.name,
        currentPlan,
        maxQRCodes,
        currentQRCount: qrCodeCount,
        remaining: maxQRCodes === -1 ? 'unlimited' : Math.max(0, maxQRCodes - qrCodeCount),
        canCreateMore: maxQRCodes === -1 || qrCodeCount < maxQRCodes,
        subscriptionStatus: subscription?.status || 'none',
        subscriptionEndDate: subscription?.endDate
      }
    };
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('Check limits error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking user limits',
      error: error.message
    });
  }
};