import { z } from 'zod';

export const registerSchema = z
  .object({
    name: z
      .string({ required_error: 'Name is required' })
      .trim()
      .min(1, { message: 'Name is required' })
      .max(50, { message: 'Full name cannot exceed 50 characters' }),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .optional()
      .nullable()
      .or(z.literal('')),
    phone: z
      .string()
      .trim()
      .optional()
      .nullable()
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
    // 1. Language constraint for employers
    if (val.role === 'employer' && val.preferredLanguage && val.preferredLanguage !== 'en') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Employers are restricted to English language only',
        path: ['preferredLanguage'],
      });
    }

    // 2. Mobile number validation:
    // For worker: mobile number is mandatory (10 digits)
    // For employer: if mobile number is provided, it must be 10 digits
    const phoneClean = val.phone ? String(val.phone).trim() : '';
    if (val.role === 'worker') {
      if (!phoneClean || !/^[0-9]{10}$/.test(phoneClean)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Valid 10-digit mobile number is required',
          path: ['phone'],
        });
      }
    } else if (phoneClean && !/^[0-9]{10}$/.test(phoneClean)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid phone number format. Must be a 10-digit number.',
        path: ['phone'],
      });
    }

    // 3. Role-based email requirements:
    // For employer: email is MANDATORY
    // For worker: email is OPTIONAL (if provided, validate format)
    const emailClean = val.email && typeof val.email === 'string' ? val.email.trim() : '';

    if (val.role === 'employer') {
      if (!emailClean) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Email address is required for employer registration',
          path: ['email'],
        });
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailClean)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Invalid email address format',
            path: ['email'],
          });
        }
      }
    } else if (val.role === 'worker') {
      if (emailClean) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailClean)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Invalid email address format',
            path: ['email'],
          });
        }
      }
    }
  });

export const loginSchema = z
  .object({
    email: z
      .string({ required_error: 'Email or mobile number is required' })
      .trim()
      .min(1, { message: 'Email or mobile number is required' }),
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

  // Pre-normalize incoming data
  const payload = { ...data };
  if (payload.email === undefined || payload.email === null || typeof payload.email !== 'string') {
    payload.email = '';
  }
  if (payload.phone === undefined || payload.phone === null || typeof payload.phone !== 'string') {
    payload.phone = '';
  } else {
    payload.phone = payload.phone.trim();
    if (payload.phone.startsWith('+91')) {
      payload.phone = payload.phone.slice(3).trim();
    } else if (payload.phone.startsWith('91') && payload.phone.length === 12) {
      payload.phone = payload.phone.slice(2).trim();
    }
  }

  const result = registerSchema.safeParse(payload);
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
  const payload = { ...data };
  if (!payload.email && payload.phone) {
    payload.email = payload.phone;
  }
  if (payload.email && typeof payload.email === 'string') {
    let trimmed = payload.email.trim();
    if (trimmed.startsWith('+91')) {
      trimmed = trimmed.slice(3).trim();
    } else if (trimmed.startsWith('91') && trimmed.length === 12 && /^\d+$/.test(trimmed)) {
      trimmed = trimmed.slice(2).trim();
    }
    payload.email = trimmed;
  }

  const result = loginSchema.safeParse(payload);
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
