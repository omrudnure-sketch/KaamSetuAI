import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const workingHoursSchema = z.object({
  start: z.string().optional().default('09:00'),
  end: z.string().optional().default('18:00'),
  description: z.string().optional().default(''),
});

const createHiringAgreementSchema = z
  .object({
    sourceType: z.enum(['application', 'invitation'], {
      required_error: 'Source type is required (application or invitation)',
    }),
    sourceId: z
      .string({ required_error: 'Source ID is required' })
      .regex(objectIdRegex, 'Invalid Source ID format'),
    durationType: z.enum(['single_day', 'fixed_duration', 'until_completion'], {
      required_error: 'Valid duration type is required',
    }),
    startDate: z
      .string({ required_error: 'Start date is required' })
      .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid start date format' }),
    estimatedEndDate: z
      .string()
      .nullable()
      .optional()
      .refine((val) => !val || !isNaN(Date.parse(val)), { message: 'Invalid estimated end date format' }),
    wageType: z.enum(['daily', 'weekly', 'fixed'], {
      required_error: 'Valid wage type is required',
    }),
    proposedWage: z
      .number({ required_error: 'Proposed wage is required' })
      .positive('Proposed wage must be greater than 0'),
    workingHours: workingHoursSchema.optional().default({ start: '09:00', end: '18:00', description: '' }),
    message: z.string().max(1000, 'Message length must be reasonable (max 1000 characters)').optional().default(''),
  })
  .refine(
    (data) => {
      if (data.durationType === 'fixed_duration') {
        if (!data.estimatedEndDate) return false;
        const start = new Date(data.startDate).getTime();
        const end = new Date(data.estimatedEndDate).getTime();
        return end > start;
      }
      return true;
    },
    {
      message: 'For fixed_duration, estimatedEndDate is required and must be after startDate',
      path: ['estimatedEndDate'],
    }
  );

const counterOfferSchema = z
  .object({
    durationType: z.enum(['single_day', 'fixed_duration', 'until_completion'], {
      required_error: 'Valid duration type is required',
    }),
    startDate: z
      .string({ required_error: 'Start date is required' })
      .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid start date format' }),
    estimatedEndDate: z
      .string()
      .nullable()
      .optional()
      .refine((val) => !val || !isNaN(Date.parse(val)), { message: 'Invalid estimated end date format' }),
    wageType: z.enum(['daily', 'weekly', 'fixed'], {
      required_error: 'Valid wage type is required',
    }),
    proposedWage: z
      .number({ required_error: 'Proposed wage is required' })
      .positive('Proposed wage must be greater than 0'),
    workingHours: workingHoursSchema.optional().default({ start: '09:00', end: '18:00', description: '' }),
    message: z.string().max(1000, 'Message length must be reasonable (max 1000 characters)').optional().default(''),
  })
  .refine(
    (data) => {
      if (data.durationType === 'fixed_duration') {
        if (!data.estimatedEndDate) return false;
        const start = new Date(data.startDate).getTime();
        const end = new Date(data.estimatedEndDate).getTime();
        return end > start;
      }
      return true;
    },
    {
      message: 'For fixed_duration, estimatedEndDate is required and must be after startDate',
      path: ['estimatedEndDate'],
    }
  );

export const validateCreateHiringAgreement = (data) => {
  const result = createHiringAgreementSchema.safeParse(data);
  if (!result.success) {
    const errorMessages = result.error.errors.map((e) => e.message).join(', ');
    return { isValid: false, error: errorMessages };
  }
  return { isValid: true, data: result.data };
};

export const validateCounterOffer = (data) => {
  const result = counterOfferSchema.safeParse(data);
  if (!result.success) {
    const errorMessages = result.error.errors.map((e) => e.message).join(', ');
    return { isValid: false, error: errorMessages };
  }
  return { isValid: true, data: result.data };
};
