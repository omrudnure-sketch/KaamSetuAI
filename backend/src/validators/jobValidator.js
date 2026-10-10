import { z } from 'zod';

const FORBIDDEN_FIELDS = ['employerId', '_id', 'createdAt', 'updatedAt'];

const jobBaseSchema = z.object({
  title: z
    .string({ required_error: 'Job title is required' })
    .trim()
    .min(3, { message: 'Job title must be at least 3 characters long' })
    .max(120, { message: 'Job title cannot exceed 120 characters' }),
  description: z
    .string({ required_error: 'Job description is required' })
    .trim()
    .min(10, { message: 'Job description must be at least 10 characters long' })
    .max(3000, { message: 'Job description cannot exceed 3000 characters' }),
  skillRequired: z
    .string({ required_error: 'Required skill is required' })
    .trim()
    .min(2, { message: 'Required skill must be at least 2 characters long' }),
  additionalSkills: z
    .array(z.string().trim())
    .optional()
    .default([]),
  workersRequired: z
    .number({ invalid_type_error: 'Workers required must be a number' })
    .int({ message: 'Workers required must be an integer' })
    .min(1, { message: 'Workers required must be at least 1' })
    .optional()
    .default(1),
  location: z.object({
    city: z
      .string({ required_error: 'City is required' })
      .trim()
      .min(1, { message: 'City is required' }),
    area: z.string().trim().optional().default(''),
    address: z.string().trim().optional().default(''),
    coordinates: z
      .object({
        type: z.literal('Point').optional().default('Point'),
        coordinates: z.tuple([z.number(), z.number()]).optional().default([0, 0]),
      })
      .optional(),
  }),
  wageType: z
    .enum(['daily', 'weekly', 'fixed'], {
      errorMap: () => ({ message: 'Wage type must be daily, weekly, or fixed' }),
    })
    .default('daily'),
  wageAmount: z
    .number({ required_error: 'Wage amount is required' })
    .min(0, { message: 'Wage amount must be a positive number' }),
  durationType: z
    .enum(['single_day', 'fixed_duration', 'until_completion'], {
      errorMap: () => ({ message: 'Duration type must be single_day, fixed_duration, or until_completion' }),
    })
    .default('single_day'),
  startDate: z
    .string({ required_error: 'Start date is required' })
    .or(z.date())
    .transform((val) => new Date(val)),
  estimatedEndDate: z
    .string()
    .or(z.date())
    .optional()
    .nullable()
    .transform((val) => (val ? new Date(val) : null)),
  workingHours: z
    .object({
      start: z.string().trim().optional().default('09:00'),
      end: z.string().trim().optional().default('18:00'),
      description: z.string().trim().optional().default(''),
    })
    .optional(),
  requirements: z
    .array(z.string().trim())
    .optional()
    .default([]),
  status: z
    .enum(['draft', 'open', 'paused', 'closed', 'cancelled', 'completed'], {
      errorMap: () => ({ message: 'Invalid status specified' }),
    })
    .optional()
    .default('open'),
});

export const createJobSchema = jobBaseSchema
  .strict()
  .superRefine((val, ctx) => {
    if (val.durationType === 'fixed_duration') {
      if (!val.estimatedEndDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Estimated end date is required for fixed_duration jobs',
          path: ['estimatedEndDate'],
        });
      } else if (val.startDate && val.estimatedEndDate <= val.startDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Estimated end date must be after start date',
          path: ['estimatedEndDate'],
        });
      }
    }
  });

export const updateJobSchema = jobBaseSchema
  .partial()
  .superRefine((val, ctx) => {
    if (val.durationType === 'fixed_duration' && val.estimatedEndDate && val.startDate) {
      if (val.estimatedEndDate <= val.startDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Estimated end date must be after start date',
          path: ['estimatedEndDate'],
        });
      }
    }
  });

export const validateCreateJob = (data) => {
  if (data && typeof data === 'object') {
    for (const field of FORBIDDEN_FIELDS) {
      if (field in data) {
        return {
          isValid: false,
          error: `Field '${field}' is system-managed and cannot be set directly by client`,
        };
      }
    }
  }

  const result = createJobSchema.safeParse(data);
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

export const validateUpdateJob = (data) => {
  if (data && typeof data === 'object') {
    for (const field of FORBIDDEN_FIELDS) {
      if (field in data) {
        return {
          isValid: false,
          error: `Field '${field}' is system-managed and cannot be set directly by client`,
        };
      }
    }
  }

  const result = updateJobSchema.safeParse(data);
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
