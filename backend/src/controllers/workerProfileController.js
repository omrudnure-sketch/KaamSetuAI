import {
  getWorkerProfileByUserId,
  createOrUpdateWorkerProfile,
  calculateProfileCompletion,
} from '../services/workerProfileService.js';
import { validateWorkerProfile } from '../validators/workerProfileValidator.js';

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
