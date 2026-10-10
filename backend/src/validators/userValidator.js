import { z } from 'zod';

export const createUserSchema = z
  .object({
    name: z
      .string({ required_error: 'Name is required' })
      .trim()
      .min(2, { message: 'Name must be at least 2 characters long' }),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email({ message: 'Invalid email address format' })
      .optional()
      .or(z.literal('')),
    phone: z
      .string()
      .trim()
      .regex(/^[0-9+\s-]{7,15}$/, { message: 'Invalid phone number format' })
      .optional()
      .or(z.literal('')),
    role: z
      .enum(['worker', 'employer', 'admin'], {
        errorMap: () => ({ message: 'Role must be one of: worker, employer, admin' }),
      })
      .default('worker'),
    preferredLanguage: z
      .enum(['en', 'mr', 'hi'], {
        errorMap: () => ({ message: 'Preferred language must be one of: en, mr, hi' }),
      })
      .default('en'),
  })
  .strict();

export const validateCreateUser = (data) => {
  const result = createUserSchema.safeParse(data);
  if (!result.success) {
    const errorMessages = result.error.errors.map((err) => err.message).join('; ');
    return {
      isValid: false,
      error: errorMessages,
      errors: result.error.errors,
    };
  }
  return {
    isValid: true,
    data: result.data,
  };
};
