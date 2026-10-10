import { z } from 'zod';
import mongoose from 'mongoose';

const isValidObjectId = (val) => mongoose.Types.ObjectId.isValid(val);

const createComplaintSchema = z
  .object({
    targetUserId: z
      .string({ required_error: 'Target User ID is required' })
      .refine(isValidObjectId, { message: 'Invalid Target User ID format' }),
    projectId: z
      .string()
      .nullable()
      .optional()
      .refine((val) => !val || isValidObjectId(val), { message: 'Invalid Project ID format' }),
    jobId: z
      .string()
      .nullable()
      .optional()
      .refine((val) => !val || isValidObjectId(val), { message: 'Invalid Job ID format' }),
    category: z.enum(
      [
        'payment',
        'attendance',
        'harassment',
        'fraud',
        'job_issue',
        'worker_issue',
        'employer_issue',
        'misconduct',
        'safety',
        'other',
      ],
      { required_error: 'Complaint category is required' }
    ),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
    description: z
      .string({ required_error: 'Description is required' })
      .trim()
      .min(10, 'Description must be at least 10 characters long')
      .max(2000, 'Description cannot exceed 2000 characters'),
    evidence: z.array(z.string()).optional().default([]),
  })
  .strict();

export const validateComplaintInput = (data) => {
  const result = createComplaintSchema.safeParse(data);
  if (!result.success) {
    const errorMessages = result.error.errors.map((e) => e.message).join(', ');
    return { isValid: false, error: errorMessages };
  }
  return { isValid: true, data: result.data };
};
