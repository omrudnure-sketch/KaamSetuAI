import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import { WorkerProfile, User, Job } from '../../models/index.js';

// Allowlist of recognized trades for validation & deterministic fallback extraction
const RECOGNIZED_TRADES = [
  'electrician',
  'plumber',
  'carpenter',
  'painter',
  'mason',
  'welder',
  'helper',
  'cleaner',
  'mechanic',
  'driver',
  'tailor',
  'cook',
];

const KNOWN_CITIES = [
  'pune',
  'mumbai',
  'kolhapur',
  'nagpur',
  'nashik',
  'thane',
  'solapur',
  'aurangabad',
  'satara',
  'sangli',
  'navi mumbai',
  'delhi',
  'bengaluru',
  'hyderabad',
];

/**
 * Strict allowlist schema for natural-language search filters (Section 24.3)
 * Rejects any arbitrary field names, MongoDB operators, or executable code.
 */
export const workerSearchFiltersSchema = z
  .object({
    skill: z.string().trim().toLowerCase().max(50).optional(),
    city: z.string().trim().max(60).optional(),
    area: z.string().trim().max(60).optional(),
    minExperienceYears: z.number().min(0).max(50).optional(),
    maxDailyWage: z.number().positive().max(100000).optional(),
    minRating: z.number().min(1).max(5).optional(),
    availability: z.enum(['available', 'busy', 'any']).optional().default('available'),
    verificationStatus: z.enum(['verified', 'pending', 'any']).optional(),
    durationDays: z.number().int().positive().max(365).optional(),
  })
  .strict(); // Rejects extra unknown keys!

export const naturalLanguageQueryInputSchema = z.object({
  query: z
    .string({ required_error: 'Search query is required' })
    .trim()
    .min(2, 'Query must be at least 2 characters')
    .max(500, 'Query cannot exceed 500 characters'),
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(50).optional().default(10),
  sort: z.enum(['rating', 'experience', 'wage_asc', 'wage_desc', 'newest']).optional().default('rating'),
});

/**
 * Deterministic lexical parser for search queries (Used as reliable fallback or validation)
 */
export const parseQueryDeterministically = (rawQuery) => {
  const text = (rawQuery || '').toLowerCase();
  const filters = {};

  // 1. Extract Trade / Skill
  for (const trade of RECOGNIZED_TRADES) {
    if (text.includes(trade)) {
      filters.skill = trade;
      break;
    }
  }

  // 2. Extract City
  for (const city of KNOWN_CITIES) {
    if (text.includes(city)) {
      filters.city = city.charAt(0).toUpperCase() + city.slice(1);
      break;
    }
  }

  // 3. Extract Wage Limit (e.g. "under 1000", "below ₹900", "max 800", "< 1200")
  const wageMatch =
    text.match(/(?:under|below|max|less than|within|up to|₹|rs\.?)\s*(\d{3,5})/i) ||
    text.match(/(\d{3,5})\s*(?:rs|rupees|per day|\/day)/i);
  if (wageMatch && wageMatch[1]) {
    const val = parseInt(wageMatch[1], 10);
    if (!isNaN(val) && val >= 100 && val <= 50000) {
      filters.maxDailyWage = val;
    }
  }

  // 4. Extract Experience (e.g. "3 years", "5 yrs", "at least 2 years experience")
  const expMatch = text.match(/(\d+)\s*(?:years?|yrs?)(?:\s*(?:of\s*)?experience)?/i);
  if (expMatch && expMatch[1]) {
    const val = parseInt(expMatch[1], 10);
    if (!isNaN(val) && val >= 0 && val <= 50) {
      filters.minExperienceYears = val;
    }
  }

  // 5. Extract Duration in Days (e.g. "for 8 days", "5 days")
  const durMatch = text.match(/(\d+)\s*(?:days?|day)/i);
  if (durMatch && durMatch[1]) {
    const val = parseInt(durMatch[1], 10);
    if (!isNaN(val) && val > 0 && val <= 365) {
      filters.durationDays = val;
    }
  }

  // 6. Rating (e.g. "4 star", "4.5 rating")
  const ratingMatch = text.match(/(\d(?:\.\d)?)\s*(?:star|rating)/i);
  if (ratingMatch && ratingMatch[1]) {
    const val = parseFloat(ratingMatch[1]);
    if (!isNaN(val) && val >= 1 && val <= 5) {
      filters.minRating = val;
    }
  }

  // Availability default
  filters.availability = 'available';

  return filters;
};

/**
 * Parse an unstructured English query into structured search filters using Gemini LLM
 */
export const parseWorkerSearchQuery = async (queryText) => {
  const query = (queryText || '').trim();
  if (!query) {
    return { filters: {}, interpretedQuery: query };
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey.trim() !== '') {
    try {
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `You are a query parser for KaamSetu AI, an Indian platform for hiring daily wage workers and skilled construction trades.
Convert the employer's search request into a structured JSON filter object conforming to the allowlist schema.

ALLOWED FIELDS:
- "skill": (string) One normalized skill name (e.g., "electrician", "plumber", "carpenter", "painter", "mason", "helper", "cleaner", "welder"). If no specific skill is mentioned, OMIT this field.
- "city": (string) City name (e.g. "Pune", "Mumbai", "Kolhapur"). If no city is specified, OMIT this field.
- "area": (string) Specific neighborhood or locality if mentioned (e.g. "Kothrud", "Dadar").
- "minExperienceYears": (number) Minimum experience in years.
- "maxDailyWage": (number) Maximum daily wage in Indian Rupees (INR).
- "minRating": (number) Minimum rating (1.0 to 5.0).
- "availability": ("available" | "busy" | "any") Default is "available".
- "durationDays": (number) Number of work days if mentioned (e.g. 5, 8).

STRICT RULES:
1. Do NOT invent, assume, or hallucinate values not implied by the query. If a skill, wage, or location is not mentioned, omit it.
2. Return ONLY a valid JSON object matching the allowlist.
3. NEVER return MongoDB operators, code, or arbitrary property names.

User Search Query:
"${query}"`;

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('NL search parser timed out')), 8000)
      );

      const response = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        }),
        timeoutPromise,
      ]);

      const responseText = response?.text;
      if (responseText) {
        const cleaned = responseText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
        const parsed = JSON.parse(cleaned);
        const validated = workerSearchFiltersSchema.parse(parsed);

        return {
          interpretedQuery: query,
          filters: validated,
        };
      }
    } catch (llmError) {
      console.warn('Gemini NL query parsing failed or timed out. Falling back to deterministic parser:', llmError.message);
    }
  }

  // Fallback to deterministic lexical extraction
  const fallbackFilters = parseQueryDeterministically(query);
  const validatedFallback = workerSearchFiltersSchema.parse(fallbackFilters);

  return {
    interpretedQuery: query,
    filters: validatedFallback,
  };
};

/**
 * Validate manual or AI-generated search filters with Zod (Section 24.3)
 */
export const validateSearchFilters = (filters) => {
  return workerSearchFiltersSchema.parse(filters);
};

/**
 * Build safe, parameterized MongoDB criteria from validated filters (Section 24.3)
 * Guarantees zero raw query execution or arbitrary operators from user or AI.
 */
export const buildWorkerSearchCriteria = (validatedFilters) => {
  const criteria = {};

  // Exclude unavailable workers by default unless specified 'any'
  if (validatedFilters.availability && validatedFilters.availability !== 'any') {
    criteria.availability = validatedFilters.availability;
  } else {
    criteria.availability = { $ne: 'unavailable' };
  }

  // Skill filter (matches primarySkill or additional skills array)
  if (validatedFilters.skill && validatedFilters.skill.trim()) {
    const skillRegex = new RegExp(`^${validatedFilters.skill.trim()}$`, 'i');
    criteria.$or = [
      { primarySkill: skillRegex },
      { skills: skillRegex },
    ];
  }

  // Location filters
  if (validatedFilters.city && validatedFilters.city.trim()) {
    criteria['location.city'] = new RegExp(`^${validatedFilters.city.trim()}$`, 'i');
  }

  if (validatedFilters.area && validatedFilters.area.trim()) {
    criteria['location.area'] = new RegExp(`^${validatedFilters.area.trim()}$`, 'i');
  }

  // Experience filter
  if (typeof validatedFilters.minExperienceYears === 'number') {
    criteria.experienceYears = { $gte: validatedFilters.minExperienceYears };
  }

  // Wage filter (Worker expected daily rate is within employer budget)
  if (typeof validatedFilters.maxDailyWage === 'number') {
    criteria.dailyWage = { $lte: validatedFilters.maxDailyWage };
  }

  // Rating filter
  if (typeof validatedFilters.minRating === 'number') {
    criteria.rating = { $gte: validatedFilters.minRating };
  }

  // Verification filter
  if (validatedFilters.verificationStatus && validatedFilters.verificationStatus !== 'any') {
    criteria.verificationStatus = validatedFilters.verificationStatus;
  }

  return criteria;
};

/**
 * Execute worker search with natural-language query and pagination (Section 24.4)
 */
export const searchWorkersWithNaturalLanguage = async (input) => {
  const validatedInput = naturalLanguageQueryInputSchema.parse(input);
  const { query, page, limit, sort } = validatedInput;

  // 1. Parse natural-language text into structured allowlisted filters
  const parsedResult = await parseWorkerSearchQuery(query);
  const filters = parsedResult.filters;

  // 2. Build MongoDB query
  const dbCriteria = buildWorkerSearchCriteria(filters);

  // 3. Exclude suspended or non-active accounts via User join
  const activeWorkers = await User.find({ role: 'worker', status: 'active' }).select('_id').lean();
  const activeUserIds = activeWorkers.map((u) => u._id);
  dbCriteria.userId = { $in: activeUserIds };

  // 4. Determine sort options
  const sortOptions = {};
  if (sort === 'rating') sortOptions.rating = -1;
  else if (sort === 'experience') sortOptions.experienceYears = -1;
  else if (sort === 'wage_asc') sortOptions.dailyWage = 1;
  else if (sort === 'wage_desc') sortOptions.dailyWage = -1;
  else sortOptions.createdAt = -1;

  // 5. Execute paginated database query
  const total = await WorkerProfile.countDocuments(dbCriteria);
  const totalPages = Math.ceil(total / limit) || 1;
  const skip = (page - 1) * limit;

  const rawWorkers = await WorkerProfile.find(dbCriteria)
    .populate('userId', 'name phone email status isVerified')
    .sort(sortOptions)
    .skip(skip)
    .limit(limit)
    .lean();

  // Format safe worker result list
  const results = rawWorkers.map((p) => ({
    workerId: p.userId?._id || p.userId,
    workerProfileId: p._id,
    workerName: p.fullName || p.userId?.name || 'Worker',
    primarySkill: p.primarySkill,
    skills: p.skills || [],
    experienceYears: p.experienceYears || 0,
    dailyWage: p.dailyWage,
    location: {
      city: p.location?.city || '',
      area: p.location?.area || '',
    },
    availability: p.availability || 'available',
    rating: p.rating || 0,
    totalReviews: p.totalReviews || 0,
    completedProjects: p.completedProjects || 0,
    isVerified: p.verificationStatus === 'verified' || !!p.userId?.isVerified,
  }));

  return {
    interpretedQuery: query,
    filters,
    results,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
};

/**
 * Worker-side job discovery query parser (Section 24.7)
 */
export const parseJobSearchQuery = async (queryText) => {
  const query = (queryText || '').trim();
  if (!query) return { filters: {}, interpretedQuery: query };

  const parsed = parseQueryDeterministically(query);
  return {
    interpretedQuery: query,
    filters: {
      skill: parsed.skill,
      city: parsed.city,
      minWage: parsed.maxDailyWage, // for jobs, worker seeks min wage
      durationType: parsed.durationDays && parsed.durationDays === 1 ? 'single_day' : undefined,
    },
  };
};

export default {
  workerSearchFiltersSchema,
  naturalLanguageQueryInputSchema,
  parseQueryDeterministically,
  parseWorkerSearchQuery,
  validateSearchFilters,
  buildWorkerSearchCriteria,
  searchWorkersWithNaturalLanguage,
  parseJobSearchQuery,
};
