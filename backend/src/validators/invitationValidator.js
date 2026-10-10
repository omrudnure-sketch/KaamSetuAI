import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const createInvitationSchema = z
  .object({
    jobId: z
      .string({ required_error: 'Job ID is required' })
      .regex(objectIdRegex, 'Invalid Job ID format'),
    workerId: z
      .string({ required_error: 'Worker ID is required' })
      .regex(objectIdRegex, 'Invalid Worker ID format'),
    proposedWage: z
      .number({ required_error: 'Proposed wage is required' })
      .positive('Proposed wage must be greater than 0'),
    message: z.string().max(1000, 'Message cannot exceed 1000 characters').optional().default(''),
    expiresAt: z.string().optional(),
  })
  .strict();

export const validateCreateInvitation = (data) => {
  const result = createInvitationSchema.safeParse(data);
  if (!result.success) {
    const errorMessages = result.error.errors.map((e) => e.message).join(', ');
    return { isValid: false, error: errorMessages };
  }
  return { isValid: true, data: result.data };
};
