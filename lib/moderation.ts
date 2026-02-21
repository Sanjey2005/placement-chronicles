import Groq from 'groq-sdk';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// A robust list of known company aliases to enforce deterministic canonicalization
// even if the AI model output varies.
const COMPANY_ALIASES: Record<string, string> = {
    'buckman laboratories': 'Buckman',
    'buckman labs': 'Buckman',
    'buckman': 'Buckman',
    'icu medical india llp': 'ICU Medical',
    'icu medical llp': 'ICU Medical',
    'icu medical': 'ICU Medical',
    'foxsense innovations': 'Foxsense Innovations',
    'foxsense': 'Foxsense Innovations',
    'jp morgan': 'J.P. Morgan',
    'j.p. morgan': 'J.P. Morgan',
    'jpmorgan': 'J.P. Morgan',
    'jpmc': 'J.P. Morgan',
    'amazon web services': 'Amazon',
    'aws': 'Amazon',
};

/**
 * Deterministically resolve known aliases.
 */
export function enforceCanonicalName(name: string): string {
    if (!name) return name;

    const normalizedInput = name.trim().toLowerCase().replace(/\s+/g, ' ');

    // 1. Check exact map
    if (COMPANY_ALIASES[normalizedInput]) {
        return COMPANY_ALIASES[normalizedInput];
    }

    // 2. Fallback fuzzy checks for common culprits if they typed something like 'Buckman Lab'
    if (normalizedInput.startsWith('buckman')) return 'Buckman';
    if (normalizedInput.startsWith('icu medical')) return 'ICU Medical';

    return name;
}

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
export async function moderateExperience(data: any, existingCompanies: string[] = []): Promise<ModerationResult> {
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

DO THREE THINGS:
1. MODERATION: Check for:
   - Gibberish/Spam (e.g., 'asdf asdf', random characters)
   - Hate Speech/Abuse (offensive, discriminatory language)
   - Obviously fake content (impossible scenarios, trolling)

2. NORMALIZATION: Extract the company name and convert it to its official "Canonical Name".
   - CRITICAL: Here is a list of companies already in our database:
     [${existingCompanies.length > 0 ? existingCompanies.join(', ') : 'None yet.'}]
   - You MUST map the extracted company name to one of the companies in the list above if it is the same company (even if spelled slightly differently or has a different corporate suffix).
   - If and ONLY IF the company is completely missing from the list above, extract its canonical name and capitalize it properly.
   - Example Normalizations:
     - "google" -> "Google"
     - "atlassian" -> "Atlassian"
     - "Jp morgan" / "jpmc" -> "J.P. Morgan"
     - "amazon web services" / "aws" -> "Amazon"
     - "buckman laboratories" -> "Buckman"
     - "icu medical llp" -> "ICU Medical"

3. ROLE VALIDATION: Check if the "role" field contains an actual job role/title.
   - Flag as UNSAFE if the role is actually a degree or course name (e.g., "M.Sc Data Science", "BTech CSE", "MBA Finance", "B.E. Mechanical", "MSc Physics").
   - Valid roles are job titles like: "Software Engineer", "Data Analyst", "Junior Analyst", "SDE Intern", "Business Analyst", "Consultant", "Research Associate", etc.
   - If the role looks like a degree/course instead of a job title, set isSafe to false with reason "Role field contains a degree/course name instead of a job title".

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
                canonicalCompanyName: enforceCanonicalName(parsed.canonicalCompanyName || data.company),
            };
        } catch (parseError) {
            console.error('Json parse error in moderation:', parseError);
            return {
                isSafe: false,
                reason: 'AI response malformed - Manual Review Required',
                canonicalCompanyName: enforceCanonicalName(data.company)
            };
        }

    } catch (error: any) {
        console.error('⚠️ Moderation error:', error?.message || error);

        // Fallback: if Groq times out or fails, flag for manual review
        return {
            isSafe: false,
            reason: 'AI Service Unavailable - Manual Review Required',
            canonicalCompanyName: enforceCanonicalName(data.company)
        };
    }
}
