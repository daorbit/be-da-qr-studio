import mongoose from 'mongoose';

export const WORKSPACE_ROLES = ['owner', 'admin', 'editor', 'viewer'];

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: WORKSPACE_ROLES, default: 'editor' },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a workspace name'],
      trim: true,
      maxlength: 60,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: {
      type: [memberSchema],
      default: [],
    },
    logo: {
      type: String,
      default: null,
    },
    color: {
      type: String,
      default: 'orange',
    },
    removeWatermark: {
      type: Boolean,
      default: false,
    },
    watermarkText: {
      type: String,
      default: 'QR Studio',
    },
    whiteLabel: {
      enabled: { type: Boolean, default: false },
      brandName: { type: String, trim: true },
      primaryColor: { type: String, default: '#f97316' },
      loadingText: { type: String, trim: true },
      showPoweredBy: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

workspaceSchema.index({ 'members.user': 1 });

workspaceSchema.methods.roleOf = function (userId) {
  const member = this.members.find((m) => m.user.toString() === userId.toString());
  return member ? member.role : null;
};

const Workspace = mongoose.model('Workspace', workspaceSchema);

export default Workspace;
