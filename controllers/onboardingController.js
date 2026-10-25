import User from '../models/User.js';

const cleanList = (value) =>
  Array.isArray(value) ? value.filter((v) => typeof v === 'string').map((v) => v.trim().slice(0, 40)).filter(Boolean).slice(0, 12) : [];

export const saveOnboarding = async (req, res) => {
  const { useCases, teamSize, referralSources } = req.body || {};

  await User.findByIdAndUpdate(req.user._id, {
    onboarding: {
      useCases: cleanList(useCases),
      teamSize: typeof teamSize === 'string' ? teamSize.slice(0, 20) : null,
      referralSources: cleanList(referralSources),
      completedAt: new Date(),
    },
  });

  res.json({ success: true });
};
