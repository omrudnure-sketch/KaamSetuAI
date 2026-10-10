import { z } from 'zod';

const workingHoursSchema = z.object({
  start: z.string().optional().default('09:00'),
  end: z.string().optional().default('18:00'),
  description: z.string().optional().default(''),
});

const createProjectSchema = z
  .object({
    name: z.string().min(2, 'Project name must be at least 2 characters').optional(),
    description: z.string().optional().default(''),
    durationType: z.enum(['single_day', 'fixed_duration', 'until_completion']).optional(),
    startDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid start date format' })
      .optional(),
    originalEstimatedEndDate: z
      .string()
      .nullable()
      .optional()
      .refine((val) => !val || !isNaN(Date.parse(val)), { message: 'Invalid end date format' }),
    workingHours: workingHoursSchema.optional(),
    paymentType: z.enum(['daily', 'weekly', 'fixed']).optional(),
    paymentAmount: z.number().nonnegative('Payment amount cannot be negative').optional(),
    workersRequired: z.number().min(1, 'Workers required must be at least 1').optional(),
  })
  .refine(
    (data) => {
      if (data.durationType === 'fixed_duration' && data.startDate && data.originalEstimatedEndDate) {
        const start = new Date(data.startDate).getTime();
        const end = new Date(data.originalEstimatedEndDate).getTime();
        return end > start;
      }
      return true;
    },
    {
      message: 'For fixed_duration projects, end date must be after start date',
      path: ['originalEstimatedEndDate'],
    }
  );

export const validateProjectInput = (data) => {
  const result = createProjectSchema.safeParse(data);
  if (!result.success) {
    const errorMessages = result.error.errors.map((e) => e.message).join(', ');
    return { isValid: false, error: errorMessages };
  }
  return { isValid: true, data: result.data };
};
