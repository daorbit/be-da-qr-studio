import Workspace from '../models/Workspace.js';
import WorkspaceInvite from '../models/WorkspaceInvite.js';
import QRCode from '../models/QRCode.js';
import Scan from '../models/Scan.js';
import Subscription from '../models/Subscription.js';
import { startTrialForWorkspace } from './trialService.js';
import { getWorkspacePlans } from './subscriptionService.js';

export const createWorkspace = async ({ owner, name }) => {
  const workspace = await Workspace.create({
    name: name?.trim() || `${owner.name.split(' ')[0]}'s workspace`,
    owner: owner._id,
    members: [{ user: owner._id, role: 'owner' }],
  });

  await startTrialForWorkspace(workspace, owner);
  return workspace;
};

export const serializeWorkspace = (workspace, userId, plan) => ({
  _id: workspace._id,
  name: workspace.name,
  logo: workspace.logo,
  color: workspace.color,
  owner: workspace.owner,
  role: workspace.roleOf(userId),
  memberCount: workspace.members.length,
  removeWatermark: workspace.removeWatermark,
  watermarkText: workspace.watermarkText,
  whiteLabel: workspace.whiteLabel,
  plan,
  createdAt: workspace.createdAt,
});

export const deleteWorkspaceCascade = async (workspaceId) => {
  const qrIds = await QRCode.find({ workspace: workspaceId }).distinct('_id');
  await Promise.all([
    Scan.deleteMany({ qrCode: { $in: qrIds } }),
    QRCode.deleteMany({ workspace: workspaceId }),
    Subscription.deleteOne({ workspaceId }),
    WorkspaceInvite.deleteMany({ workspace: workspaceId }),
  ]);
  await Workspace.deleteOne({ _id: workspaceId });
};

export const getPrimaryWorkspace = (userId) => Workspace.findOne({ owner: userId }).sort({ createdAt: 1 });

export const listWorkspacesForUser = async (userId) => {
  const workspaces = await Workspace.find({ 'members.user': userId }).sort({ createdAt: 1 });
  const plans = await getWorkspacePlans(workspaces.map((w) => w._id));
  return workspaces.map((w) => serializeWorkspace(w, userId, plans[w._id.toString()]));
};
