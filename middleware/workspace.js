import mongoose from 'mongoose';
import Workspace from '../models/Workspace.js';

export const WORKSPACE_HEADER = 'x-workspace-id';

export const withWorkspace = async (req, res, next) => {
  const workspaceId = req.headers[WORKSPACE_HEADER];

  if (!workspaceId) {
    return res.status(400).json({ code: 'WORKSPACE_REQUIRED', message: 'Choose a workspace first.' });
  }
  if (!mongoose.isValidObjectId(workspaceId)) {
    return res.status(404).json({ code: 'WORKSPACE_NOT_FOUND', message: 'Workspace not found.' });
  }

  try {
    const workspace = await Workspace.findOne({ _id: workspaceId, 'members.user': req.user._id });
    if (!workspace) {
      return res.status(404).json({ code: 'WORKSPACE_NOT_FOUND', message: 'Workspace not found.' });
    }

    req.workspace = workspace;
    req.workspaceRole = workspace.roleOf(req.user._id);
    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.workspaceRole)) {
    return res.status(403).json({ code: 'ROLE_FORBIDDEN', message: 'You do not have permission to do this in this workspace.' });
  }
  next();
};

export const CAN_EDIT = ['owner', 'admin', 'editor'];
export const CAN_MANAGE = ['owner', 'admin'];

export const belongsToWorkspace = (doc, req) =>
  Boolean(doc?.workspace) && doc.workspace.toString() === req.workspace._id.toString();
