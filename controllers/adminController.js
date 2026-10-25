import User from '../models/User.js';
import QRCode from '../models/QRCode.js';
import Subscription from '../models/Subscription.js';
import Payment from '../models/Payment.js';
import AuditLog from '../models/AuditLog.js';
import { cleanupExpiredOrders, getCleanupStats } from '../utils/cleanupTasks.js';
import { logAdminAction } from '../utils/auditLogger.js';
import { loadPlanPrices, savePlanPrices } from './paymentController.js';
import Workspace from '../models/Workspace.js';
import { DEFAULT_PLAN_FEATURES } from '../config/planFeatures.js';
import { deleteWorkspaceCascade, getPrimaryWorkspace } from '../services/workspaceService.js';
import { planFieldsByOwner } from '../services/adminPlanService.js';

// @desc    Get all users with their full details and created QR codes (admin only)
// @route   GET /api/admin/users
// @access  Admin
export const getAllUsersData = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const search = (req.query.search || '').trim();

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await User.countDocuments(filter);

    const users = await User.find(filter)
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Load QR codes for returned users and group by user id
    const userIds = users.map((u) => u._id);
    const qrcodes = userIds.length ? await QRCode.find({ user: { $in: userIds } })
      .select('_id name type content scanCount createdAt status user')
      .lean() : [];
    const qrsByUser = qrcodes.reduce((acc, q) => {
      const uid = q.user?.toString() || 'unknown';
      (acc[uid] = acc[uid] || []).push(q);
      return acc;
    }, {});

    const planFields = await planFieldsByOwner(userIds);
    const data = users.map((u) => ({
      user: { ...u, ...planFields[u._id.toString()] },
      qrcodes: qrsByUser[u._id?.toString()] || [],
    }));

    return res.json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      count: data.length,
      data,
    });
  } catch (error) {
    console.error('Admin getAllUsersData error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


export const blockUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { blocked } = req.body;

    if (typeof blocked === 'undefined') {
      return res.status(400).json({ success: false, message: 'Provide blocked boolean in body' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { blocked: !!blocked },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Log the action
    await logAdminAction(
      req,
      blocked ? 'USER_BLOCKED' : 'USER_UNBLOCKED',
      userId,
      user.email,
      { previousState: !blocked, newState: blocked }
    );

    return res.json({ success: true, user });
  } catch (error) {
    console.error('Admin blockUser error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const ownedWorkspaces = await Workspace.find({ owner: userId }).distinct('_id');
    for (const workspaceId of ownedWorkspaces) {
      await deleteWorkspaceCascade(workspaceId);
    }
    await Workspace.updateMany({ 'members.user': userId }, { $pull: { members: { user: userId } } });

    await User.findByIdAndDelete(userId);

    // Log the action
    await logAdminAction(
      req,
      'USER_DELETED',
      userId,
      user.email,
      { workspacesDeleted: ownedWorkspaces.length }
    );

    return res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    console.error('Admin deleteUser error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Admin endpoint to fix user limits and clean up excess QR codes
export const enforceUserLimits = async (req, res) => {
  try {
    const { dryRun = true } = req.body; // If true, only report what would be done
    
    console.log(`Starting limit enforcement (dry run: ${dryRun})...`);
    
    const issues = [];
    const fixes = [];
    
    const workspaces = await Workspace.find({}).populate('owner', 'email');

    for (const workspace of workspaces) {
      const subscription = await Subscription.findOne({ workspaceId: workspace._id });
      const qrCodes = await QRCode.find({ workspace: workspace._id, status: 'active' }).sort({ createdAt: 1 });

      const planType = subscription?.planType || 'free';
      const maxAllowed = subscription?.features?.maxQRCodes ?? DEFAULT_PLAN_FEATURES.free.maxQRCodes;
      const label = { workspaceId: workspace._id, workspaceName: workspace.name, email: workspace.owner?.email };

      if (maxAllowed !== -1 && qrCodes.length > maxAllowed) {
        const excess = qrCodes.length - maxAllowed;
        issues.push({ ...label, planType, maxAllowed, current: qrCodes.length, excess });

        if (!dryRun) {
          await QRCode.updateMany(
            { _id: { $in: qrCodes.slice(0, excess).map((qr) => qr._id) } },
            { status: 'inactive' }
          );
          fixes.push({ ...label, disabledCount: excess });
        }
      }
    }

    const response = {
      success: true,
      dryRun,
      summary: {
        totalWorkspaces: workspaces.length,
        usersWithIssues: issues.length,
        fixesApplied: dryRun ? 0 : fixes.length
      },
      issues,
      fixes: dryRun ? [] : fixes
    };
    
    if (dryRun) {
      response.message = 'Dry run completed. Set dryRun=false to apply fixes.';
    } else {
      response.message = 'Limits enforced successfully.';
      
      // Log the action
      await logAdminAction(
        req,
        'LIMITS_ENFORCED',
        null,
        null,
        {
          dryRun: false,
          totalWorkspaces: workspaces.length,
          usersWithIssues: issues.length,
          fixesApplied: fixes.length
        }
      );
    }
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('Enforce limits error:', error);
    res.status(500).json({
      success: false,
      message: 'Error enforcing limits',
      error: error.message
    });
  }
};

// Get system stats
export const getSystemStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalQRCodes,
      totalSubscriptions,
      freeUsers,
      basicUsers,
      proUsers,
      enterpriseUsers
    ] = await Promise.all([
      User.countDocuments({}),
      QRCode.countDocuments({}),
      Subscription.countDocuments({}),
      Subscription.countDocuments({ planType: 'free' }),
      Subscription.countDocuments({ planType: 'basic' }),
      Subscription.countDocuments({ planType: 'pro' }),
      Subscription.countDocuments({ planType: 'enterprise' })
    ]);
    
    // Find users with excess QR codes
    const usersWithExcess = [];
    const subscriptions = await Subscription.find({});
    
    for (const sub of subscriptions) {
      if (sub.features && sub.features.maxQRCodes !== -1) {
        const qrCount = await QRCode.countDocuments({ workspace: sub.workspaceId });
        if (qrCount > sub.features.maxQRCodes) {
          const workspace = await Workspace.findById(sub.workspaceId).populate('owner', 'email');
          usersWithExcess.push({
            email: workspace?.owner?.email,
            workspaceName: workspace?.name,
            planType: sub.planType,
            maxAllowed: sub.features.maxQRCodes,
            current: qrCount,
            excess: qrCount - sub.features.maxQRCodes
          });
        }
      }
    }
    
    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalQRCodes,
        totalSubscriptions,
        planDistribution: {
          free: freeUsers,
          basic: basicUsers,
          pro: proUsers,
          enterprise: enterpriseUsers
        },
        usersWithExcess: usersWithExcess.length,
        excessDetails: usersWithExcess
      }
    });
    
  } catch (error) {
    console.error('System stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching system stats',
      error: error.message
    });
  }
};

// @desc    Get all subscriptions and payments data (admin only)
// @route   GET /api/admin/subscriptions  
// @access  Admin
export const getSubscriptionsData = async (req, res) => {
  try {
    // Clean up expired unpaid orders first
    await Payment.deleteMany({
      status: 'created',
      expiresAt: { $lt: new Date() }
    });

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const search = (req.query.search || '').trim();
    const filter = {};
    
    // Get subscription stats - only count successful payments
    const totalSubscriptions = await Subscription.countDocuments();
    const activeSubscriptions = await Subscription.countDocuments({ status: 'active' });
    const totalPayments = await Payment.countDocuments({ status: 'paid' }); // Only count paid payments
    const totalRevenue = await Payment.aggregate([
      { $match: { status: 'paid' } }, // Only sum paid payments
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const conversionRate = totalSubscriptions > 0 
      ? ((await Subscription.countDocuments({ planType: { $ne: 'free' } })) / totalSubscriptions * 100).toFixed(2)
      : 0;
      
    // Get subscriptions with user details
    let subscriptionFilter = {};
    if (search) {
      const users = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      const workspaceIds = await Workspace.find({ owner: { $in: users.map(u => u._id) } }).distinct('_id');
      subscriptionFilter.workspaceId = { $in: workspaceIds };
    }

    const totalSubs = await Subscription.countDocuments(subscriptionFilter);
    const subscriptionDocs = await Subscription.find(subscriptionFilter)
      .populate({ path: 'workspaceId', select: 'name owner', populate: { path: 'owner', select: 'name email profilePicture createdAt' } })
      .populate('paymentId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    const subscriptions = subscriptionDocs.map((sub) => ({
      ...sub,
      workspace: sub.workspaceId ? { _id: sub.workspaceId._id, name: sub.workspaceId.name } : null,
      userId: sub.workspaceId?.owner || null,
    }));
      
    // Get payments with user details - ONLY show successful payments
    let paymentFilter = { status: 'paid' }; // Only show paid payments
    if (search) {
      const users = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      paymentFilter.userId = { $in: users.map(u => u._id) };
    }
    
    const totalPaymentsCount = await Payment.countDocuments(paymentFilter);
    const payments = await Payment.find(paymentFilter)
      .populate('userId', 'name email profilePicture createdAt')
      .populate('workspaceId', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    
    res.json({
      success: true,
      data: {
        stats: {
          totalRevenue: totalRevenue[0]?.total || 0,
          activeSubscriptions,
          totalPayments,
          conversionRate: parseFloat(conversionRate)
        },
        subscriptions: {
          data: subscriptions,
          total: totalSubs,
          page,
          limit
        },
        payments: {
          data: payments,
          total: totalPaymentsCount,
          page,
          limit
        }
      }
    });
    
  } catch (error) {
    console.error('Subscriptions data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscriptions data',
      error: error.message
    });
  }
};

// @desc    Cleanup expired orders and get cleanup stats (admin only)
// @route   POST /api/admin/cleanup
// @access  Admin
export const cleanupOrders = async (req, res) => {
  try {
    const statsBefore = await getCleanupStats();
    const deletedCount = await cleanupExpiredOrders();
    const statsAfter = await getCleanupStats();
    
    // Log the action
    await logAdminAction(
      req,
      'SYSTEM_CLEANUP',
      null,
      null,
      {
        deletedCount,
        statsBefore,
        statsAfter
      }
    );
    
    res.json({
      success: true,
      message: `Cleanup completed. Removed ${deletedCount} expired orders.`,
      stats: {
        before: statsBefore,
        after: statsAfter,
        deletedCount
      }
    });
  } catch (error) {
    console.error('Admin cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during cleanup',
      error: error.message
    });
  }
};

// @desc    Refresh user subscription features (admin only)
// @route   POST /api/admin/refresh-subscription/:userId
// @access  Admin
export const refreshUserSubscription = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user and current subscription
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const workspace = await getPrimaryWorkspace(userId);
    const subscription = workspace && await Subscription.findOne({ workspaceId: workspace._id });
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    const oldFeatures = subscription.features;
    subscription.features = DEFAULT_PLAN_FEATURES[subscription.planType] || DEFAULT_PLAN_FEATURES.free;
    await subscription.save();
    
    // Log the action
    await logAdminAction(
      req,
      'USER_SUBSCRIPTION_REFRESHED',
      userId,
      user.email,
      {
        planType: subscription.planType,
        featuresRefreshed: true
      }
    );
    
    res.json({
      success: true,
      message: 'Subscription features refreshed successfully',
      user: {
        email: user.email,
        planType: subscription.planType
      },
      oldFeatures,
      newFeatures: subscription.features
    });
  } catch (error) {
    console.error('Refresh subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error refreshing subscription',
      error: error.message
    });
  }
};

// @desc    Update user subscription plan (admin only)
// @route   PUT /api/admin/users/:userId/subscription
// @access  Admin
export const updateUserSubscription = async (req, res) => {
  try {
    const { userId } = req.params;
    const { planType, endDate, customFeatures } = req.body;

    // Validate plan type
    if (!['free', 'basic', 'pro', 'enterprise', 'trial'].includes(planType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan type. Must be free, basic, pro, enterprise, or trial'
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Calculate end date
    let subscriptionEndDate = null;
    if (planType !== 'free') {
      if (endDate) {
        subscriptionEndDate = new Date(endDate);
        if (isNaN(subscriptionEndDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid end date format'
          });
        }
      } else {
        // Default to 1 year from now for paid plans
        subscriptionEndDate = new Date();
        subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);
      }
    }

    const workspace = await getPrimaryWorkspace(userId);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'This user does not own a workspace yet'
      });
    }

    const planFeatures = customFeatures || DEFAULT_PLAN_FEATURES[planType];
    const previousPlan = (await planFieldsByOwner([user._id]))[user._id.toString()].subscriptionPlan;

    let subscription = await Subscription.findOne({ workspaceId: workspace._id });

    if (subscription) {
      // Update existing subscription
      subscription.planType = planType;
      subscription.status = 'active';
      subscription.features = planFeatures;
      subscription.endDate = subscriptionEndDate;
      subscription.startDate = new Date();
      subscription.updatedBy = req.user._id;
      
      // Reset trial fields for manual admin changes
      subscription.isTrialSubscription = false;
      subscription.trialStartDate = null;
      subscription.trialEndDate = null;
      
      await subscription.save();
    } else {
      // Create new subscription
      subscription = await Subscription.create({
        workspaceId: workspace._id,
        planType,
        status: 'active',
        features: planFeatures,
        startDate: new Date(),
        endDate: subscriptionEndDate,
        isTrialSubscription: false,
        updatedBy: req.user._id
      });
    }

    const updatedUserData = {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        subscriptionPlan: planType,
        subscriptionStatus: 'active',
        isOnTrial: false,
        workspaceId: workspace._id,
        workspaceName: workspace.name
      },
      subscription: {
        planType: subscription.planType,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        features: subscription.features
      }
    };

    console.log(`Admin ${req.user.email} updated subscription for user ${user.email} to ${planType}`);

    // Log the action
    await logAdminAction(
      req,
      'SUBSCRIPTION_UPDATED',
      userId,
      user.email,
      {
        workspaceId: workspace._id,
        previousPlan,
        newPlan: planType,
        endDate: subscriptionEndDate,
        customFeatures: !!customFeatures
      }
    );

    res.json({
      success: true,
      message: `User subscription updated to ${planType} plan successfully`,
      data: updatedUserData
    });

  } catch (error) {
    console.error('Update user subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user subscription',
      error: error.message
    });
  }
};

// @desc    Get user subscription details (admin only)
// @route   GET /api/admin/users/:userId/subscription
// @access  Admin
export const getUserSubscription = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find user
    const user = await User.findById(userId).select('name email');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const planFields = (await planFieldsByOwner([user._id]))[user._id.toString()];
    const subscription = planFields.workspaceId && await Subscription.findOne({ workspaceId: planFields.workspaceId });

    const responseData = {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        ...planFields,
        trialStartDate: subscription?.trialStartDate || null
      },
      subscription: subscription ? {
        planType: subscription.planType,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        isTrialSubscription: subscription.isTrialSubscription,
        trialStartDate: subscription.trialStartDate,
        trialEndDate: subscription.trialEndDate,
        features: subscription.features
      } : null
    };

    res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Get user subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving user subscription',
      error: error.message
    });
  }
};

export const getAuditLogs = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const action = req.query.action;
    const adminId = req.query.adminId;
    const targetUserId = req.query.targetUserId;
    const search = (req.query.search || '').trim();

    const filter = {};
    
    if (action) {
      filter.action = action;
    }
    
    if (adminId) {
      filter.adminId = adminId;
    }
    
    if (targetUserId) {
      filter.targetUserId = targetUserId;
    }
    
    if (search) {
      filter.$or = [
        { adminEmail: { $regex: search, $options: 'i' } },
        { targetUserEmail: { $regex: search, $options: 'i' } },
        { 'details.planType': { $regex: search, $options: 'i' } }
      ];
    }

    const total = await AuditLog.countDocuments(filter);

    const logs = await AuditLog.find(filter)
      .populate('adminId', 'name email')
      .populate('targetUserId', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return res.json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    console.error('Admin getAuditLogs error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get plan prices
export const getPlanPrices = async (req, res) => {
  try {
    const prices = await loadPlanPrices();
    res.json({
      success: true,
      prices
    });
  } catch (error) {
    console.error('Admin getPlanPrices error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update plan prices
export const updatePlanPrices = async (req, res) => {
  try {
    const { basic, pro } = req.body;

    if (!basic || !pro || !basic.monthlyPrice || !basic.yearlyPrice || !pro.monthlyPrice || !pro.yearlyPrice) {
      return res.status(400).json({ success: false, message: 'Invalid price data' });
    }

    const prices = {
      basic: {
        monthlyPrice: parseInt(basic.monthlyPrice),
        yearlyPrice: parseInt(basic.yearlyPrice)
      },
      pro: {
        monthlyPrice: parseInt(pro.monthlyPrice),
        yearlyPrice: parseInt(pro.yearlyPrice)
      }
    };

    // Capture previous prices so logs are accurate
    const oldPrices = await loadPlanPrices();

    // Save new prices to DB
    await savePlanPrices(prices);

    // Refresh subscription features for all users to ensure consistency
    const subscriptions = await Subscription.find({});
    let updatedCount = 0;

    for (const sub of subscriptions) {
      const planFeatures = DEFAULT_PLAN_FEATURES[sub.planType] || DEFAULT_PLAN_FEATURES.free;
      if (JSON.stringify(sub.features) !== JSON.stringify(planFeatures)) {
        sub.features = planFeatures;
        await sub.save();
        updatedCount++;
      }
    }

    // Log the action with both old and new prices and metadata about subscription updates
    await logAdminAction(req, 'UPDATE_PLAN_PRICES', null, null, { oldPrices, newPrices: prices, subscriptionsUpdated: updatedCount });

    res.json({
      success: true,
      message: 'Plan prices updated successfully',
      prices,
      subscriptionsUpdated: updatedCount
    });
  } catch (error) {
    console.error('Admin updatePlanPrices error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export default { getAllUsersData, blockUser, deleteUser, getSubscriptionsData, cleanupOrders, refreshUserSubscription, updateUserSubscription, getUserSubscription, getAuditLogs, getPlanPrices, updatePlanPrices };