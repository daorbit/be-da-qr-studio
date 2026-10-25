import User from '../models/User.js';
import WorkspaceInvite from '../models/WorkspaceInvite.js';
import { CAN_MANAGE } from '../middleware/workspace.js';

const ASSIGNABLE_ROLES = ['admin', 'editor', 'viewer'];

const findMember = (workspace, userId) => workspace.members.find((m) => m.user.toString() === userId);

const canManageMember = (actorRole, targetRole) =>
  targetRole !== 'owner' && (actorRole === 'owner' || targetRole !== 'admin');

export const listMembers = async (req, res) => {
  const workspace = req.workspace;
  const users = await User.find({ _id: { $in: workspace.members.map((m) => m.user) } }).select('name email profilePicture');
  const byId = new Map(users.map((u) => [u._id.toString(), u]));

  const members = workspace.members
    .map((m) => {
      const user = byId.get(m.user.toString());
      if (!user) return null;
      return { _id: user._id, name: user.name, email: user.email, profilePicture: user.profilePicture, role: m.role, joinedAt: m.joinedAt };
    })
    .filter(Boolean);

  const invites = CAN_MANAGE.includes(req.workspaceRole)
    ? await WorkspaceInvite.find({ workspace: workspace._id, acceptedAt: null, expiresAt: { $gt: new Date() } })
        .select('email role expiresAt createdAt')
        .sort({ createdAt: -1 })
    : [];

  res.json({ members, invites });
};

export const updateMemberRole = async (req, res) => {
  const { role } = req.body;
  if (!ASSIGNABLE_ROLES.includes(role)) return res.status(400).json({ message: 'Invalid role' });
  if (role === 'admin' && req.workspaceRole !== 'owner') {
    return res.status(403).json({ message: 'Only the owner can make someone an admin.' });
  }

  const member = findMember(req.workspace, req.params.userId);
  if (!member) return res.status(404).json({ message: 'Member not found' });
  if (!canManageMember(req.workspaceRole, member.role)) {
    return res.status(403).json({ message: 'You cannot change this member’s role.' });
  }

  member.role = role;
  await req.workspace.save();
  res.json({ message: 'Role updated', role });
};

export const removeMember = async (req, res) => {
  const member = findMember(req.workspace, req.params.userId);
  if (!member) return res.status(404).json({ message: 'Member not found' });
  if (!canManageMember(req.workspaceRole, member.role)) {
    return res.status(403).json({ message: 'You cannot remove this member.' });
  }

  req.workspace.members = req.workspace.members.filter((m) => m !== member);
  await req.workspace.save();
  res.json({ message: 'Member removed' });
};

export const leaveWorkspace = async (req, res) => {
  if (req.workspaceRole === 'owner') {
    return res.status(400).json({ message: 'The owner cannot leave. Delete the workspace instead.' });
  }

  const userId = req.user._id.toString();
  req.workspace.members = req.workspace.members.filter((m) => m.user.toString() !== userId);
  await req.workspace.save();
  res.json({ message: 'You left the workspace' });
};
