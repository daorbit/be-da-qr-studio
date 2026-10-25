export const DEFAULT_PLAN_FEATURES = {
  free: {
    maxQRCodes: 5,
    maxScansPerQR: 20,
    maxMembers: 1,
    analytics: false,
    advancedAnalytics: false,
    whiteLabel: false,
    removeWatermark: false,
    passwordProtection: false,
    expirationDate: false,
    customScanLimit: false
  },
  basic: {
    maxQRCodes: 50,
    maxScansPerQR: 1000,
    maxMembers: 3,
    analytics: true,
    advancedAnalytics: false,
    whiteLabel: false,
    removeWatermark: false,
    passwordProtection: true,
    expirationDate: true,
    customScanLimit: true
  },
  pro: {
    maxQRCodes: 200,
    maxScansPerQR: 10000,
    maxMembers: 10,
    analytics: true,
    advancedAnalytics: true,
    whiteLabel: true,
    removeWatermark: true,
    passwordProtection: true,
    expirationDate: true,
    customScanLimit: true
  },
  enterprise: {
    maxQRCodes: -1,
    maxScansPerQR: -1,
    maxMembers: -1,
    analytics: true,
    advancedAnalytics: true,
    whiteLabel: true,
    removeWatermark: true,
    passwordProtection: true,
    expirationDate: true,
    customScanLimit: true
  },
  trial: {
    maxQRCodes: -1,
    maxScansPerQR: -1,
    maxMembers: 10,
    analytics: true,
    advancedAnalytics: true,
    whiteLabel: true,
    removeWatermark: true,
    passwordProtection: true,
    expirationDate: true,
    customScanLimit: true
  }
};
