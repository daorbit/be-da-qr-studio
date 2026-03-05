import AuditLog from '../models/AuditLog.js';

// Helper function to log admin actions
export const logAdminAction = async (req, action, targetUserId = null, targetUserEmail = null, details = {}) => {
  try {
    const adminId = req.user._id;
    const adminEmail = req.user.email;

    await AuditLog.create({
      adminId,
      adminEmail,
      action,
      targetUserId,
      targetUserEmail,
      details,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    });
  } catch (error) {
    console.error('Failed to log admin action:', error);
    // Don't throw error to avoid breaking the main functionality
  }
};