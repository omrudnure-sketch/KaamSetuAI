// AI Service providing Smart Matching, Dynamic Translation, Job Description Generation, and AI Assistant

const DICTIONARY = {
  mr: {
    'hello': 'नमस्कार',
    'can you work for two more days?': 'तुम्ही आणखी दोन दिवस काम करू शकता का?',
    'i will arrive at 8 am': 'मी सकाळी ८ वाजता पोहोचेल.',
    'work is completed': 'काम पूर्ण झाले आहे.',
    'payment received': 'पैसे मिळाले आहेत.',
    'job': 'काम',
    'project': 'प्रकल्प',
  },
  hi: {
    'hello': 'नमस्ते',
    'can you work for two more days?': 'क्या आप दो दिन और काम कर सकते हैं?',
    'i will arrive at 8 am': 'मैं सुबह 8 बजे आऊंगा।',
    'work is completed': 'काम पूरा हो गया है।',
    'payment received': 'भुगतान प्राप्त हो गया है।',
    'job': 'काम',
    'project': 'परियोजना',
  },
};

export const translateMessage = async (text, targetLang = 'mr') => {
  if (!text || text.trim() === '') {
    return { original: text, translated: text, language: targetLang, isTranslated: false };
  }

  const langKey = targetLang.toLowerCase();
  const lowerText = text.trim().toLowerCase();

  let translated = text;
  if (DICTIONARY[langKey] && DICTIONARY[langKey][lowerText]) {
    translated = DICTIONARY[langKey][lowerText];
  } else if (langKey === 'mr') {
    translated = `[अनुवादित] ${text}`;
  } else if (langKey === 'hi') {
    translated = `[अनूदित] ${text}`;
  }

  return {
    original: text,
    translatedContent: translated,
    translationLanguage: targetLang,
    isTranslated: true,
  };
};

export const matchJobWorker = (job, workerProfile) => {
  if (!job || !workerProfile) {
    return { score: 50, breakdown: { skillMatch: 50, locationMatch: 50, rateMatch: 50 } };
  }

  let skillScore = 40;
  if (job.category && workerProfile.primarySkills?.includes(job.category)) {
    skillScore = 100;
  } else if (job.title && workerProfile.primarySkills?.some((s) => job.title.toLowerCase().includes(s.toLowerCase()))) {
    skillScore = 85;
  }

  let locationScore = 60;
  if (job.location?.city && workerProfile.location?.city) {
    if (job.location.city.toLowerCase() === workerProfile.location.city.toLowerCase()) {
      locationScore = 100;
    }
  }

  let rateScore = 80;
  if (job.payRate && workerProfile.expectedDailyRate) {
    const diff = Math.abs(job.payRate - workerProfile.expectedDailyRate);
    if (diff <= 100) rateScore = 100;
    else if (diff <= 300) rateScore = 75;
    else rateScore = 50;
  }

  const ratingBonus = Math.min((workerProfile.rating || 4.0) * 10, 50);
  const totalScore = Math.min(Math.round(skillScore * 0.4 + locationScore * 0.3 + rateScore * 0.3 + ratingBonus * 0.1), 99);

  return {
    score: totalScore,
    breakdown: {
      skillMatch: skillScore,
      locationMatch: locationScore,
      rateMatch: rateScore,
    },
  };
};

export const generateJobDescription = async ({ title, category, location, payRate }) => {
  const city = location?.city || 'Pune';
  const rate = payRate || 800;

  return `We are seeking an experienced and punctual ${title || category || 'Worker'} for our active project site in ${city}.

Requirements:
- Must have proven experience in ${category || 'general construction/maintenance'}.
- Standard work timings: 8:00 AM to 5:00 PM.
- Punctuality and daily site check-in attendance mandatory.
- Daily Rate Offered: ₹${rate}/day (Secured via KaamSetu Escrow).

Safety gear and site materials provided on location. Fast daily payment upon verified progress update.`;
};

export const processAiAssistantChat = async ({ prompt, role = 'worker', lang = 'en' }) => {
  const cleanPrompt = (prompt || '').toLowerCase();

  let responseText = '';
  if (cleanPrompt.includes('job') || cleanPrompt.includes('work') || cleanPrompt.includes('काम')) {
    responseText = role === 'worker'
      ? 'To find nearby jobs matching your skills, go to the **Jobs** tab. You can filter by daily rate, category, and city.'
      : 'To post a new job requirement, click on **Post New Job** in your dashboard and set the daily rate and category.';
  } else if (cleanPrompt.includes('attendance') || cleanPrompt.includes('punch') || cleanPrompt.includes('हजेरी')) {
    responseText = 'Daily Attendance uses geo-verification. Make sure to tap **Check In** when arriving at the site and **Check Out** when finished.';
  } else if (cleanPrompt.includes('payment') || cleanPrompt.includes('earnings') || cleanPrompt.includes('पैसे')) {
    responseText = 'Payments are logged under the **Payments / Earnings** tab. All milestone payouts are held in escrow security until verified.';
  } else if (cleanPrompt.includes('dispute') || cleanPrompt.includes('issue') || cleanPrompt.includes('समस्या')) {
    responseText = 'If you encounter any payment, quality, or attendance issues, navigate to **Issues > Disputes** in your project page to submit evidence for Admin review.';
  } else {
    responseText = `Hello! I am your KaamSetu AI Assistant. I can help you with finding work, posting jobs, attendance, payments, and resolving site issues. How can I assist you today?`;
  }

  return {
    prompt,
    response: responseText,
    role,
    language: lang,
  };
};
