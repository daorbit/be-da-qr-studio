import Subscription from '../models/Subscription.js';
import QRCode from '../models/QRCode.js';
import { DEFAULT_PLAN_FEATURES } from '../config/planFeatures.js';

const FREE_PLAN = {
  planType: 'free',
  status: 'active',
  isTrial: false,
  trialEndDate: null,
  endDate: null,
  features: DEFAULT_PLAN_FEATURES.free,
};

const isLapsed = (subscription, now) =>
  subscription.isTrialSubscription
    ? Boolean(subscription.trialEndDate && subscription.trialEndDate < now)
    : Boolean(subscription.endDate && subscription.endDate < now && subscription.planType !== 'free');

export const expireSubscription = async (subscription) => {
  const now = new Date();
  subscription.status = 'expired';
  subscription.planType = 'free';
  subscription.isTrialSubscription = false;
  subscription.features = DEFAULT_PLAN_FEATURES.free;
  subscription.endDate = null;
  await subscription.save();

  await QRCode.updateMany(
    { workspace: subscription.workspaceId, status: 'active' },
    { status: 'inactive', expirationDate: now }
  );
};

export const toPlanSummary = (subscription) => {
  if (!subscription) return FREE_PLAN;
  return {
    planType: subscription.planType,
    status: subscription.status,
    isTrial: Boolean(subscription.isTrialSubscription),
    trialEndDate: subscription.trialEndDate,
    endDate: subscription.endDate,
    features: subscription.features || DEFAULT_PLAN_FEATURES[subscription.planType] || DEFAULT_PLAN_FEATURES.free,
  };
};

export const getWorkspacePlan = async (workspaceId) => {
  const subscription = await Subscription.findOne({ workspaceId });
  if (subscription && isLapsed(subscription, new Date())) {
    await expireSubscription(subscription);
  }
  return toPlanSummary(subscription);
};

export const getWorkspacePlans = async (workspaceIds) => {
  const subscriptions = await Subscription.find({ workspaceId: { $in: workspaceIds } });
  const byWorkspace = new Map(subscriptions.map((s) => [s.workspaceId.toString(), s]));
  return Object.fromEntries(
    workspaceIds.map((id) => [id.toString(), toPlanSummary(byWorkspace.get(id.toString()))])
  );
};
