import Workspace from '../models/Workspace.js';
import { getWorkspacePlans } from './subscriptionService.js';

const NO_WORKSPACE = { subscriptionPlan: 'none', subscriptionStatus: 'inactive', isOnTrial: false, trialEndDate: null, workspaceId: null, workspaceName: null };

export const planFieldsByOwner = async (userIds) => {
  const workspaces = await Workspace.find({ owner: { $in: userIds } }).sort({ createdAt: 1 }).select('_id name owner');
  const primary = new Map();
  for (const workspace of workspaces) {
    const ownerId = workspace.owner.toString();
    if (!primary.has(ownerId)) primary.set(ownerId, workspace);
  }

  const plans = await getWorkspacePlans([...primary.values()].map((w) => w._id));

  return Object.fromEntries(
    userIds.map((id) => {
      const workspace = primary.get(id.toString());
      if (!workspace) return [id.toString(), NO_WORKSPACE];
      const plan = plans[workspace._id.toString()];
      return [id.toString(), {
        subscriptionPlan: plan.planType,
        subscriptionStatus: plan.status,
        isOnTrial: plan.isTrial,
        trialEndDate: plan.trialEndDate,
        workspaceId: workspace._id,
        workspaceName: workspace.name,
      }];
    })
  );
};
