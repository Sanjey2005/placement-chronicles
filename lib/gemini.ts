import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

if (!GEMINI_API_KEY) {
    throw new Error(
        'Please define the GEMINI_API_KEY environment variable inside .env.local'
    );
}

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * Get Gemini 1.5 Flash model instance
 * This is the recommended model for fast, efficient text generation
 */
export function getGeminiModel() {
    return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
}

/**
 * Extract structured data from text using Gemini
 * @param text - The text to extract data from
 * @param prompt - The extraction prompt
 * @returns Parsed JSON response
 */
export async function extractWithGemini(text: string, prompt: string) {
    const model = getGeminiModel();

    const fullPrompt = `${prompt}\n\nText to analyze:\n${text}\n\nRespond ONLY with valid JSON, no additional text.`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const responseText = response.text();

    // Parse and return JSON
    try {
        return JSON.parse(responseText);
    } catch (error) {
        console.error('Failed to parse Gemini response as JSON:', responseText);
        throw new Error('Invalid JSON response from Gemini');
    }
}

export default genAI;
