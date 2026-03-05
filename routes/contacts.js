import express from 'express';
import { protect } from '../middleware/auth.js';
import { adminMiddleware } from '../middleware/adminMiddleware.js';
import {
  createContact,
  getAllContacts,
  updateContactStatus,
  deleteContact,
} from '../controllers/contactController.js';

const router = express.Router();

router.post('/', createContact);
router.get('/', protect, adminMiddleware, getAllContacts);
router.put('/:id', protect, adminMiddleware, updateContactStatus);
router.delete('/:id', protect, adminMiddleware, deleteContact);

export default router;
