import crypto from 'crypto';
import Workspace from '../models/Workspace.js';
import WorkspaceInvite from '../models/WorkspaceInvite.js';
import User from '../models/User.js';
import { getWorkspacePlan } from '../services/subscriptionService.js';
import { sendWorkspaceInviteEmail } from '../services/emailService.js';
import { frontendBase } from '../utils/frontendUrl.js';

const INVITE_DAYS = 7;
const INVITE_ROLES = ['admin', 'editor', 'viewer'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const findOpenInvite = (token) =>
  WorkspaceInvite.findOne({ tokenHash: hashToken(String(token || '')), acceptedAt: null }).populate('workspace', 'name logo members');

export const createInvite = async (req, res) => {
  const email = String(req.body?.email || '').toLowerCase().trim();
  const role = req.body?.role || 'editor';

  if (!EMAIL_PATTERN.test(email)) return res.status(400).json({ message: 'Please enter a valid email' });
  if (!INVITE_ROLES.includes(role)) return res.status(400).json({ message: 'Invalid role' });
  if (role === 'admin' && req.workspaceRole !== 'owner') {
    return res.status(403).json({ message: 'Only the owner can invite admins.' });
  }

  const workspace = req.workspace;
  const existingUser = await User.findOne({ email }).select('_id');
  if (existingUser && workspace.roleOf(existingUser._id)) {
    return res.status(409).json({ message: 'This person is already a member.' });
  }

  const plan = await getWorkspacePlan(workspace._id);
  const pending = await WorkspaceInvite.countDocuments({
    workspace: workspace._id,
    acceptedAt: null,
    expiresAt: { $gt: new Date() },
    email: { $ne: email },
  });
  const { maxMembers } = plan.features;
  if (maxMembers !== -1 && workspace.members.length + pending >= maxMembers) {
    return res.status(403).json({
      message: `Your ${plan.planType} plan allows ${maxMembers} member${maxMembers === 1 ? '' : 's'}. Upgrade to invite more people.`,
      upgradeRequired: true,
    });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000);

  const invite = await WorkspaceInvite.findOneAndUpdate(
    { workspace: workspace._id, email, acceptedAt: null },
    { role, tokenHash: hashToken(token), invitedBy: req.user._id, expiresAt },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const inviteUrl = `${frontendBase()}/invite/${token}`;
  const sent = await sendWorkspaceInviteEmail(email, {
    inviterName: req.user.name,
    workspaceName: workspace.name,
    role,
    acceptUrl: inviteUrl,
  });

  res.status(201).json({
    invite: { _id: invite._id, email, role, expiresAt },
    inviteUrl,
    emailSent: sent.success,
  });
};

export const revokeInvite = async (req, res) => {
  const result = await WorkspaceInvite.deleteOne({ _id: req.params.inviteId, workspace: req.workspace._id, acceptedAt: null });
  if (!result.deletedCount) return res.status(404).json({ message: 'Invitation not found' });
  res.json({ message: 'Invitation revoked' });
};

export const previewInvite = async (req, res) => {
  const invite = await findOpenInvite(req.params.token);
  if (!invite || !invite.workspace) return res.status(404).json({ message: 'This invitation is invalid or was already used.' });

  const inviter = await User.findById(invite.invitedBy).select('name');
  res.json({
    workspaceName: invite.workspace.name,
    workspaceLogo: invite.workspace.logo,
    inviterName: inviter?.name || 'A teammate',
    email: invite.email,
    role: invite.role,
    expired: invite.expiresAt < new Date(),
  });
};

export const acceptInvite = async (req, res) => {
  const invite = await findOpenInvite(req.params.token);
  if (!invite || !invite.workspace) return res.status(404).json({ message: 'This invitation is invalid or was already used.' });
  if (invite.expiresAt < new Date()) return res.status(410).json({ message: 'This invitation has expired. Ask for a new one.' });
  if (invite.email !== req.user.email.toLowerCase()) {
    return res.status(403).json({ message: `This invitation was sent to ${invite.email}. Sign in with that email to accept it.` });
  }

  const workspace = await Workspace.findById(invite.workspace._id);
  if (!workspace.roleOf(req.user._id)) {
    workspace.members.push({ user: req.user._id, role: invite.role });
    await workspace.save();
  }

  invite.acceptedAt = new Date();
  await invite.save();

  res.json({ workspaceId: workspace._id, message: `You joined ${workspace.name}` });
};
