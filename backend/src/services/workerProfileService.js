import WorkerProfile from '../models/WorkerProfile.js';

export const getWorkerProfileByUserId = async (userId) => {
  return await WorkerProfile.findOne({ userId }).populate('userId', 'name email phone role status');
};

export const createOrUpdateWorkerProfile = async (userId, profileData) => {
  // Ensure profile is linked to authenticated userId
  const filter = { userId };
  const update = {
    ...profileData,
    userId,
  };

  const options = {
    new: true,
    upsert: true,
    runValidators: true,
    setDefaultsOnInsert: true,
  };

  return await WorkerProfile.findOneAndUpdate(filter, update, options);
};

export const calculateProfileCompletion = (profile) => {
  if (!profile) return 0;

  const checks = [
    Boolean(profile.fullName && profile.fullName.trim()),
    Boolean(profile.primarySkill && profile.primarySkill.trim()),
    Boolean(Array.isArray(profile.skills) && profile.skills.length > 0),
    Boolean(typeof profile.experienceYears === 'number' && profile.experienceYears >= 0),
    Boolean(profile.dailyWage && profile.dailyWage > 0),
    Boolean(Array.isArray(profile.languages) && profile.languages.length > 0),
    Boolean(profile.bio && profile.bio.trim()),
    Boolean(profile.location && profile.location.city && profile.location.city.trim()),
    Boolean(profile.location && profile.location.area && profile.location.area.trim()),
    Boolean(profile.profilePhoto && profile.profilePhoto.trim()),
  ];

  const completedCount = checks.filter(Boolean).length;
  return Math.round((completedCount / checks.length) * 100);
};
