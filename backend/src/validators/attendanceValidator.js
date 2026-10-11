import { z } from 'zod';

const idRegex = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-fA-F]{24}|\d+)$/i;

const checkInSchema = z
  .object({
    projectId: z
      .string({ required_error: 'Project ID is required' })
      .regex(idRegex, 'Invalid Project ID format'),
    date: z.string().optional(),
    notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional().default(''),
    location: z
      .object({
        type: z.enum(['Point']).optional().default('Point'),
        coordinates: z.array(z.number()).length(2).optional().default([0, 0]),
      })
      .optional(),
  })
  .strict();

const checkOutSchema = z
  .object({
    projectId: z
      .string({ required_error: 'Project ID is required' })
      .regex(idRegex, 'Invalid Project ID format'),
    date: z.string().optional(),
    notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional().default(''),
    location: z
      .object({
        type: z.enum(['Point']).optional().default('Point'),
        coordinates: z.array(z.number()).length(2).optional().default([0, 0]),
      })
      .optional(),
  })
  .strict();

export const validateCheckIn = (data) => {
  const result = checkInSchema.safeParse(data);
  if (!result.success) {
    const errorMessages = result.error.errors.map((e) => e.message).join(', ');
    return { isValid: false, error: errorMessages };
  }
  return { isValid: true, data: result.data };
};

export const validateCheckOut = (data) => {
  const result = checkOutSchema.safeParse(data);
  if (!result.success) {
    const errorMessages = result.error.errors.map((e) => e.message).join(', ');
    return { isValid: false, error: errorMessages };
  }
  return { isValid: true, data: result.data };
};
