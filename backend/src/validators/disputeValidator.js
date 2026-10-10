import { z } from 'zod';

const isValidId = (val) => {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) ||
         /^[0-9a-fA-F]{24}$/.test(val) ||
         /^\d+$/.test(val);
};

const createDisputeSchema = z
  .object({
    projectId: z
      .string({ required_error: 'Project ID is required' })
      .refine(isValidId, { message: 'Invalid Project ID format' }),
    againstUserId: z
      .string({ required_error: 'Against User ID is required' })
      .refine(isValidId, { message: 'Invalid Against User ID format' }),
    type: z.enum(['payment', 'attendance', 'work_quality', 'project_completion', 'contract_terms', 'other'], {
      required_error: 'Dispute type is required',
    }),
    amount: z.number().min(0, 'Amount cannot be negative').optional().default(0),
    description: z
      .string({ required_error: 'Dispute description is required' })
      .trim()
      .min(10, 'Description must be at least 10 characters long')
      .max(2000, 'Description cannot exceed 2000 characters'),
    evidence: z.array(z.string()).optional().default([]),
  })
  .strict();

export const validateDisputeInput = (data) => {
  const result = createDisputeSchema.safeParse(data);
  if (!result.success) {
    const errorMessages = result.error.errors.map((e) => e.message).join(', ');
    return { isValid: false, error: errorMessages };
  }
  return { isValid: true, data: result.data };
};
