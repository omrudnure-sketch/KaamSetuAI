import {
  getWorkerProfileByUserId,
  createOrUpdateWorkerProfile,
  updateWorkerAvailability,
  calculateProfileCompletion,
} from '../services/workerProfileService.js';
import {
  validateWorkerProfile,
  workerAvailabilitySchema,
} from '../validators/workerProfileValidator.js';
import { WorkerProfile } from '../models/index.js';

export const getWorkerProfile = async (req, res, next) => {
  try {
    const profile = await getWorkerProfileByUserId(req.user.id);
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Worker profile not found',
        },
      });
    }

    const completionPercentage = calculateProfileCompletion(profile);

    res.status(200).json({
      success: true,
      data: {
        profile,
        completionPercentage,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createWorkerProfile = async (req, res, next) => {
  try {
    const validation = validateWorkerProfile(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          message: validation.error,
        },
      });
    }

    const updatedProfile = await createOrUpdateWorkerProfile(req.user.id, validation.data);
    const completionPercentage = calculateProfileCompletion(updatedProfile);

    res.status(201).json({
      success: true,
      data: {
        profile: updatedProfile,
        completionPercentage,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateWorkerProfile = async (req, res, next) => {
  try {
    const validation = validateWorkerProfile(req.body, true);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          message: validation.error,
        },
      });
    }

    const updatedProfile = await createOrUpdateWorkerProfile(req.user.id, validation.data);
    const completionPercentage = calculateProfileCompletion(updatedProfile);

    res.status(200).json({
      success: true,
      data: {
        profile: updatedProfile,
        completionPercentage,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const setWorkerAvailability = async (req, res, next) => {
  try {
    const validation = workerAvailabilitySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          message: validation.error.errors[0]?.message || 'Invalid availability parameters',
        },
      });
    }

    const updatedProfile = await updateWorkerAvailability(req.user.id, validation.data);
    res.status(200).json({
      success: true,
      message: 'Worker availability updated successfully',
      data: {
        isAvailableForWork: updatedProfile.isAvailableForWork,
        availability: updatedProfile.availability,
        availabilityUpdatedAt: updatedProfile.availabilityUpdatedAt,
        profile: updatedProfile,
      },
    });
  } catch (error) {
    next(error);
  }
};

const haversineDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

const isValidCoord = (lng, lat) => {
  const numLng = Number(lng);
  const numLat = Number(lat);
  return (
    !isNaN(numLng) &&
    !isNaN(numLat) &&
    numLng >= -180 &&
    numLng <= 180 &&
    numLat >= -90 &&
    numLat <= 90 &&
    !(numLng === 0 && numLat === 0)
  );
};

export const discoverWorkersForEmployer = async (req, res, next) => {
  try {
    const {
      city,
      area,
      skill,
      availability = 'any',
      minExperience,
      minWage,
      maxWage,
      rating,
      lat,
      lng,
      radius = 50,
      page = 1,
      limit = 20,
      sort = 'rating',
    } = req.query;

    const query = {};

    if (city && city.trim()) {
      query.city = new RegExp(city.trim(), 'i');
    }
    if (area && area.trim()) {
      query.area = new RegExp(area.trim(), 'i');
    }
    if (availability === 'available' || availability === 'ready') {
      query.availability = 'available';
    } else if (availability === 'unavailable') {
      query.availability = 'unavailable';
    }

    if (skill && skill.trim()) {
      const skillRegex = new RegExp(skill.trim(), 'i');
      query.$or = [{ primarySkill: skillRegex }, { skills: skillRegex }];
    }

    if (minExperience) {
      query.experienceYears = { $gte: Number(minExperience) };
    }
    if (rating) {
      query.rating = { $gte: Number(rating) };
    }
    if (minWage || maxWage) {
      query.dailyWage = {};
      if (minWage) query.dailyWage.$gte = Number(minWage);
      if (maxWage) query.dailyWage.$lte = Number(maxWage);
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    let sortOption = { rating: -1 };
    if (sort === 'experience') sortOption = { experienceYears: -1 };
    if (sort === 'wage_asc') sortOption = { dailyWage: 1 };
    if (sort === 'wage_desc') sortOption = { dailyWage: -1 };
    if (sort === 'newest') sortOption = { createdAt: -1 };

    const workers = await WorkerProfile.find(query)
      .populate('userId', 'name status')
      .sort(sortOption)
      .limit(100);

    const hasUserCoords = isValidCoord(lng, lat);
    const userLat = Number(lat);
    const userLng = Number(lng);
    const maxRadius = Number(radius) || 50;

    // Filter active workers and map only safe public fields
    let safeWorkers = workers
      .filter((w) => !w.userId || w.userId.status === 'active')
      .map((w) => {
        const item = w.toObject ? w.toObject() : { ...w };
        const wLng = item.longitude ?? (item.location?.coordinates?.coordinates?.[0] ?? null);
        const wLat = item.latitude ?? (item.location?.coordinates?.coordinates?.[1] ?? null);
        const hasCoords = isValidCoord(wLng, wLat);

        let distanceKm = null;
        if (hasUserCoords && hasCoords) {
          distanceKm = haversineDistanceKm(userLat, userLng, Number(wLat), Number(wLng));
        }

        return {
          id: item.id || item._id,
          _id: item.id || item._id,
          fullName: item.fullName || item.userId?.name || 'Skilled Worker',
          primarySkill: item.primarySkill || (Array.isArray(item.skills) ? item.skills[0] : 'General Worker'),
          skills: Array.isArray(item.skills) ? item.skills : [],
          experienceYears: item.experienceYears || 0,
          dailyWage: item.dailyWage,
          hourlyRate: item.hourlyRate,
          rating: item.rating || 0,
          reviewCount: item.reviewCount || 0,
          completedProjects: item.completedProjects || 0,
          isAvailableForWork: item.isAvailableForWork ?? (item.availability !== 'unavailable'),
          availability: item.availability || 'available',
          profilePhoto: item.profilePhoto || '',
          city: item.city || item.location?.city || 'Unspecified',
          area: item.area || item.location?.area || '',
          distanceKm,
        };
      });

    if (hasUserCoords) {
      safeWorkers = safeWorkers.filter((w) => w.distanceKm === null || w.distanceKm <= maxRadius);
      if (sort === 'nearest') {
        safeWorkers.sort((a, b) => {
          if (a.distanceKm === null) return 1;
          if (b.distanceKm === null) return -1;
          return a.distanceKm - b.distanceKm;
        });
      }
    }

    const total = safeWorkers.length;
    const paginatedWorkers = safeWorkers.slice(skip, skip + limitNum);

    res.status(200).json({
      success: true,
      data: {
        workers: paginatedWorkers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

