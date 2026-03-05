import express from 'express';
import { getAllUsersData, blockUser, deleteUser, enforceUserLimits, getSystemStats, getSubscriptionsData, cleanupOrders, refreshUserSubscription, updateUserSubscription, getUserSubscription, getAuditLogs, getPlanPrices, updatePlanPrices } from '../controllers/adminController.js';
import adminMiddleware from '../middleware/adminMiddleware.js';

const router = express.Router();

router.get('/users', adminMiddleware, getAllUsersData);
router.put('/users/:id', adminMiddleware, blockUser);
router.delete('/users/:id', adminMiddleware, deleteUser);

// New admin endpoints for subscription management
router.get('/stats', adminMiddleware, getSystemStats);
router.get('/subscriptions', adminMiddleware, getSubscriptionsData);
router.post('/enforce-limits', adminMiddleware, enforceUserLimits);
router.post('/cleanup', adminMiddleware, cleanupOrders);
router.post('/refresh-subscription/:userId', adminMiddleware, refreshUserSubscription);

// User subscription management endpoints
router.get('/users/:userId/subscription', adminMiddleware, getUserSubscription);
router.put('/users/:userId/subscription', adminMiddleware, updateUserSubscription);

// Audit logs endpoint
router.get('/audit-logs', adminMiddleware, getAuditLogs);

// Plan pricing endpoints
router.get('/plan-prices', adminMiddleware, getPlanPrices);
router.put('/plan-prices', adminMiddleware, updatePlanPrices);

export default router;