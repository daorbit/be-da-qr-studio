import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  adminEmail: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'USER_BLOCKED',
      'USER_UNBLOCKED',
      'USER_DELETED',
      'SUBSCRIPTION_UPDATED',
      'USER_SUBSCRIPTION_REFRESHED',
      'SYSTEM_CLEANUP',
      'LIMITS_ENFORCED',
      'UPDATE_PLAN_PRICES'
    ]
  },
  targetUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  targetUserEmail: {
    type: String
  },
  details: {
    type: mongoose.Schema.Types.Mixed, // Flexible object for action-specific data
    default: {}
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true
});

// Index for efficient queries
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ adminId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;