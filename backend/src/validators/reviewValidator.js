import { z } from 'zod';

const isValidId = (val) => {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) ||
         /^[0-9a-fA-F]{24}$/.test(val) ||
         /^\d+$/.test(val);
};

const createReviewSchema = z
  .object({
    projectId: z
      .string()
      .optional()
      .refine((val) => !val || isValidId(val), { message: 'Invalid Project ID format' }),
    revieweeId: z
      .string({ required_error: 'Reviewee ID is required' })
      .refine(isValidId, { message: 'Invalid Reviewee ID format' }),
    rating: z
      .number({ required_error: 'Rating is required' })
      .int('Rating must be a whole number')
      .min(1, 'Rating must be at least 1')
      .max(5, 'Rating cannot exceed 5'),
    comment: z.string().max(1000, 'Comment cannot exceed 1000 characters').optional().default(''),
  })
  .strict();

export const validateReviewInput = (data) => {
  const result = createReviewSchema.safeParse(data);
  if (!result.success) {
    const errorMessages = result.error.errors.map((e) => e.message).join(', ');
    return { isValid: false, error: errorMessages };
  }
  return { isValid: true, data: result.data };
};
