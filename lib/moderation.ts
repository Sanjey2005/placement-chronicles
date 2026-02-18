import Groq from 'groq-sdk';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

interface ModerationResult {
    isSafe: boolean;
    reason: string;
}

/**
 * AI Content Moderator powered by Groq (Llama 3).
 * Analyzes student interview experience data for spam, abuse, or fake content.
 *
 * @param data - The experience data object to moderate
 * @returns { isSafe: boolean, reason: string }
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
                    content: `You are a Content Moderator. Analyze this student interview experience submission. Check for:
1. Gibberish/Spam (e.g., 'asdf asdf', random characters, meaningless text)
2. Hate Speech/Abuse (offensive, discriminatory, or threatening language)
3. Obviously fake content (impossible scenarios, troll submissions)

Return ONLY valid JSON with no markdown or explanation:
{ "isSafe": boolean, "reason": "Short explanation" }

If the content is legitimate and appropriate, return: { "isSafe": true, "reason": "Content is appropriate" }
If the content violates any rule, return: { "isSafe": false, "reason": "Brief explanation of the violation" }`,
                },
                {
                    role: 'user',
                    content: `Moderate this interview experience submission:\n\n${textToModerate.substring(0, 6000)}`,
                },
            ],
            max_tokens: 200,
            temperature: 0.1,
        });

        const responseText = completion.choices[0]?.message?.content || '';

        // Parse the JSON response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                isSafe: Boolean(parsed.isSafe),
                reason: parsed.reason || 'No reason provided',
            };
        }

        // If we can't parse the response, flag for manual review
        return {
            isSafe: false,
            reason: 'AI response could not be parsed - Manual Review Required',
        };
    } catch (error: any) {
        console.error('⚠️ Moderation error:', error?.message || error);

        // Fallback: if Groq times out or fails, flag for manual review
        return {
            isSafe: false,
            reason: 'AI Service Unavailable - Manual Review Required',
        };
    }
}
