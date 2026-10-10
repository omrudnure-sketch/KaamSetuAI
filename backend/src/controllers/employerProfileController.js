import {
  getEmployerProfileByUserId,
  createOrUpdateEmployerProfile,
  calculateProfileCompletion,
} from '../services/employerProfileService.js';
import { validateEmployerProfile } from '../validators/employerProfileValidator.js';

export const getEmployerProfile = async (req, res, next) => {
  try {
    const profile = await getEmployerProfileByUserId(req.user.id);
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Employer profile not found',
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

export const createEmployerProfile = async (req, res, next) => {
  try {
    const validation = validateEmployerProfile(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          message: validation.error,
        },
      });
    }

    const updatedProfile = await createOrUpdateEmployerProfile(req.user.id, validation.data);
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

export const updateEmployerProfile = async (req, res, next) => {
  try {
    const validation = validateEmployerProfile(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          message: validation.error,
        },
      });
    }

    const updatedProfile = await createOrUpdateEmployerProfile(req.user.id, validation.data);
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
