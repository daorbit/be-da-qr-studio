import User from '../models/User.js';
import { startTrialForUser } from './trialService.js';

/**
 * Find the user for a verified Google profile, linking or creating the account as needed
 * @param {{sub: string, email: string, name: string, picture: string}} profile
 * @returns {Promise<{user: object, created: boolean}>}
 */
export const resolveGoogleUser = async (profile) => {
  let user = await User.findOne({ email: profile.email });

  if (!user) {
    user = await User.create({
      email: profile.email,
      googleId: profile.sub,
      name: profile.name,
      picture: profile.picture,
      profilePicture: profile.picture,
      isVerified: true,
      isEmailVerified: true,
    });

    await startTrialForUser(user);

    return { user, created: true };
  }

  if (!user.googleId) {
    user.googleId = profile.sub;
    user.picture = profile.picture;
    user.isVerified = true;
    user.isEmailVerified = true;
    user.profilePicture = user.profilePicture || profile.picture;
    await user.save();
  }

  return { user, created: false };
};
