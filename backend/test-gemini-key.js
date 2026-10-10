import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenAI } from '@google/genai';

async function testKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('Testing GEMINI_API_KEY...');
  const ai = new GoogleGenAI({ apiKey });

  const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash', 'gemini-3.8-flash'];

  for (const model of models) {
    try {
      console.log(`Trying model: ${model}...`);
      const response = await ai.models.generateContent({
        model,
        contents: 'Respond with the single word: ACTIVE',
      });
      console.log(`>>> SUCCESS with model: ${model}!`);
      console.log('Model Response:', response.text?.trim());
      return;
    } catch (err) {
      console.log(`Failed on ${model}:`, err.message?.substring(0, 120));
    }
  }
}

testKey();
