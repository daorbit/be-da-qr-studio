import axios from 'axios';

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';
const GOOGLE_TIMEOUT_MS = 15_000;

export const GOOGLE_LOGIN_SCOPE = 'openid email profile';

export const googleLoginConfig = () => {
  const base = (process.env.PUBLIC_BASE_URL || '').replace(/\/+$/, '');
  return {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_CALLBACK_URL || (base ? `${base}/api/auth/google/callback` : ''),
  };
};

export const missingGoogleLoginConfig = () => {
  const { clientId, clientSecret, redirectUri } = googleLoginConfig();
  const missing = [];
  if (!clientId) missing.push('GOOGLE_CLIENT_ID');
  if (!clientSecret) missing.push('GOOGLE_CLIENT_SECRET');
  if (!redirectUri) missing.push('GOOGLE_CALLBACK_URL or PUBLIC_BASE_URL');
  return missing;
};

export const buildGoogleAuthorizeUrl = (config, state) => {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: GOOGLE_LOGIN_SCOPE,
    access_type: 'online',
    prompt: 'select_account',
    include_granted_scopes: 'true',
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
};

/**
 * Exchange an authorization code for Google's tokens
 * @returns {Promise<string|undefined>} The ID token
 */
export const exchangeGoogleCode = async (config, code) => {
  const { data } = await axios.post(
    TOKEN_URL,
    new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    }),
    { timeout: GOOGLE_TIMEOUT_MS, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return data?.id_token ? String(data.id_token) : undefined;
};

/**
 * Verify a Google ID token and return the profile it attests to
 * @returns {Promise<{sub: string, email: string, name: string, picture: string}|null>}
 */
export const verifyGoogleIdToken = async (idToken, audience) => {
  if (!idToken || !audience) return null;

  try {
    const { data } = await axios.get(TOKENINFO_URL, {
      params: { id_token: idToken },
      timeout: 8000,
      validateStatus: () => true,
    });

    if (!data || typeof data !== 'object') return null;
    if (data.aud !== audience) return null;
    if (data.iss !== 'https://accounts.google.com' && data.iss !== 'accounts.google.com') return null;

    const exp = Number(data.exp || 0);
    if (!exp || exp * 1000 <= Date.now()) return null;

    // An unverified address must not be able to claim an existing account with the same email.
    if (String(data.email_verified) !== 'true') return null;

    const email = String(data.email || '').toLowerCase().trim();
    const sub = String(data.sub || '');
    if (!email || !sub) return null;

    return {
      sub,
      email,
      name: String(data.name || '').trim() || email.split('@')[0],
      picture: String(data.picture || ''),
    };
  } catch (error) {
    console.error('[google] ID token verification failed:', error.message);
    return null;
  }
};
