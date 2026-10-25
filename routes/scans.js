import express from 'express';
import { getUserScans, getUserAnalytics } from '../controllers/scanController.js';
import { getAllAdvancedAnalytics, getHeatmapData, getPeakTimes, getRetentionAnalysis, getReferrerAnalysis } from '../controllers/advancedAnalyticsController.js';
import { protect } from '../middleware/auth.js';
import { withWorkspace } from '../middleware/workspace.js';

const router = express.Router();

// Get all scans for current user
router.get('/', protect, withWorkspace, getUserScans);

// Get aggregated analytics for current user
router.get('/analytics', protect, withWorkspace, getUserAnalytics);

// Advanced analytics - Single endpoint for all (two routes for optional param)
router.get('/analytics/advanced/:id', protect, withWorkspace, getAllAdvancedAnalytics);
router.get('/analytics/advanced', protect, withWorkspace, getAllAdvancedAnalytics);

// Individual advanced analytics endpoints (kept for backward compatibility)
router.get('/analytics/heatmap/:id', protect, withWorkspace, getHeatmapData);
router.get('/analytics/heatmap', protect, withWorkspace, getHeatmapData);
router.get('/analytics/peak-times/:id', protect, withWorkspace, getPeakTimes);
router.get('/analytics/peak-times', protect, withWorkspace, getPeakTimes);
router.get('/analytics/retention/:id', protect, withWorkspace, getRetentionAnalysis);
router.get('/analytics/retention', protect, withWorkspace, getRetentionAnalysis);
router.get('/analytics/referrers/:id', protect, withWorkspace, getReferrerAnalysis);
router.get('/analytics/referrers', protect, withWorkspace, getReferrerAnalysis);

export default router;
