import { z } from 'zod';

const isValidId = (val) => {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) ||
         /^[0-9a-fA-F]{24}$/.test(val) ||
         /^\d+$/.test(val);
};

const createConversationSchema = z
  .object({
    recipientId: z
      .string({ required_error: 'Recipient ID is required' })
      .refine(isValidId, { message: 'Invalid Recipient ID format' }),
    projectId: z
      .string()
      .nullable()
      .optional()
      .refine((val) => !val || isValidId(val), { message: 'Invalid Project ID format' }),
    jobId: z
      .string()
      .nullable()
      .optional()
      .refine((val) => !val || isValidId(val), { message: 'Invalid Job ID format' }),
    conversationType: z.enum(['job', 'project', 'support']).optional().default('project'),
  })
  .strict();

const sendMessageSchema = z
  .object({
    content: z
      .string({ required_error: 'Message content is required' })
      .trim()
      .min(1, 'Message cannot be empty')
      .max(2000, 'Message cannot exceed 2000 characters'),
    messageType: z.enum(['text', 'image', 'system']).optional().default('text'),
    attachments: z.array(z.string()).optional().default([]),
  })
  .strict();

export const validateConversationInput = (data) => {
  const result = createConversationSchema.safeParse(data);
  if (!result.success) {
    const errorMessages = result.error.errors.map((e) => e.message).join(', ');
    return { isValid: false, error: errorMessages };
  }
  return { isValid: true, data: result.data };
};

export const validateSendMessageInput = (data) => {
  const result = sendMessageSchema.safeParse(data);
  if (!result.success) {
    const errorMessages = result.error.errors.map((e) => e.message).join(', ');
    return { isValid: false, error: errorMessages };
  }
  return { isValid: true, data: result.data };
};
