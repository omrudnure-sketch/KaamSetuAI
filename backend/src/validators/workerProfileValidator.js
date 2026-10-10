import { z } from 'zod';

const FORBIDDEN_FIELDS = [
  'userId',
  'role',
  'passwordHash',
  'status',
  'verificationStatus',
  'rating',
  'totalReviews',
  'completedProjects',
  'isVerified',
];

export const workerProfileSchema = z
  .object({
    fullName: z
      .string({ required_error: 'Full name is required' })
      .trim()
      .min(2, { message: 'Full name must be at least 2 characters long' }),
    profilePhoto: z
      .string()
      .trim()
      .url({ message: 'Profile photo must be a valid URL' })
      .optional()
      .or(z.literal(''))
      .nullable(),
    primarySkill: z
      .string({ required_error: 'Primary skill is required' })
      .trim()
      .min(2, { message: 'Primary skill must be at least 2 characters long' }),
    skills: z
      .array(z.string().trim())
      .optional()
      .default([]),
    experienceYears: z
      .number({ invalid_type_error: 'Experience years must be a number' })
      .min(0, { message: 'Experience years cannot be negative' })
      .max(70, { message: 'Experience years exceeds maximum limit' })
      .optional()
      .default(0),
    dailyWage: z
      .number({ invalid_type_error: 'Daily wage must be a number' })
      .min(0, { message: 'Daily wage must be a positive number' })
      .optional()
      .nullable(),
    languages: z
      .array(z.enum(['en', 'mr', 'hi'], { errorMap: () => ({ message: 'Worker languages can only be en, mr, hi' }) }))
      .optional()
      .default(['en']),
    bio: z
      .string()
      .trim()
      .max(1000, { message: 'Bio cannot exceed 1000 characters' })
      .optional()
      .default(''),
    location: z
      .object({
        city: z.string().trim().optional().default(''),
        area: z.string().trim().optional().default(''),
        coordinates: z
          .object({
            type: z.literal('Point').optional().default('Point'),
            coordinates: z.tuple([z.number(), z.number()]).optional().default([0, 0]),
          })
          .optional(),
      })
      .optional(),
    availability: z
      .enum(['available', 'unavailable', 'busy'], {
        errorMap: () => ({ message: 'Availability must be available, unavailable, or busy' }),
      })
      .optional()
      .default('available'),
    preferredWorkType: z
      .enum(['daily', 'multi_day', 'both'], {
        errorMap: () => ({ message: 'Preferred work type must be daily, multi_day, or both' }),
      })
      .optional()
      .default('both'),
  })
  .strict();

export const validateWorkerProfile = (data) => {
  if (data && typeof data === 'object') {
    for (const field of FORBIDDEN_FIELDS) {
      if (field in data) {
        return {
          isValid: false,
          error: `Field '${field}' is system-managed and cannot be modified via profile APIs`,
        };
      }
    }
  }

  const result = workerProfileSchema.safeParse(data);
  if (!result.success) {
    const errorMessages = result.error.errors.map((err) => err.message).join('; ');
    return {
      isValid: false,
      error: errorMessages,
    };
  }

  return {
    isValid: true,
    data: result.data,
  };
};
