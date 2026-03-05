import express from 'express';
import { uploadLogo, uploadQRImage, uploadQRImageMiddleware, deleteQRImage } from '../controllers/uploadController.js';

const router = express.Router();

// Upload a logo (accepts base64 data URL in JSON)
router.post('/logo', uploadLogo);

// Upload an image for an Image-type QR (multipart/form-data file field 'image')
router.post('/qr-image', uploadQRImageMiddleware, uploadQRImage);

// Delete an uploaded QR image by public id (JSON body: { publicId })
router.post('/qr-image/remove', deleteQRImage);

export default router;
