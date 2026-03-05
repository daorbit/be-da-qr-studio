import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  planType: {
    type: String,
    enum: ['free', 'basic', 'pro', 'enterprise', 'trial'],
    default: 'free'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'expired', 'cancelled'],
    default: 'active'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: function() {
      return this.planType !== 'free'; // Only required for paid plans
    }
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    default: null
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // Null for automatic updates, admin ID for manual changes
  },
  features: {
    maxQRCodes: {
      type: Number,
      default: 5 // Free plan limit
    },
    maxScansPerQR: {
      type: Number,
      default: 100 // Free plan limit
    },
    analytics: {
      type: Boolean,
      default: false
    },
    advancedAnalytics: {
      type: Boolean,
      default: false
    },
    whiteLabel: {
      type: Boolean,
      default: false
    },
    removeWatermark: {
      type: Boolean,
      default: false
    },
    passwordProtection: {
      type: Boolean,
      default: false
    },
    expirationDate: {
      type: Boolean,
      default: false
    },
    customScanLimit: {
      type: Boolean,
      default: false
    }
  },
  // Trial tracking
  isTrialSubscription: {
    type: Boolean,
    default: false
  },
  trialStartDate: {
    type: Date,
    default: null
  },
  trialEndDate: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
subscriptionSchema.pre('save', function() {
  this.updatedAt = new Date();
});

// Method to check if trial is active
subscriptionSchema.methods.isTrialActive = function() {
  if (!this.isTrialSubscription || !this.trialEndDate) {
    return false;
  }
  return new Date() <= this.trialEndDate;
};

// Method to check if subscription is expired (including trial)
subscriptionSchema.methods.isExpired = function() {
  const now = new Date();
  if (this.isTrialSubscription) {
    return this.trialEndDate && now > this.trialEndDate;
  }
  return this.endDate && now > this.endDate;
};

// Index for efficient queries
subscriptionSchema.index({ userId: 1 });
subscriptionSchema.index({ status: 1, endDate: 1 });
subscriptionSchema.index({ isTrialSubscription: 1, trialEndDate: 1 });

const Subscription = mongoose.model('Subscription', subscriptionSchema);

export default Subscription;