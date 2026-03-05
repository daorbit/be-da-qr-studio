import express from 'express';
import { redirectToContent, redirectToUrl } from '../controllers/redirectController.js';

const router = express.Router();

// Public redirect routes
router.get('/:id', redirectToContent);
router.get('/', redirectToUrl);

export default router;
