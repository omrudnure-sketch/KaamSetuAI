import WorkerProfile from '../models/WorkerProfile.js';
import User from '../models/User.js';

export const formatWorkerProfileResponse = (profile) => {
  if (!profile) return null;
  const p = profile.toObject ? profile.toObject() : { ...profile };
  
  const rawCity = p.city || (typeof p.location === 'object' ? p.location?.city : p.location) || '';
  const rawArea = p.area || (typeof p.location === 'object' ? p.location?.area : '') || '';
  const rawAddress = p.address || (typeof p.location === 'object' ? p.location?.address : '') || '';
  const rawPincode = p.pincode || (typeof p.location === 'object' ? p.location?.pincode : '') || '';
  const rawLng = p.longitude ?? (typeof p.location === 'object' ? p.location?.coordinates?.coordinates?.[0] : null) ?? 0;
  const rawLat = p.latitude ?? (typeof p.location === 'object' ? p.location?.coordinates?.coordinates?.[1] : null) ?? 0;

  p.location = {
    city: rawCity,
    area: rawArea,
    address: rawAddress,
    pincode: rawPincode,
    coordinates: {
      type: 'Point',
      coordinates: [rawLng, rawLat],
    },
  };

  if (!p.fullName && p.userId?.name) {
    p.fullName = p.userId.name;
  }
  if (p.isAvailableForWork === undefined) {
    p.isAvailableForWork = p.availability !== 'unavailable';
  }

  return p;
};

export const getWorkerProfileByUserId = async (userId) => {
  const profile = await WorkerProfile.findOne({ userId }).populate('userId', 'name email phone role status');
  return formatWorkerProfileResponse(profile);
};

export const createOrUpdateWorkerProfile = async (userId, profileData) => {
  // Sync name to User model if provided
  if (profileData.fullName && profileData.fullName.trim()) {
    try {
      await User.findByIdAndUpdate(userId, { name: profileData.fullName.trim() });
    } catch (_err) {
      // Non-fatal if user update fails
    }
  }

  // Flatten nested location fields for persistent PostgreSQL storage
  const flattened = { ...profileData, userId };
  if (profileData.location && typeof profileData.location === 'object') {
    if (profileData.location.city !== undefined) flattened.city = profileData.location.city;
    if (profileData.location.area !== undefined) flattened.area = profileData.location.area;
    if (profileData.location.address !== undefined) flattened.address = profileData.location.address;
    if (profileData.location.pincode !== undefined) flattened.pincode = profileData.location.pincode;

    const coords = profileData.location.coordinates?.coordinates;
    if (Array.isArray(coords) && coords.length >= 2) {
      flattened.longitude = coords[0];
      flattened.latitude = coords[1];
    }
    flattened.location = [flattened.area, flattened.city].filter(Boolean).join(', ') || flattened.city || '';
  }

  if (profileData.isAvailableForWork !== undefined) {
    flattened.isAvailableForWork = Boolean(profileData.isAvailableForWork);
    flattened.availability = flattened.isAvailableForWork ? 'available' : 'unavailable';
    flattened.availabilityUpdatedAt = new Date().toISOString();
  } else if (profileData.availability) {
    flattened.isAvailableForWork = profileData.availability !== 'unavailable';
  }

  const filter = { userId };
  const options = {
    new: true,
    upsert: true,
    runValidators: true,
    setDefaultsOnInsert: true,
  };

  const updated = await WorkerProfile.findOneAndUpdate(filter, flattened, options);
  return formatWorkerProfileResponse(updated);
};

export const updateWorkerAvailability = async (userId, availabilityData) => {
  const isAvailable = availabilityData.isAvailableForWork !== undefined
    ? Boolean(availabilityData.isAvailableForWork)
    : (availabilityData.availability === 'available');

  const update = {
    isAvailableForWork: isAvailable,
    availability: isAvailable ? 'available' : 'unavailable',
    availabilityUpdatedAt: new Date().toISOString(),
  };

  const updated = await WorkerProfile.findOneAndUpdate({ userId }, update, { new: true });
  return formatWorkerProfileResponse(updated);
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
    Boolean((profile.city || profile.location?.city) && (profile.city || profile.location?.city).trim()),
    Boolean((profile.area || profile.location?.area) && (profile.area || profile.location?.area).trim()),
    Boolean(profile.profilePhoto && profile.profilePhoto.trim()),
  ];

  const completedCount = checks.filter(Boolean).length;
  return Math.round((completedCount / checks.length) * 100);
};

