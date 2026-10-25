import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import {
  buildGoogleAuthorizeUrl,
  exchangeGoogleCode,
  googleLoginConfig,
  missingGoogleLoginConfig,
  verifyGoogleIdToken,
} from '../utils/googleOAuth.js';
import { resolveGoogleUser } from '../services/googleUserService.js';
import { generateToken } from '../utils/jwt.js';

const STATE_TTL = '10m';
const STATE_KIND = 'google-login';

const frontendBase = () => (process.env.FRONTEND_URL || 'https://qrstudio.daorbit.in').trim().replace(/\/+$/, '');

const signInUrl = (status, extra = {}) => {
  const params = new URLSearchParams({ googleLogin: status, ...extra });
  return `${frontendBase()}/sign-in?${params.toString()}`;
};

const isValidState = (state) => {
  try {
    return jwt.verify(state, process.env.JWT_SECRET).kind === STATE_KIND;
  } catch {
    return false;
  }
};

// @desc    Redirect to Google's consent screen
// @route   GET /api/auth/google
// @access  Public
export const startGoogleLogin = (req, res) => {
  const missing = missingGoogleLoginConfig();
  if (missing.length) {
    console.error(`[google] sign-in not configured, missing: ${missing.join(', ')}`);
    return res.redirect(signInUrl('error', { reason: 'not_configured' }));
  }

  const state = jwt.sign(
    { nonce: crypto.randomBytes(16).toString('hex'), kind: STATE_KIND },
    process.env.JWT_SECRET,
    { expiresIn: STATE_TTL }
  );

  res.redirect(buildGoogleAuthorizeUrl(googleLoginConfig(), state));
};

// @desc    Handle Google's redirect, sign the user in and send them back to the app
// @route   GET /api/auth/google/callback
// @access  Public
export const googleLoginCallback = async (req, res) => {
  if (req.query.error) {
    const cancelled = req.query.error === 'access_denied';
    return res.redirect(signInUrl(cancelled ? 'cancelled' : 'error', { reason: 'denied' }));
  }

  const code = String(req.query.code || '');
  const state = String(req.query.state || '');
  if (!code) return res.redirect(signInUrl('error', { reason: 'missing_code' }));
  if (!isValidState(state)) return res.redirect(signInUrl('error', { reason: 'invalid_state' }));

  const config = googleLoginConfig();
  let profile;
  try {
    const idToken = await exchangeGoogleCode(config, code);
    profile = await verifyGoogleIdToken(idToken, config.clientId);
  } catch (error) {
    console.error('[google] code exchange failed:', error.message);
    return res.redirect(signInUrl('error', { reason: 'google_failed' }));
  }
  if (!profile) return res.redirect(signInUrl('error', { reason: 'no_email' }));

  try {
    const { user, created } = await resolveGoogleUser(profile);
    if (user.blocked) return res.redirect(signInUrl('error', { reason: 'blocked' }));
    return res.redirect(signInUrl(created ? 'created' : 'ok', { token: generateToken(user._id) }));
  } catch (error) {
    console.error('[google] login failed:', error.message);
    return res.redirect(signInUrl('error', { reason: 'login_failed' }));
  }
};

// @desc    Report whether Google sign-in is configured
// @route   GET /api/auth/google/config
// @access  Public
export const getGoogleLoginConfig = (req, res) => {
  const missing = missingGoogleLoginConfig();
  res.json({ configured: missing.length === 0, missing, redirectUri: googleLoginConfig().redirectUri });
};
