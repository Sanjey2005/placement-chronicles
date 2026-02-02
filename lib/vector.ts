import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

if (!GEMINI_API_KEY) {
    throw new Error(
        'Please define the GEMINI_API_KEY environment variable inside .env.local'
    );
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * Generate vector embedding for text using Google's embedding-001 model
 * @param text - The text to generate embedding for
 * @returns Vector embedding as number array
 */
export async function getEmbedding(text: string): Promise<number[]> {
    try {
        const model = genAI.getGenerativeModel({ model: 'embedding-001' });

        const result = await model.embedContent(text);
        const embedding = result.embedding;

        return embedding.values;
    } catch (error) {
        console.error('Error generating embedding:', error);
        throw new Error('Failed to generate embedding');
    }
}

/**
 * Calculate cosine similarity between two vectors
 * @param vecA - First vector
 * @param vecB - Second vector
 * @returns Similarity score between -1 and 1
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
        throw new Error('Vectors must have the same length');
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
 * @param data - Experience data object
 * @returns Text summary
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

    // Add company and role
    parts.push(`Interview experience at ${data.company} for ${data.role} position.`);

    // Add CTC if available
    if (data.ctc) {
        parts.push(`CTC: ${data.ctc} LPA.`);
    }

    // Add rounds information
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

    // Add tags if available
    if (data.tags && data.tags.length > 0) {
        parts.push(`Skills/Topics: ${data.tags.join(', ')}`);
    }

    return parts.join(' ');
}
