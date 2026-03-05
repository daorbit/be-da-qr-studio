import fs from 'fs';
import path from 'path';
import multer from 'multer';
import cloudinary from 'cloudinary';

// Configure Cloudinary (use env vars when available, otherwise fallback)
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dj3xx136b',
  api_key: process.env.CLOUDINARY_API_KEY || '526198336185966',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'zIbgT48P52UwvQy-dgc_u8pmrMo',
});

// Helper to extract base64 data and mime type
const parseDataUrl = (dataUrl) => {
  // Accept complex mime types like image/svg+xml as well as png/jpg
  const matches = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!matches) return null;
  return { mime: matches[1], data: matches[2] };
};

export const uploadLogo = async (req, res) => {
  try {
    const { dataUrl } = req.body;
    if (!dataUrl) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }

    const parsed = parseDataUrl(dataUrl);
    if (!parsed) return res.status(400).json({ success: false, message: 'Invalid data URL' });

    const buffer = Buffer.from(parsed.data, 'base64');
    const maxBytes = 500 * 1024; // 500 KB
    if (buffer.length > maxBytes) {
      return res.status(400).json({ success: false, message: 'File exceeds 500KB limit' });
    }

    const ext = parsed.mime.split('/')[1] || 'png';
    const dir = path.join(process.cwd(), 'uploads', 'logos');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const filename = `logo-${Date.now()}.${ext}`;
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, buffer);

    const host = req.protocol + '://' + req.get('host');
    const url = `${host}/uploads/logos/${filename}`;

    return res.json({ success: true, url });
  } catch (error) {
    console.error('uploadLogo error:', error);
    // Return specific error message when possible to help diagnose uploads (non-sensitive)
    return res.status(500).json({ success: false, message: (error && error.message) ? error.message : 'Upload failed' });
  }
};

// Multer memory storage for cloud uploads
const memoryStorage = multer.memoryStorage();

const imageFileFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only image files are allowed'), false);
};

const imageUpload = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

// Middleware to use on the route
export const uploadQRImageMiddleware = imageUpload.single('image');

// Handler to upload image to Cloudinary and return URL
export const uploadQRImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.v2.uploader.upload_stream(
        {
          folder: 'qr-images',
          public_id: `qr-${Date.now()}`,
          transformation: [{ quality: 'auto' }],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    // Include public_id in response so the frontend can optionally delete the image later
    return res.json({ success: true, url: result.secure_url, public_id: result.public_id });
  } catch (error) {
    console.error('uploadQRImage error:', error);
    return res.status(500).json({ success: false, message: (error && error.message) ? error.message : 'Upload failed' });
  }
};

// Delete a previously uploaded QR image (by Cloudinary public_id)
export const deleteQRImage = async (req, res) => {
  try {
    const { publicId } = req.body;
    if (!publicId) return res.status(400).json({ success: false, message: 'Missing publicId' });

    await new Promise((resolve, reject) => {
      cloudinary.v2.uploader.destroy(publicId, { resource_type: 'image' }, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('deleteQRImage error:', error);
    return res.status(500).json({ success: false, message: (error && error.message) ? error.message : 'Delete failed' });
  }
};

export default { uploadLogo, uploadQRImage, deleteQRImage };
