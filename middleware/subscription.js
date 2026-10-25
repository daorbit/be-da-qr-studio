import QRCode from '../models/QRCode.js';
import { getWorkspacePlan } from '../services/subscriptionService.js';

export { DEFAULT_PLAN_FEATURES } from '../config/planFeatures.js';

export const checkSubscriptionLimits = async (req, res, next) => {
  try {
    const plan = await getWorkspacePlan(req.workspace._id);
    req.subscription = plan;

    if (req.method === 'POST') {
      const qrCodeCount = await QRCode.countDocuments({ workspace: req.workspace._id });
      const { maxQRCodes } = plan.features;

      if (maxQRCodes !== -1 && qrCodeCount >= maxQRCodes) {
        return res.status(403).json({
          success: false,
          message: `QR code limit reached. Your ${plan.planType} plan allows ${maxQRCodes} QR codes. This workspace has ${qrCodeCount}.`,
          upgradeRequired: true,
          currentPlan: plan.planType,
          currentCount: qrCodeCount,
          maxAllowed: maxQRCodes
        });
      }
    }

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

export const checkFeatureAccess = (feature) => {
  return async (req, res, next) => {
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
  };
};
