import Subscription from '../models/Subscription.js';

const TRIAL_MONTHS = 3;

/**
 * Give a new user the pro-level trial subscription and save the trial fields on the user
 * @param {object} user - Mongoose user document
 */
export const startTrialForUser = async (user) => {
  const trialStartDate = new Date();
  const trialEndDate = new Date();
  trialEndDate.setMonth(trialEndDate.getMonth() + TRIAL_MONTHS);

  await Subscription.create({
    userId: user._id,
    planType: 'trial',
    status: 'active',
    isTrialSubscription: true,
    trialStartDate,
    trialEndDate,
    startDate: trialStartDate,
    endDate: trialEndDate,
    features: {
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
  });

  user.trialStartDate = trialStartDate;
  user.trialEndDate = trialEndDate;
  user.hasUsedTrial = true;
  user.isOnTrial = true;
  user.subscriptionPlan = 'trial';
  user.subscriptionStatus = 'active';
  await user.save();
};
