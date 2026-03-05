import mongoose from 'mongoose';

const scanSchema = new mongoose.Schema(
  {
    qrCode: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      ref: 'QRCode',
    },
    // Optional target for preview redirects (full URL)
    target: {
      type: String,
      default: null,
    },
    // Device & Browser Info
    browser: {
      name: String,
      version: String,
    },
    os: {
      name: String,
      version: String,
    },
    device: {
      type: { type: String },
      vendor: String,
      model: String,
    },
    // Network Info
    ip: String,
    userAgent: String,
    // Location Info
    location: {
      country: String,
      countryCode: String,
      region: String,
      city: String,
      latitude: Number,
      longitude: Number,
      timezone: String,
    },
    // Referrer
    referrer: String,
  },
  {
    timestamps: true, // This adds createdAt and updatedAt
  }
);

// Index for faster queries
scanSchema.index({ qrCode: 1, createdAt: -1 });
scanSchema.index({ createdAt: -1 });

const Scan = mongoose.model('Scan', scanSchema);

export default Scan;
