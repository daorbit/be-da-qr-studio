import express from 'express';
import {
  listWorkspaces,
  createNewWorkspace,
  getCurrentWorkspace,
  updateCurrentWorkspace,
  deleteCurrentWorkspace,
} from '../controllers/workspaceController.js';
import { listMembers, updateMemberRole, removeMember, leaveWorkspace } from '../controllers/memberController.js';
import { createInvite, revokeInvite, previewInvite, acceptInvite } from '../controllers/inviteController.js';
import { protect } from '../middleware/auth.js';
import { withWorkspace, requireRole, CAN_MANAGE } from '../middleware/workspace.js';

const router = express.Router();

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/invites/:token', asyncHandler(previewInvite));
router.post('/invites/:token/accept', protect, asyncHandler(acceptInvite));

router.route('/')
  .get(protect, asyncHandler(listWorkspaces))
  .post(protect, asyncHandler(createNewWorkspace));

router.route('/current')
  .get(protect, withWorkspace, asyncHandler(getCurrentWorkspace))
  .patch(protect, withWorkspace, requireRole(...CAN_MANAGE), asyncHandler(updateCurrentWorkspace))
  .delete(protect, withWorkspace, requireRole('owner'), asyncHandler(deleteCurrentWorkspace));

router.post('/current/leave', protect, withWorkspace, asyncHandler(leaveWorkspace));

router.get('/current/members', protect, withWorkspace, asyncHandler(listMembers));
router.patch('/current/members/:userId', protect, withWorkspace, requireRole(...CAN_MANAGE), asyncHandler(updateMemberRole));
router.delete('/current/members/:userId', protect, withWorkspace, requireRole(...CAN_MANAGE), asyncHandler(removeMember));

router.post('/current/invites', protect, withWorkspace, requireRole(...CAN_MANAGE), asyncHandler(createInvite));
router.delete('/current/invites/:inviteId', protect, withWorkspace, requireRole(...CAN_MANAGE), asyncHandler(revokeInvite));

export default router;
