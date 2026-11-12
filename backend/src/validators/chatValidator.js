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
    conversationType: z.enum(['direct', 'job', 'project', 'support']).optional().default('direct'),
    initialMessage: z.string().max(1000).optional().default(''),
  })
  .strict();

const sendChatRequestSchema = z
  .object({
    recipientId: z
      .string({ required_error: 'Recipient ID is required' })
      .refine(isValidId, { message: 'Invalid Recipient ID format' }),
    initialMessage: z.string().max(1000).optional().default('Hello, I would like to connect with you on KaamSetu AI.'),
    jobId: z
      .string()
      .nullable()
      .optional()
      .refine((val) => !val || isValidId(val), { message: 'Invalid Job ID format' }),
    projectId: z
      .string()
      .nullable()
      .optional()
      .refine((val) => !val || isValidId(val), { message: 'Invalid Project ID format' }),
  })
  .strict();

const respondChatRequestSchema = z
  .object({
    action: z.enum(['accept', 'reject'], { required_error: 'Action must be either accept or reject' }),
  })
  .strict();

const sendMessageSchema = z
  .object({
    content: z
      .string()
      .trim()
      .max(2000, 'Message cannot exceed 2000 characters')
      .optional()
      .default(''),
    messageType: z.enum(['text', 'image', 'audio', 'system']).optional().default('text'),
    attachmentUrl: z.string().nullable().optional(),
    attachmentName: z.string().nullable().optional(),
    attachmentSize: z.number().nullable().optional(),
    duration: z.number().nullable().optional().default(0),
    attachments: z.array(z.string()).optional().default([]),
  })
  .refine(
    (data) => {
      if (data.messageType === 'text') {
        return !!data.content && data.content.trim().length > 0;
      }
      return !!data.attachmentUrl || (!!data.content && data.content.trim().length > 0);
    },
    { message: 'Message content or attachment is required' }
  );

export const validateConversationInput = (data) => {
  const result = createConversationSchema.safeParse(data);
  if (!result.success) {
    const errorMessages = result.error.errors.map((e) => e.message).join(', ');
    return { isValid: false, error: errorMessages };
  }
  return { isValid: true, data: result.data };
};

export const validateSendChatRequestInput = (data) => {
  const result = sendChatRequestSchema.safeParse(data);
  if (!result.success) {
    const errorMessages = result.error.errors.map((e) => e.message).join(', ');
    return { isValid: false, error: errorMessages };
  }
  return { isValid: true, data: result.data };
};

export const validateRespondChatRequestInput = (data) => {
  const result = respondChatRequestSchema.safeParse(data);
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
