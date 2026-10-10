import EmployerProfile from '../models/EmployerProfile.js';

export const getEmployerProfileByUserId = async (userId) => {
  return await EmployerProfile.findOne({ userId }).populate('userId', 'name email phone role status');
};

export const createOrUpdateEmployerProfile = async (userId, profileData) => {
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

  return await EmployerProfile.findOneAndUpdate(filter, update, options);
};

export const calculateProfileCompletion = (profile) => {
  if (!profile) return 0;

  const checks = [
    Boolean(profile.name && profile.name.trim()),
    Boolean(profile.businessName && profile.businessName.trim()),
    Boolean(profile.businessType && profile.businessType.trim()),
    Boolean(profile.phone && profile.phone.trim()),
    Boolean(profile.description && profile.description.trim()),
    Boolean(profile.location && profile.location.city && profile.location.city.trim()),
    Boolean(profile.location && profile.location.area && profile.location.area.trim()),
    Boolean(profile.profilePhoto && profile.profilePhoto.trim()),
  ];

  const completedCount = checks.filter(Boolean).length;
  return Math.round((completedCount / checks.length) * 100);
};
