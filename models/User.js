import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email',
      ],
    },
    password: {
      type: String,
      required: function() {
        return !this.googleId; // Password not required if signing in with Google
      },
      minlength: 6,
      select: false,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allows null values while maintaining uniqueness for non-null values
    },
    picture: {
      type: String, // Google profile picture URL
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    theme: {
      type: String,
      default: 'orange',
      enum: ['purple', 'blue', 'green', 'orange', 'rose', 'slate', 'teal', 'indigo', 'emerald', 'cyan', 'violet', 'fuchsia', 'gradient_sunset', 'gradient_ocean', 'gradient_forest', 'gradient_royal'],
    },
    mobile: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    profilePicture: {
      type: String, // URL or path to the uploaded image
    },
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko'], // Add more as needed
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
    timeFormat: {
      type: String,
      default: '12',
      enum: ['12', '24'],
    },
    blocked: {
      type: Boolean,
      default: false,
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpire: {
      type: Date,
      select: false,
    },
    removeWatermark: {
      type: Boolean,
      default: false,
    },
    watermarkText: {
      type: String,
      default: 'QR Studio',
    },
    whiteLabel: {
      enabled: {
        type: Boolean,
        default: false,
      },
      brandName: {
        type: String,
        trim: true,
      },
      primaryColor: {
        type: String,
        default: '#6366f1',
      },
      loadingText: {
        type: String,
        trim: true,
      },
      showPoweredBy: {
        type: Boolean,
        default: true,
      },
    },
    subscriptionPlan: {
      type: String,
      enum: ['free', 'basic', 'pro', 'enterprise', 'trial'],
      default: 'free',
    },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'inactive', 'expired', 'cancelled'],
      default: 'active',
    },
    // Free trial tracking
    trialStartDate: {
      type: Date,
      default: null,
    },
    trialEndDate: {
      type: Date,
      default: null,
    },
    hasUsedTrial: {
      type: Boolean,
      default: false,
    },
    isOnTrial: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function () {
  // Skip password hashing if password is not modified or if it's a Google user
  // Also skip if password is already hashed (starts with $2b$ for bcrypt)
  if (!this.isModified('password') || !this.password || this.password.startsWith('$2b$')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
  // Prevent bcrypt errors if password is undefined
  if (!this.password || !enteredPassword) {
    return false;
  }
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to set password (for Google users or password updates)
userSchema.methods.setPassword = async function (newPassword) {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(newPassword, salt);
  // Mark password as modified but don't trigger pre-save hook double hashing
  this.markModified('password');
};

const User = mongoose.model('User', userSchema);

export default User;
