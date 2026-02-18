/**
 * Vector utilities using Hugging Face Inference API.
 * Model: sentence-transformers/all-MiniLM-L6-v2 (384 dimensions)
 * Uses HUGGINGFACE_API_KEY from .env.local
 */

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY || '';
const HF_EMBEDDING_URL =
    'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2';

/**
 * Generate vector embedding using Hugging Face Inference API
 */
export async function getEmbedding(text: string): Promise<number[]> {
    if (!HF_API_KEY) {
        console.warn('⚠️ HUGGINGFACE_API_KEY not set, skipping embedding');
        return [];
    }

    const maxRetries = 3;
    let delay = 3000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(HF_EMBEDDING_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${HF_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inputs: text.substring(0, 512),
                    options: { wait_for_model: true },
                }),
                signal: AbortSignal.timeout(30000),
            });

            if (response.status === 503) {
                console.log(`⏳ HF model loading (attempt ${attempt}/${maxRetries}), waiting ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
                continue;
            }

            if (!response.ok) {
                const errorText = await response.text().catch(() => '');
                throw new Error(`HF API ${response.status}: ${errorText.substring(0, 200)}`);
            }

            const result = await response.json();

            // HF returns the embedding directly as an array of numbers
            const vector = Array.isArray(result[0]) ? result[0] : result;

            if (!Array.isArray(vector) || vector.length === 0) {
                throw new Error('Invalid embedding response format');
            }

            console.log(`✅ Embedding generated (${vector.length}d)`);
            return vector;
        } catch (error: any) {
            if (attempt === maxRetries) {
                console.error('❌ Embedding failed after retries:', error.message);
                throw error;
            }
            console.log(`⚠️ Attempt ${attempt} failed: ${error.message}, retrying...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
        }
    }

    throw new Error('Failed to generate embedding after retries');
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length || vecA.length === 0) {
        return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Generate a text summary from experience data for embedding
 */
export function generateExperienceSummary(data: {
    company: string;
    role: string;
    ctc?: number;
    rounds?: Array<{
        roundType: string;
        questions: string[];
        description?: string;
    }>;
    tags?: string[];
}): string {
    const parts: string[] = [];

    parts.push(`Interview experience at ${data.company} for ${data.role} position.`);

    if (data.ctc) {
        parts.push(`CTC: ${data.ctc} LPA.`);
    }

    if (data.rounds && data.rounds.length > 0) {
        parts.push(`Interview process consisted of ${data.rounds.length} rounds:`);

        data.rounds.forEach((round, index) => {
            parts.push(`Round ${index + 1} (${round.roundType}):`);

            if (round.description) {
                parts.push(round.description);
            }

            if (round.questions && round.questions.length > 0) {
                parts.push('Questions asked:');
                round.questions.forEach((q) => parts.push(`- ${q}`));
            }
        });
    }

    if (data.tags && data.tags.length > 0) {
        parts.push(`Skills/Topics: ${data.tags.join(', ')}`);
    }

    return parts.join(' ');
}
