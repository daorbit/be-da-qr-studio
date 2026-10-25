import Subscription from '../models/Subscription.js';
import { DEFAULT_PLAN_FEATURES } from '../config/planFeatures.js';

const TRIAL_MONTHS = 3;

export const startTrialForWorkspace = async (workspace, user) => {
  if (user.hasUsedTrial) return false;

  const trialStartDate = new Date();
  const trialEndDate = new Date();
  trialEndDate.setMonth(trialEndDate.getMonth() + TRIAL_MONTHS);

  await Subscription.create({
    workspaceId: workspace._id,
    planType: 'trial',
    status: 'active',
    isTrialSubscription: true,
    trialStartDate,
    trialEndDate,
    startDate: trialStartDate,
    endDate: trialEndDate,
    features: DEFAULT_PLAN_FEATURES.trial,
  });

  user.hasUsedTrial = true;
  await user.save();
  return true;
};
