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
    try {
        const model = getGeminiModel();

        const fullPrompt = `${prompt}\n\nText to analyze:\n${text}\n\nRespond ONLY with valid JSON, no additional text.`;

        console.log('🔄 Calling Gemini API...');
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        let responseText = response.text();
        console.log('📥 Gemini raw response:', responseText.substring(0, 200));

        // Clean up response - remove markdown code blocks if present
        responseText = responseText.trim();
        if (responseText.startsWith('```json')) {
            responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
        } else if (responseText.startsWith('```')) {
            responseText = responseText.replace(/```\n?/g, '');
        }

        // Parse and return JSON
        try {
            const parsed = JSON.parse(responseText.trim());
            console.log('✅ Successfully parsed JSON');
            return parsed;
        } catch (parseError) {
            console.error('❌ Failed to parse Gemini response as JSON');
            console.error('Response text:', responseText);
            console.error('Parse error:', parseError);
            throw new Error(`Invalid JSON response from Gemini: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
        }
    } catch (error) {
        console.error('❌ Gemini API error:', error);
        throw error;
    }
}

export default genAI;
