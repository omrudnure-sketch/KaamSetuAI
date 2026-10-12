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
    hourlyRate: z
      .number({ invalid_type_error: 'Hourly rate must be a number' })
      .min(0, { message: 'Hourly rate must be a positive number' })
      .optional()
      .nullable(),
    languages: z
      .array(z.string().trim())
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
        address: z.string().trim().optional().default(''),
        pincode: z.string().trim().optional().default(''),
        state: z.string().trim().optional().default('Maharashtra'),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        coordinates: z.any().optional(),
      })
      .passthrough()
      .optional(),
    availability: z
      .enum(['available', 'unavailable', 'busy'], {
        errorMap: () => ({ message: 'Availability must be available, unavailable, or busy' }),
      })
      .optional()
      .default('available'),
    isAvailableForWork: z.boolean().optional(),
    serviceRadiusKm: z.number().min(1).max(200).optional(),
    address: z.string().trim().max(300).optional(),
    pincode: z.string().trim().max(10).optional(),
    state: z.string().trim().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    documents: z.array(z.any()).optional().default([]),
    preferredWorkType: z
      .enum(['daily', 'multi_day', 'both'], {
        errorMap: () => ({ message: 'Preferred work type must be daily, multi_day, or both' }),
      })
      .optional()
      .default('both'),
  })
  .passthrough();

export const workerProfileUpdateSchema = workerProfileSchema.partial();

export const workerAvailabilitySchema = z.object({
  isAvailableForWork: z.boolean().optional(),
  availability: z.enum(['available', 'unavailable', 'busy']).optional(),
});

export const validateWorkerProfile = (data, isUpdate = false) => {
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

  const schema = isUpdate ? workerProfileUpdateSchema : workerProfileSchema;
  const result = schema.safeParse(data);
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
