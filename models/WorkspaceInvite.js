import mongoose from 'mongoose';

const workspaceInviteSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['admin', 'editor', 'viewer'],
      default: 'editor',
    },
    tokenHash: {
      type: String,
      required: true,
      select: false,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

workspaceInviteSchema.index({ workspace: 1, email: 1 });
workspaceInviteSchema.index({ tokenHash: 1 }, { unique: true });

const WorkspaceInvite = mongoose.model('WorkspaceInvite', workspaceInviteSchema);

export default WorkspaceInvite;
