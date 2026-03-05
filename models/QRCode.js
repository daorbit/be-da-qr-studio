import mongoose from 'mongoose';

const qrCodeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    type: {
      type: String,
      required: true,
      enum: ['url', 'text', 'email', 'phone', 'sms', 'wifi', 'location', 'upi', 'vcard', 'mecard', 'event', 'whatsapp', 'instagram', 'facebook', 'youtube', 'tiktok', 'twitter', 'linkedin', 'spotify', 'telegram', 'pdf', 'video', 'audio', 'image', 'paypal', 'coupon', 'review', 'feedback'],
    },
    // The actual QR code content/data
    content: {
      type: String,
      required: true,
    },
    // Display name for the QR code
    name: {
      type: String,
      required: true,
    },
    scanCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    previewImage: {
      type: String,
      default: null,
    },
    // Optional access control
    password: {
      type: String,
      default: null,
    },
    // Expiration and limits
    expirationDate: {
      type: Date,
      default: null,
    },
    scanLimit: {
      type: Number,
      default: null,
    },
    // Card Template Configuration - make flexible so frontend can add fields without backend schema changes
    template: {
      type: Object,
      default: {},
    },
    // QR Code Styling - store as a flexible object (frontend controls the fields)
    styling: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);
  // Index for faster queries
qrCodeSchema.index({ user: 1, createdAt: -1 });

const QRCode = mongoose.model('QRCode', qrCodeSchema);

export default QRCode;
