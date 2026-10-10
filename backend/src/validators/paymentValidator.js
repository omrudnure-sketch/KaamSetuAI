import { z } from 'zod';
import mongoose from 'mongoose';

const isValidObjectId = (val) => mongoose.Types.ObjectId.isValid(val);

const recordPaymentSchema = z
  .object({
    projectWorkerId: z
      .string({ required_error: 'ProjectWorker ID is required' })
      .refine(isValidObjectId, { message: 'Invalid ProjectWorker ID format' }),
    type: z.enum(['daily', 'weekly', 'milestone', 'final', 'adjustment'], {
      required_error: 'Payment type is required',
      invalid_type_error: 'Invalid payment type',
    }),
    amount: z
      .number({ required_error: 'Payment amount is required' })
      .min(0.01, 'Payment amount must be greater than 0'),
    paymentDate: z
      .string()
      .optional()
      .refine((val) => !val || !isNaN(Date.parse(val)), { message: 'Invalid payment date format' }),
    status: z.enum(['pending', 'recorded', 'disputed', 'cancelled']).optional().default('recorded'),
    method: z.enum(['cash', 'bank_transfer', 'upi', 'other']).optional().default('cash'),
    reference: z.string().max(200, 'Reference cannot exceed 200 characters').optional().default(''),
    notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional().default(''),
  })
  .strict();

export const validatePaymentInput = (data) => {
  const result = recordPaymentSchema.safeParse(data);
  if (!result.success) {
    const errorMessages = result.error.errors.map((e) => e.message).join(', ');
    return { isValid: false, error: errorMessages };
  }
  return { isValid: true, data: result.data };
};
