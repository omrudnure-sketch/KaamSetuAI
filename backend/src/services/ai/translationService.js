import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import { Job, Message, Notification } from '../../models/index.js';
import crypto from 'crypto';

// Supported language codes strictly limited to English, Marathi, Hindi (Section 23.1)
export const SUPPORTED_LANGUAGES = ['en', 'mr', 'hi'];

export const LANGUAGE_NAMES = {
  en: 'English',
  mr: 'Marathi',
  hi: 'Hindi',
};

// Common trade phrase dictionary for reliable offline/timeout fallback
const FALLBACK_DICTIONARY = {
  mr: {
    'hello': 'नमस्कार',
    'hi': 'नमस्कार',
    'good morning': 'शुभ सकाळ',
    'can you work for two more days?': 'तुम्ही आणखी दोन दिवस काम करू शकता का?',
    'i will arrive at 8 am': 'मी सकाळी ८ वाजता पोहोचेल.',
    'i will arrive at 9 am': 'मी सकाळी ९ वाजता पोहोचेल.',
    'work is completed': 'काम पूर्ण झाले आहे.',
    'payment received': 'पैसे मिळाले आहेत.',
    'job': 'काम',
    'project': 'प्रकल्प',
    'electrician': 'इलेक्ट्रिशियन / वायरमन',
    'plumber': 'प्लंबर / नळ कारागीर',
    'carpenter': 'सुतार / कारपेंटर',
    'painter': 'रंगारी / पेंटर',
    'mason': 'गवंडी / मेसन',
    'helper': 'मदतनीस / हेल्पर',
    'thank you': 'धन्यवाद',
    'ok': 'ठीक आहे',
    'yes': 'होय',
    'no': 'नाही',
  },
  hi: {
    'hello': 'नमस्ते',
    'hi': 'नमस्ते',
    'good morning': 'शुभ प्रभात',
    'can you work for two more days?': 'क्या आप दो दिन और काम कर सकते हैं?',
    'i will arrive at 8 am': 'मैं सुबह 8 बजे आऊंगा।',
    'i will arrive at 9 am': 'मैं सुबह 9 बजे आऊंगा।',
    'work is completed': 'काम पूरा हो गया है।',
    'payment received': 'भुगतान प्राप्त हो गया है।',
    'job': 'काम',
    'project': 'परियोजना',
    'electrician': 'इलेक्ट्रीशियन / वायरमैन',
    'plumber': 'प्लंबर / नलसाज',
    'carpenter': 'बढ़ई / कारपेंटर',
    'painter': 'पेंटर / रंगसाज',
    'mason': 'राजमिस्त्री',
    'helper': 'हेल्पर / सहायक',
    'thank you': 'धन्यवाद',
    'ok': 'ठीक है',
    'yes': 'हाँ',
    'no': 'नहीं',
  },
  en: {
    'नमस्कार': 'Hello',
    'नमस्ते': 'Hello',
    'धन्यवाद': 'Thank you',
    'काम पूर्ण झाले आहे.': 'Work is completed.',
    'काम पूरा हो गया है।': 'Work is completed.',
  },
};

// In-memory LRU-style translation cache
const translationMemoryCache = new Map();
const MAX_CACHE_SIZE = 1000;

const getCacheKey = (sourceLang, targetLang, text) => {
  const hash = crypto.createHash('md5').update(text.trim()).digest('hex');
  return `${sourceLang || 'auto'}_${targetLang}_${hash}`;
};

// Zod Input Validation Schema
export const translationInputSchema = z.object({
  text: z
    .string({ required_error: 'Text to translate is required' })
    .trim()
    .min(1, 'Text cannot be empty')
    .max(3000, 'Text exceeds maximum limit of 3000 characters'),
  sourceLanguage: z
    .enum(['en', 'mr', 'hi', 'auto'])
    .optional()
    .default('auto'),
  targetLanguage: z
    .string()
    .trim()
    .refine((lang) => SUPPORTED_LANGUAGES.includes(lang.toLowerCase()), {
      message: 'Invalid target language. Supported languages are: en (English), mr (Marathi), hi (Hindi)',
    }),
  contentType: z
    .enum(['job_description', 'message', 'notification', 'general'])
    .optional()
    .default('general'),
});

/**
 * Core text translation function utilizing Gemini LLM with timeout and deterministic fallback
 */
export const translateText = async (input) => {
  const validated = translationInputSchema.parse(input);
  const { text, sourceLanguage, targetLanguage, contentType } = validated;

  const target = targetLanguage.toLowerCase();
  const source = sourceLanguage ? sourceLanguage.toLowerCase() : 'auto';

  // 1. If source and target are identical, return text immediately
  if (source !== 'auto' && source === target) {
    return {
      originalText: text,
      translatedText: text,
      sourceLanguage: source,
      targetLanguage: target,
      isCached: false,
    };
  }

  // 2. Check in-memory cache
  const cacheKey = getCacheKey(source, target, text);
  if (translationMemoryCache.has(cacheKey)) {
    return {
      originalText: text,
      translatedText: translationMemoryCache.get(cacheKey),
      sourceLanguage: source,
      targetLanguage: target,
      isCached: true,
    };
  }

  // 3. Attempt Gemini API translation if key is available
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey.trim() !== '') {
    try {
      const ai = new GoogleGenAI({ apiKey });

      const targetLanguageName = LANGUAGE_NAMES[target] || target;
      const sourceInstruction =
        source !== 'auto' ? `from ${LANGUAGE_NAMES[source] || source}` : 'detecting the input language';

      const prompt = `You are an expert multilingual translator for KaamSetu AI, an Indian platform for skilled daily-wage trades and employers.
Translate the following ${contentType.replace('_', ' ')} ${sourceInstruction} into ${targetLanguageName} (${target}).

CRITICAL TRANSLATION RULES:
1. Preserve all currency values and formats (e.g. ₹800, Rs. 1000, 500/day). Never change numbers, wage amounts, dates, or payment details.
2. Preserve all proper names, phone numbers, addresses, and trade names (e.g. Pune, Electrician).
3. Do NOT add new facts, explanations, conversational filler, or assumptions.
4. Use natural, respectful, professional Marathi or Hindi commonly understood by workers and contractors in Maharashtra/India.
5. Return ONLY the direct translated text. Do not wrap in quotes or code fences.

Text to translate:
${text}`;

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Translation service timed out')), 12000)
      );

      const response = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            temperature: 0.1, // Low temperature for high translation fidelity
          },
        }),
        timeoutPromise,
      ]);

      let translatedText = response?.text ? response.text.trim() : null;

      if (translatedText) {
        // Strip markdown backticks if any
        translatedText = translatedText.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/i, '').trim();

        // Save to in-memory cache
        if (translationMemoryCache.size >= MAX_CACHE_SIZE) {
          const firstKey = translationMemoryCache.keys().next().value;
          translationMemoryCache.delete(firstKey);
        }
        translationMemoryCache.set(cacheKey, translatedText);

        return {
          originalText: text,
          translatedText,
          sourceLanguage: source,
          targetLanguage: target,
          isCached: false,
        };
      }
    } catch (llmErr) {
      console.warn('Gemini translation failed or timed out. Falling back to deterministic translator:', llmErr.message);
    }
  }

  // 4. Deterministic fallback for common phrases or offline state
  const lowerText = text.trim().toLowerCase();
  let fallbackText = text;

  if (FALLBACK_DICTIONARY[target] && FALLBACK_DICTIONARY[target][lowerText]) {
    fallbackText = FALLBACK_DICTIONARY[target][lowerText];
  } else if (target === 'mr') {
    fallbackText = `[मराठी अनुवाद] ${text}`;
  } else if (target === 'hi') {
    fallbackText = `[हिंदी अनुवाद] ${text}`;
  } else {
    fallbackText = `[English Translation] ${text}`;
  }

  // Cache fallback result
  translationMemoryCache.set(cacheKey, fallbackText);

  return {
    originalText: text,
    translatedText: fallbackText,
    sourceLanguage: source,
    targetLanguage: target,
    isCached: false,
  };
};

/**
 * Translate a job description for a worker in their preferred language (Section 23.4)
 */
export const translateJobDescription = async (jobId, targetLanguage) => {
  if (!SUPPORTED_LANGUAGES.includes(targetLanguage)) {
    const error = new Error(`Unsupported target language: ${targetLanguage}`);
    error.status = 400;
    throw error;
  }

  const job = await Job.findById(jobId);
  if (!job) {
    const error = new Error('Job not found');
    error.status = 404;
    throw error;
  }

  // Check if job already has this language cached in document
  if (job.translations && job.translations.get(targetLanguage)) {
    return {
      jobId: job._id,
      originalDescription: job.description,
      translatedDescription: job.translations.get(targetLanguage),
      targetLanguage,
      isCached: true,
      isTranslated: true,
    };
  }

  // Translate original canonical description
  const result = await translateText({
    text: job.description,
    sourceLanguage: 'en',
    targetLanguage,
    contentType: 'job_description',
  });

  // Cache in job document for future worker requests
  if (!job.translations) {
    job.translations = new Map();
  }
  job.translations.set(targetLanguage, result.translatedText);
  await job.save();

  return {
    jobId: job._id,
    originalDescription: job.description,
    translatedDescription: result.translatedText,
    targetLanguage,
    isCached: false,
    isTranslated: true,
  };
};

/**
 * Translate a chat message between conversation participants (Section 23.5)
 */
export const translateChatMessage = async (messageId, targetLanguage, requestingUserId) => {
  if (!SUPPORTED_LANGUAGES.includes(targetLanguage)) {
    const error = new Error(`Unsupported target language: ${targetLanguage}`);
    error.status = 400;
    throw error;
  }

  const message = await Message.findById(messageId);
  if (!message) {
    const error = new Error('Message not found');
    error.status = 404;
    throw error;
  }

  // Security check: Only sender or receiver of the conversation may translate the message
  const isSender = message.senderId.toString() === requestingUserId.toString();
  const isReceiver = message.receiverId.toString() === requestingUserId.toString();

  if (!isSender && !isReceiver) {
    const error = new Error('Unauthorized: You can only translate messages within your own conversations');
    error.status = 403;
    throw error;
  }

  // Check if translation is already cached on message document
  if (message.translations && message.translations.get(targetLanguage)) {
    return {
      messageId: message._id,
      conversationId: message.conversationId,
      originalContent: message.content,
      translatedContent: message.translations.get(targetLanguage),
      targetLanguage,
      isCached: true,
      isTranslated: true,
    };
  }

  // Translate message content
  const result = await translateText({
    text: message.content,
    sourceLanguage: 'auto',
    targetLanguage,
    contentType: 'message',
  });

  // Cache translation on message document without overwriting original content
  if (!message.translations) {
    message.translations = new Map();
  }
  message.translations.set(targetLanguage, result.translatedText);
  message.translatedContent = result.translatedText;
  message.translationLanguage = targetLanguage;
  message.isTranslated = true;
  await message.save();

  return {
    messageId: message._id,
    conversationId: message.conversationId,
    originalContent: message.content,
    translatedContent: result.translatedText,
    targetLanguage,
    isCached: false,
    isTranslated: true,
  };
};

/**
 * Translate a notification message for recipient (Section 23.6)
 */
export const translateNotificationText = async (notificationId, targetLanguage, requestingUserId) => {
  if (!SUPPORTED_LANGUAGES.includes(targetLanguage)) {
    const error = new Error(`Unsupported target language: ${targetLanguage}`);
    error.status = 400;
    throw error;
  }

  const notification = await Notification.findById(notificationId);
  if (!notification) {
    const error = new Error('Notification not found');
    error.status = 404;
    throw error;
  }

  if (notification.userId.toString() !== requestingUserId.toString()) {
    const error = new Error('Unauthorized: You can only view and translate your own notifications');
    error.status = 403;
    throw error;
  }

  if (notification.translations && notification.translations.get(targetLanguage)) {
    return {
      notificationId: notification._id,
      originalMessage: notification.message,
      translatedMessage: notification.translations.get(targetLanguage),
      targetLanguage,
      isCached: true,
      isTranslated: true,
    };
  }

  const result = await translateText({
    text: notification.message,
    sourceLanguage: 'auto',
    targetLanguage,
    contentType: 'notification',
  });

  if (!notification.translations) {
    notification.translations = new Map();
  }
  notification.translations.set(targetLanguage, result.translatedText);
  await notification.save();

  return {
    notificationId: notification._id,
    originalMessage: notification.message,
    translatedMessage: result.translatedText,
    targetLanguage,
    isCached: false,
    isTranslated: true,
  };
};

export default {
  SUPPORTED_LANGUAGES,
  LANGUAGE_NAMES,
  translationInputSchema,
  translateText,
  translateJobDescription,
  translateChatMessage,
  translateNotificationText,
};
