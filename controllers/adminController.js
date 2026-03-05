import User from '../models/User.js';
import QRCode from '../models/QRCode.js';
import Subscription from '../models/Subscription.js';
import Payment from '../models/Payment.js';
import AuditLog from '../models/AuditLog.js';
import { cleanupExpiredOrders, getCleanupStats } from '../utils/cleanupTasks.js';
import { logAdminAction } from '../utils/auditLogger.js';
import { loadPlanPrices, savePlanPrices } from './paymentController.js';

// Default plan features
const DEFAULT_PLAN_FEATURES = {
  free: {
    maxQRCodes: 5,
    maxScansPerQR: 20,
    analytics: false,
    advancedAnalytics: false,
    whiteLabel: false,
    removeWatermark: false,
    passwordProtection: false,
    expirationDate: false,
    customScanLimit: false
  },
  basic: {
    maxQRCodes: 50,
    maxScansPerQR: 1000,
    analytics: true,
    advancedAnalytics: false,
    whiteLabel: false,
    removeWatermark: false,
    passwordProtection: true,
    expirationDate: true,
    customScanLimit: true
  },
  pro: {
    maxQRCodes: 200,
    maxScansPerQR: 10000,
    analytics: true,
    advancedAnalytics: true,
    whiteLabel: true,
    removeWatermark: true,
    passwordProtection: true,
    expirationDate: true,
    customScanLimit: true
  },
  enterprise: {
    maxQRCodes: -1, // Unlimited
    maxScansPerQR: -1, // Unlimited
    analytics: true,
    advancedAnalytics: true,
    whiteLabel: true,
    removeWatermark: true,
    passwordProtection: true,
    expirationDate: true,
    customScanLimit: true
  }
};

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

    const data = users.map((u) => ({
      user: u,
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

    // Delete user's QR codes
    await QRCode.deleteMany({ user: userId });

    // Delete user's subscription
    await Subscription.deleteOne({ userId });

    await User.findByIdAndDelete(userId);

    // Log the action
    await logAdminAction(
      req,
      'USER_DELETED',
      userId,
      user.email,
      { qrCodesDeleted: true, subscriptionDeleted: true }
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
    
    // Get all users
    const users = await User.find({});
    
    for (const user of users) {
      const subscription = await Subscription.findOne({ userId: user._id });
      const qrCodes = await QRCode.find({ user: user._id }).sort({ createdAt: 1 }); // Oldest first
      
      let maxAllowed = 5; // Default free plan
      let planType = 'free';
      
      if (subscription && subscription.features) {
        maxAllowed = subscription.features.maxQRCodes;
        planType = subscription.planType;
      }
      
      if (maxAllowed !== -1 && qrCodes.length > maxAllowed) {
        const excess = qrCodes.length - maxAllowed;
        issues.push({
          userId: user._id,
          email: user.email,
          planType,
          maxAllowed,
          current: qrCodes.length,
          excess
        });
        
        if (!dryRun) {
          // Keep the newest QR codes, disable the oldest ones
          const qrCodesToDisable = qrCodes.slice(0, excess);
          
          for (const qr of qrCodesToDisable) {
            qr.isActive = false;
            await qr.save();
          }
          
          fixes.push({
            userId: user._id,
            email: user.email,
            disabledCount: excess
          });
        }
      }
      
      // Ensure user has subscription record
      if (!subscription) {
        issues.push({
          userId: user._id,
          email: user.email,
          issue: 'No subscription record',
          planType: 'missing'
        });
        
        if (!dryRun) {
          await Subscription.create({
            userId: user._id,
            planType: 'free',
            status: 'active',
            startDate: new Date(),
            endDate: null,
            features: {
              maxQRCodes: 5,
              maxScansPerQR: 100,
              analytics: false,
              whiteLabel: false,
              removeWatermark: false
            }
          });
          
          user.subscriptionPlan = 'free';
          user.subscriptionStatus = 'active';
          await user.save();
          
          fixes.push({
            userId: user._id,
            email: user.email,
            fix: 'Created free subscription'
          });
        }
      }
    }
    
    const response = {
      success: true,
      dryRun,
      summary: {
        totalUsers: users.length,
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
          totalUsers: users.length,
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
        const qrCount = await QRCode.countDocuments({ user: sub.userId });
        if (qrCount > sub.features.maxQRCodes) {
          const user = await User.findById(sub.userId);
          usersWithExcess.push({
            email: user?.email,
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
      subscriptionFilter.userId = { $in: users.map(u => u._id) };
    }
    
    const totalSubs = await Subscription.countDocuments(subscriptionFilter);
    const subscriptions = await Subscription.find(subscriptionFilter)
      .populate('userId', 'name email profilePicture createdAt')
      .populate('paymentId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
      
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
    
    const subscription = await Subscription.findOne({ userId });
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }
    
    // Define plan features (same as payment controller)
    const PLAN_FEATURES = {
      free: {
        maxQRCodes: 5,
        maxScansPerQR: 100,
        analytics: false,
        advancedAnalytics: false,
        whiteLabel: false,
        removeWatermark: false,
        passwordProtection: false,
        expirationDate: false,
        customScanLimit: false
      },
      basic: {
        maxQRCodes: 50,
        maxScansPerQR: 1000,
        analytics: true,
        advancedAnalytics: false,
        whiteLabel: false,
        removeWatermark: false,
        passwordProtection: true,
        expirationDate: true,
        customScanLimit: true
      },
      pro: {
        maxQRCodes: 200,
        maxScansPerQR: 10000,
        analytics: true,
        advancedAnalytics: true,
        whiteLabel: true,
        removeWatermark: true,
        passwordProtection: true,
        expirationDate: true,
        customScanLimit: true
      },
      enterprise: {
        maxQRCodes: -1,
        maxScansPerQR: -1,
        analytics: true,
        advancedAnalytics: true,
        whiteLabel: true,
        removeWatermark: true,
        passwordProtection: true,
        expirationDate: true,
        customScanLimit: true
      }
    };
    
    // Update subscription features
    const oldFeatures = subscription.features;
    subscription.features = PLAN_FEATURES[subscription.planType] || PLAN_FEATURES.free;
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

    // Default plan features
    const DEFAULT_PLAN_FEATURES = {
      free: {
        maxQRCodes: 5,
        maxScansPerQR: 20,
        analytics: false,
        advancedAnalytics: false,
        whiteLabel: false,
        removeWatermark: false,
        passwordProtection: false,
        expirationDate: false,
        customScanLimit: false
      },
      basic: {
        maxQRCodes: 50,
        maxScansPerQR: 1000,
        analytics: true,
        advancedAnalytics: false,
        whiteLabel: false,
        removeWatermark: false,
        passwordProtection: true,
        expirationDate: true,
        customScanLimit: true
      },
      pro: {
        maxQRCodes: 200,
        maxScansPerQR: 10000,
        analytics: true,
        advancedAnalytics: true,
        whiteLabel: true,
        removeWatermark: true,
        passwordProtection: true,
        expirationDate: true,
        customScanLimit: true
      },
      enterprise: {
        maxQRCodes: -1, // Unlimited
        maxScansPerQR: -1, // Unlimited
        analytics: true,
        advancedAnalytics: true,
        whiteLabel: true,
        removeWatermark: true,
        passwordProtection: true,
        expirationDate: true,
        customScanLimit: true
      }
    };

    // Get plan features
    const planFeatures = customFeatures || DEFAULT_PLAN_FEATURES[planType];

    // Find or create subscription
    let subscription = await Subscription.findOne({ userId });
    
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
        userId,
        planType,
        status: 'active',
        features: planFeatures,
        startDate: new Date(),
        endDate: subscriptionEndDate,
        isTrialSubscription: false,
        updatedBy: req.user._id
      });
    }

    // Update user record
    user.subscriptionPlan = planType;
    user.subscriptionStatus = 'active';
    user.isOnTrial = false; // Admin changes override trial status
    await user.save();

    // Return updated user and subscription data
    const updatedUserData = {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionStatus: user.subscriptionStatus,
        isOnTrial: user.isOnTrial
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
        previousPlan: user.subscriptionPlan,
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
    const user = await User.findById(userId).select('name email subscriptionPlan subscriptionStatus isOnTrial trialStartDate trialEndDate');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find subscription
    const subscription = await Subscription.findOne({ userId });
    
    const responseData = {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionStatus: user.subscriptionStatus,
        isOnTrial: user.isOnTrial,
        trialStartDate: user.trialStartDate,
        trialEndDate: user.trialEndDate
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