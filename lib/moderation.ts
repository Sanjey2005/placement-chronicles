import Groq from 'groq-sdk';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

interface ModerationResult {
    isSafe: boolean;
    reason: string;
    canonicalCompanyName?: string;
}

/**
 * AI Content Moderator & Normalizer powered by Groq (Llama 3).
 * Analyzes student interview experience data for spam, abuse, or fake content.
 * Also normalizes the company name to its canonical form.
 *
 * @param data - The experience data object to moderate
 * @returns { isSafe: boolean, reason: string, canonicalCompanyName: string }
 */
export async function moderateExperience(data: any): Promise<ModerationResult> {
    try {
        // Build a text summary from the experience data for moderation
        const textToModerate = JSON.stringify(data, null, 2);

        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: `You are an expert Content Moderator and Data Normalizer for a student placement platform. 
Your task is to analyze interview experience submissions.

DO TWO THINGS:
1. MODERATION: Check for:
   - Gibberish/Spam (e.g., 'asdf asdf', random characters)
   - Hate Speech/Abuse (offensive, discriminatory language)
   - Obviously fake content (impossible scenarios, trolling)

2. NORMALIZATION: Extract the company name and convert it to its official "Canonical Name".
   - "google" -> "Google"
   - "atlassian" -> "Atlassian"
   - "Jp morgan" -> "J.P. Morgan"
   - "amazon web services" -> "Amazon" (or AWS if that's the common entity, but prefer parent company if generic)
   - If the company is unknown or startup, just capitalize it properly.

Return ONLY valid JSON:
{
  "isSafe": boolean,
  "reason": "Short explanation of safety verdict",
  "canonicalCompanyName": "Official Company Name"
}

If safe: { "isSafe": true, "reason": "Content is appropriate", "canonicalCompanyName": "Google" }
If unsafe: { "isSafe": false, "reason": "Contains hate speech", "canonicalCompanyName": "Google" }`,
                },
                {
                    role: 'user',
                    content: `Analyze this submission:\n\n${textToModerate.substring(0, 6000)}`,
                },
            ],
            max_tokens: 200,
            temperature: 0.1,
            response_format: { type: 'json_object' }
        });

        const responseText = completion.choices[0]?.message?.content || '';

        // Parse the JSON response
        try {
            const parsed = JSON.parse(responseText);
            return {
                isSafe: Boolean(parsed.isSafe),
                reason: parsed.reason || 'No reason provided',
                canonicalCompanyName: parsed.canonicalCompanyName || data.company, // Fallback to user input
            };
        } catch (parseError) {
            console.error('Json parse error in moderation:', parseError);
            return {
                isSafe: false,
                reason: 'AI response malformed - Manual Review Required',
                canonicalCompanyName: data.company
            };
        }

    } catch (error: any) {
        console.error('⚠️ Moderation error:', error?.message || error);

        // Fallback: if Groq times out or fails, flag for manual review
        return {
            isSafe: false,
            reason: 'AI Service Unavailable - Manual Review Required',
            canonicalCompanyName: data.company
        };
    }
}
