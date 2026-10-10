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

export const employerProfileSchema = z
  .object({
    name: z
      .string({ required_error: 'Name is required' })
      .trim()
      .min(2, { message: 'Name must be at least 2 characters long' }),
    businessName: z
      .string({ required_error: 'Business name is required' })
      .trim()
      .min(2, { message: 'Business name must be at least 2 characters long' }),
    businessType: z
      .enum(['contractor', 'homeowner', 'small_business', 'construction_company', 'other'], {
        errorMap: () => ({ message: 'Invalid business type specified' }),
      })
      .optional()
      .default('other'),
    profilePhoto: z
      .string()
      .trim()
      .url({ message: 'Profile photo must be a valid URL' })
      .optional()
      .or(z.literal(''))
      .nullable(),
    description: z
      .string()
      .trim()
      .max(1000, { message: 'Description cannot exceed 1000 characters' })
      .optional()
      .default(''),
    phone: z
      .string()
      .trim()
      .regex(/^[0-9]{10}$/, { message: 'Phone number must be a 10-digit number' })
      .optional()
      .or(z.literal('')),
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
  })
  .strict();

export const validateEmployerProfile = (data) => {
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

  const result = employerProfileSchema.safeParse(data);
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
