import { z } from 'zod';

const createProgressSchema = z
  .object({
    date: z.string().optional(),
    percentage: z
      .union([z.number(), z.string().transform((v) => Number(v))])
      .refine((val) => !isNaN(val) && val >= 0 && val <= 100, {
        message: 'Progress percentage must be between 0 and 100',
      }),
    description: z.string().max(2000, 'Description cannot exceed 2000 characters').optional().default(''),
    summary: z.string().max(2000).optional(),
    tasksCompleted: z.array(z.string()).optional().default([]),
    blockers: z.array(z.string()).optional().default([]),
    expectedCompletionDate: z
      .string()
      .nullable()
      .optional()
      .refine((val) => !val || !isNaN(Date.parse(val)), { message: 'Invalid expected completion date' }),
    photos: z.array(z.string()).optional().default([]),
  });

export const validateProgressInput = (data) => {
  const result = createProgressSchema.safeParse(data);
  if (!result.success) {
    const errorMessages = result.error.errors.map((e) => e.message).join(', ');
    return { isValid: false, error: errorMessages };
  }
  return { isValid: true, data: result.data };
};
