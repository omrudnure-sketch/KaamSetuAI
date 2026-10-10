import { z } from 'zod';

const createProgressSchema = z
  .object({
    date: z.string().optional(),
    percentage: z
      .number({ required_error: 'Progress percentage is required' })
      .min(0, 'Percentage cannot be less than 0')
      .max(100, 'Percentage cannot exceed 100'),
    description: z.string().max(2000, 'Description cannot exceed 2000 characters').optional().default(''),
    tasksCompleted: z.array(z.string()).optional().default([]),
    blockers: z.array(z.string()).optional().default([]),
    expectedCompletionDate: z
      .string()
      .nullable()
      .optional()
      .refine((val) => !val || !isNaN(Date.parse(val)), { message: 'Invalid expected completion date' }),
    photos: z.array(z.string().url('Photo must be a valid URL')).optional().default([]),
  })
  .strict();

export const validateProgressInput = (data) => {
  const result = createProgressSchema.safeParse(data);
  if (!result.success) {
    const errorMessages = result.error.errors.map((e) => e.message).join(', ');
    return { isValid: false, error: errorMessages };
  }
  return { isValid: true, data: result.data };
};
