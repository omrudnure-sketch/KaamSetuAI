import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';

// Input validation schema with Zod
export const jobDescriptionInputSchema = z.object({
  title: z.string().trim().min(2, 'Job title must be at least 2 characters').max(150),
  skillRequired: z.string().trim().min(2, 'Skill required must be specified').max(100),
  additionalSkills: z.array(z.string().trim()).optional().default([]),
  location: z
    .object({
      city: z.string().trim().default('Pune'),
      area: z.string().trim().optional().default(''),
    })
    .optional()
    .default({ city: 'Pune', area: '' }),
  workersRequired: z.number().int().min(1).optional().default(1),
  wageType: z.enum(['daily', 'weekly', 'fixed']).optional().default('daily'),
  wageAmount: z.number().min(1).optional().default(800),
  durationType: z.enum(['single_day', 'fixed_duration', 'until_completion']).optional().default('single_day'),
  startDate: z.string().optional().default(''),
  estimatedEndDate: z.string().optional().default(''),
  workingHours: z
    .object({
      start: z.string().optional().default('09:00'),
      end: z.string().optional().default('18:00'),
      description: z.string().optional().default(''),
    })
    .optional()
    .default({ start: '09:00', end: '18:00', description: '' }),
  tasks: z.array(z.string().trim()).optional().default([]),
  experienceRequirements: z.string().trim().optional().default(''),
  safetyRequirements: z.string().trim().optional().default(''),
  additionalInstructions: z.string().trim().optional().default(''),
});

// Output validation schema with Zod (Section 21.4)
export const jobDescriptionOutputSchema = z.object({
  suggestedTitle: z.string().trim().min(3),
  description: z.string().trim().min(20),
  responsibilities: z.array(z.string().trim()).min(1),
  requiredSkills: z.array(z.string().trim()).min(1),
  experienceRequirements: z.string().trim(),
  safetyReminders: z.array(z.string().trim()),
});

/**
 * Deterministic structured fallback generator when LLM provider is unavailable or without API key
 */
export const generateDeterministicFallback = (validatedInput) => {
  const {
    title,
    skillRequired,
    additionalSkills,
    location,
    workersRequired,
    wageType,
    wageAmount,
    durationType,
    startDate,
    workingHours,
    tasks,
    experienceRequirements,
    safetyRequirements,
  } = validatedInput;

  const city = location?.city || 'Pune';
  const area = location?.area ? ` (${location.area})` : '';

  const suggestedTitle = title.toLowerCase().includes(skillRequired.toLowerCase())
    ? title
    : `${skillRequired.charAt(0).toUpperCase() + skillRequired.slice(1)} Required - ${title}`;

  const defaultTasks = tasks.length > 0
    ? tasks
    : [
        `Execute standard ${skillRequired} duties according to site supervisor instructions`,
        `Inspect work area, tools, and materials before beginning daily tasks`,
        `Maintain cleanliness and safe organization of the work station`,
      ];

  const allSkills = Array.from(new Set([skillRequired, ...(additionalSkills || [])]));

  const safetyList = safetyRequirements
    ? [safetyRequirements, 'Wear required safety gear (helmet, safety footwear) on active job site']
    : [
        'Wear appropriate personal protective equipment (PPE) including closed footwear',
        'Follow standard site safety guidelines and report hazards immediately',
      ];

  const experienceText = experienceRequirements
    ? experienceRequirements
    : `Prior practical experience in ${skillRequired} work preferred. Punctuality and reliable craftsmanship required.`;

  const description = `We are hiring ${workersRequired} skilled ${skillRequired}(s) for an immediate engagement located in ${city}${area}.
Work Schedule: ${workingHours?.start || '09:00'} to ${workingHours?.end || '18:00'} (${durationType.replace(/_/g, ' ')}).
Rate of Pay: ₹${wageAmount} (${wageType} wage schedule secured through KaamSetu platform).
Candidates must be dependable, safety-conscious, and ready to start on ${startDate || 'scheduled date'}.`;

  return {
    suggestedTitle,
    description,
    responsibilities: defaultTasks,
    requiredSkills: allSkills,
    experienceRequirements: experienceText,
    safetyReminders: safetyList,
  };
};

/**
 * Main AI Job Description Generation Service
 */
export const generateJobDescriptionDraft = async (rawInput) => {
  // 1. Validate Input with Zod
  const validatedInput = jobDescriptionInputSchema.parse(rawInput);

  const apiKey = process.env.GEMINI_API_KEY;

  // 2. If Gemini API key is available, attempt official LLM generation with 8s timeout
  if (apiKey && apiKey.trim() !== '') {
    try {
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `You are an expert recruitment assistant for KaamSetu AI, a platform connecting employers with daily wage workers and skilled trades in India.
Generate a clear, professional, practical job description based STRICTLY on the employer's provided facts.

Rules:
1. Use ONLY the facts supplied below. Do NOT invent fake wages, benefits, certifications, or promises.
2. Use clear, simple, practical English language understandable by workers and site contractors.
3. Keep the content strictly relevant to the required skill: "${validatedInput.skillRequired}".
4. Avoid any discriminatory or exclusionary language.
5. Return ONLY a valid JSON object matching this schema:
{
  "suggestedTitle": "Short, clear job title",
  "description": "Comprehensive 3-4 sentence job summary mentioning city, hours, and pay",
  "responsibilities": ["Specific duty 1", "Specific duty 2", "Specific duty 3"],
  "requiredSkills": ["Primary skill", "Secondary skill"],
  "experienceRequirements": "Clear experience summary",
  "safetyReminders": ["Relevant site safety precaution"]
}

Employer Input Data:
- Job Title: ${validatedInput.title}
- Required Skill: ${validatedInput.skillRequired}
- Additional Skills: ${validatedInput.additionalSkills.join(', ') || 'None'}
- Location: ${validatedInput.location.city} ${validatedInput.location.area || ''}
- Workers Needed: ${validatedInput.workersRequired}
- Wage: ₹${validatedInput.wageAmount} per ${validatedInput.wageType}
- Duration Type: ${validatedInput.durationType}
- Start Date: ${validatedInput.startDate || 'Immediate'}
- Hours: ${validatedInput.workingHours.start} to ${validatedInput.workingHours.end}
- Main Tasks: ${validatedInput.tasks.join('; ') || 'Standard trade tasks'}
- Experience Requirements: ${validatedInput.experienceRequirements || 'Practical trade experience'}
- Safety Requirements: ${validatedInput.safetyRequirements || 'Standard trade safety'}
- Additional Instructions: ${validatedInput.additionalInstructions || 'None'}
`;

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI generation timeout')), 8000)
      );

      const response = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2, // Low temperature for high factual adherence
          },
        }),
        timeoutPromise,
      ]);

      const responseText = response?.text;
      if (responseText) {
        // Strip markdown code fences if any
        const cleanedJson = responseText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
        const parsedJson = JSON.parse(cleanedJson);

        // Validate LLM output with Zod
        const validatedOutput = jobDescriptionOutputSchema.parse(parsedJson);
        return validatedOutput;
      }
    } catch (llmError) {
      console.warn('Gemini LLM generation failed or timed out. Falling back to deterministic generator:', llmError.message);
      // Fallback safely to deterministic generator
    }
  }

  // 3. Fallback to deterministic structured output conforming to Zod schema
  const fallbackOutput = generateDeterministicFallback(validatedInput);
  return jobDescriptionOutputSchema.parse(fallbackOutput);
};

export default {
  jobDescriptionInputSchema,
  jobDescriptionOutputSchema,
  generateJobDescriptionDraft,
};
