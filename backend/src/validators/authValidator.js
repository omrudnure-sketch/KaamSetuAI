import { z } from 'zod';

export const registerSchema = z
  .object({
    name: z
      .string({ required_error: 'Name is required' })
      .trim()
      .min(1, { message: 'Name is required' }),
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
      .regex(/^[0-9]{10}$/, { message: 'Invalid phone number format. Must be a 10-digit number.' })
      .optional()
      .or(z.literal('')),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, { message: 'Password must be at least 8 characters long' }),
    role: z.enum(['worker', 'employer'], {
      errorMap: () => ({ message: 'Public registration is only allowed for worker or employer roles' }),
    }),
    preferredLanguage: z
      .enum(['en', 'mr', 'hi'], {
        errorMap: () => ({ message: 'Preferred language must be one of: en, mr, hi' }),
      })
      .default('en'),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.role === 'employer' && val.preferredLanguage && val.preferredLanguage !== 'en') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Employers are restricted to English language only',
        path: ['preferredLanguage'],
      });
    }
  });

export const loginSchema = z
  .object({
    email: z
      .string({ required_error: 'Email or phone number is required' })
      .trim(),
    password: z
      .string({ required_error: 'Password is required' }),
  })
  .strict();

export const validateRegister = (data) => {
  if (data && data.role === 'admin') {
    return {
      isValid: false,
      error: 'Admin registration is forbidden',
    };
  }

  const result = registerSchema.safeParse(data);
  if (!result.success) {
    const errorMessages = result.error.errors.map((err) => err.message).join('; ');
    return {
      isValid: false,
      error: errorMessages,
    };
  }

  return {
    isValid: true,
    data: result.data,
  };
};

export const validateLogin = (data) => {
  const result = loginSchema.safeParse(data);
  if (!result.success) {
    const errorMessages = result.error.errors.map((err) => err.message).join('; ');
    return {
      isValid: false,
      error: errorMessages,
    };
  }

  return {
    isValid: true,
    data: result.data,
  };
};

