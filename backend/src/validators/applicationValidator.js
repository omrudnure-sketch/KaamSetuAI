import { z } from 'zod';

const idRegex = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-fA-F]{24}|\d+)$/i;

const createApplicationSchema = z
  .object({
    jobId: z
      .string({ required_error: 'Job ID is required' })
      .regex(idRegex, 'Invalid Job ID format'),
    proposedWage: z
      .number({ required_error: 'Proposed wage is required' })
      .positive('Proposed wage must be greater than 0'),
    message: z.string().max(1000, 'Message cannot exceed 1000 characters').optional().default(''),
  })
  .strict();

export const validateCreateApplication = (data) => {
  const result = createApplicationSchema.safeParse(data);
  if (!result.success) {
    const errorMessages = result.error.errors.map((e) => e.message).join(', ');
    return { isValid: false, error: errorMessages };
  }
  return { isValid: true, data: result.data };
};
