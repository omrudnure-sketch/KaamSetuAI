import { z } from 'zod';

const isValidId = (val) => {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) ||
         /^[0-9a-fA-F]{24}$/.test(val) ||
         /^\d+$/.test(val);
};

const createExtensionSchema = z
  .object({
    projectId: z
      .string({ required_error: 'Project ID is required' })
      .refine(isValidId, { message: 'Invalid Project ID format' })
      .optional(), // Can also be derived from route params
    projectWorkerId: z
      .string()
      .nullable()
      .optional()
      .refine((val) => !val || isValidId(val), { message: 'Invalid ProjectWorker ID format' }),
    requestedEndDate: z
      .string({ required_error: 'Requested end date is required' })
      .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid requested end date format' }),
    proposedWage: z
      .number({ invalid_type_error: 'Proposed wage must be a number' })
      .min(0.01, 'Proposed wage must be greater than 0')
      .nullable()
      .optional(),
    reason: z
      .string({ required_error: 'Reason is required' })
      .trim()
      .min(5, 'Reason must be at least 5 characters long')
      .max(500, 'Reason cannot exceed 500 characters'),
  })
  .strict();

export const validateExtensionInput = (data) => {
  const result = createExtensionSchema.safeParse(data);
  if (!result.success) {
    const errorMessages = result.error.errors.map((e) => e.message).join(', ');
    return { isValid: false, error: errorMessages };
  }
  return { isValid: true, data: result.data };
};
