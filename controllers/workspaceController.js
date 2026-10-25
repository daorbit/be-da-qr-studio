import Workspace from '../models/Workspace.js';
import { createWorkspace, deleteWorkspaceCascade, listWorkspacesForUser, serializeWorkspace } from '../services/workspaceService.js';
import { getWorkspacePlan } from '../services/subscriptionService.js';

const EDITABLE_FIELDS = ['name', 'logo', 'color'];
const BRANDING_FIELDS = { removeWatermark: 'removeWatermark', watermarkText: 'removeWatermark', whiteLabel: 'whiteLabel' };

export const listWorkspaces = async (req, res) => {
  res.json({ workspaces: await listWorkspacesForUser(req.user._id) });
};

export const createNewWorkspace = async (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name) return res.status(400).json({ message: 'Please add a workspace name' });

  const workspace = await createWorkspace({ owner: req.user, name });
  const plan = await getWorkspacePlan(workspace._id);
  res.status(201).json({ workspace: serializeWorkspace(workspace, req.user._id, plan) });
};

export const getCurrentWorkspace = async (req, res) => {
  const plan = await getWorkspacePlan(req.workspace._id);
  res.json({ workspace: serializeWorkspace(req.workspace, req.user._id, plan) });
};

export const updateCurrentWorkspace = async (req, res) => {
  const workspace = req.workspace;
  const plan = await getWorkspacePlan(workspace._id);

  for (const field of EDITABLE_FIELDS) {
    if (req.body[field] !== undefined) workspace[field] = req.body[field];
  }

  for (const [field, feature] of Object.entries(BRANDING_FIELDS)) {
    if (req.body[field] === undefined) continue;
    if (!plan.features[feature]) {
      return res.status(403).json({ message: `Your ${plan.planType} plan does not include this feature.`, upgradeRequired: true });
    }
    const value = field === 'whiteLabel' ? { ...workspace.toObject().whiteLabel, ...req.body.whiteLabel } : req.body[field];
    workspace.set(field, value);
  }

  await workspace.save();
  res.json({ workspace: serializeWorkspace(workspace, req.user._id, plan) });
};

export const deleteCurrentWorkspace = async (req, res) => {
  const workspaceId = req.workspace._id;
  const remaining = await Workspace.countDocuments({ 'members.user': req.user._id, _id: { $ne: workspaceId } });
  if (remaining === 0) {
    return res.status(400).json({ message: 'You need at least one workspace. Create another before deleting this one.' });
  }

  await deleteWorkspaceCascade(workspaceId);

  res.json({ message: 'Workspace deleted' });
};
