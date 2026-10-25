import QRCode from '../models/QRCode.js';
import { getWorkspacePlan } from '../services/subscriptionService.js';

export const checkUserLimits = async (req, res) => {
  try {
    const plan = await getWorkspacePlan(req.workspace._id);
    const qrCodeCount = await QRCode.countDocuments({ workspace: req.workspace._id });
    const { maxQRCodes } = plan.features;

    res.status(200).json({
      success: true,
      data: {
        workspaceId: req.workspace._id,
        workspaceName: req.workspace.name,
        currentPlan: plan.planType,
        maxQRCodes,
        currentQRCount: qrCodeCount,
        remaining: maxQRCodes === -1 ? 'unlimited' : Math.max(0, maxQRCodes - qrCodeCount),
        canCreateMore: maxQRCodes === -1 || qrCodeCount < maxQRCodes,
        subscriptionStatus: plan.status,
        subscriptionEndDate: plan.endDate
      }
    });
  } catch (error) {
    console.error('Check limits error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking workspace limits',
      error: error.message
    });
  }
};
