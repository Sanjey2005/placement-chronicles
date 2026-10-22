/**
 * Vector utilities using Hugging Face Inference API.
 * Model: sentence-transformers/all-MiniLM-L6-v2 (384 dimensions)
 * Uses HUGGINGFACE_API_KEY from .env.local
 */

import { HfInference, InferenceClientProviderApiError } from '@huggingface/inference';
import { formatCompensation } from './utils';

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY || '';

/**
 * Generate vector embedding using Hugging Face Inference SDK
 */
export async function getEmbedding(text: string): Promise<number[]> {
    if (!HF_API_KEY) {
        console.warn('⚠️ HUGGINGFACE_API_KEY not set, skipping embedding');
        return [];
    }

    const hf = new HfInference(HF_API_KEY);

    // The model tokenizer handles truncation internally.
    // Pass up to 2000 chars to preserve detail from longer round descriptions.
    const truncatedText = text.substring(0, 2000);

    const maxRetries = 3;
    let delay = 3000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await hf.featureExtraction({
                model: 'sentence-transformers/all-MiniLM-L6-v2',
                inputs: truncatedText,
            });

            // HF returns the embedding directly as an array of numbers or nested depending on input shape
            const vector = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;

            if (!Array.isArray(vector) || vector.length === 0) {
                throw new Error('Invalid embedding response format');
            }

            console.log(`✅ Embedding generated (${vector.length}d)`);
            return vector as number[];
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            // A bad key or exhausted credits won't recover in seconds: fail now, so chat
            // drops to keyword search instead of waiting ~9s on retries first
            const hopeless = error instanceof InferenceClientProviderApiError && [401, 402].includes(error.httpResponse.status);
            if (attempt === maxRetries || hopeless) {
                console.error(`❌ Embedding failed${hopeless ? '' : ' after retries'}:`, message);
                throw error;
            }
            console.log(`⚠️ Attempt ${attempt} failed: ${message}, retrying...`);
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
 * A round as chunking reads it. Rounds are stored as Mixed and may be legacy
 * shapes, so every field is optional and `questions` may hold bare strings.
 */
export interface ChunkRound {
    type?: string;
    roundType?: string;
    interviewType?: string;
    duration?: string;
    description?: string;
    experience?: string;
    problemStatement?: string;
    strategy?: string;
    topics?: string | string[];
    tips?: string;
    studySources?: string;
    questions?: Array<string | { question: string; answerTip?: string }>;
    notes?: string;
}

/**
 * Break an experience down into logical semantic chunks for vector storage.
 * 
 * Strategy:
 * 1. Overview Chunk (Company, Role, CTC, Eligibility, Verdict, Work Model, Course/Batch)
 * 2. Round Chunks (One chunk per interview/test/hackathon round to keep search targeted)
 * 3. Final Thoughts (Tips for juniors, Overall experience)
 * 
 * Each chunk carries rich metadata for pre-filtering and display.
 */
export function chunkExperience(data: {
    companyName: string;
    roleType: string;
    studentName: string;
    ctc?: number;
    placementType?: string;
    workModel?: string;
    minCGPA?: number;
    batch?: string;
    courseBranch?: string;
    verdict?: string;
    finalVerdict?: string;
    rounds?: ChunkRound[];
    tags?: string[];
    tipsForJuniors?: string;
    overallExperience?: string;
    resumeShortlisting?: boolean;
    historyOfBacklogs?: string;
    standingBacklogs?: string;
}): Array<{
    text: string; metadata: {
        companyName: string;
        roleType: string;
        studentName: string;
        verdict?: string;
        batch?: string;
        placementType?: string;
        workModel?: string;
        ctc?: number;
    }
}> {

    const chunks: string[] = [];
    const resolvedVerdict = data.finalVerdict || data.verdict || undefined;
    const metadata = {
        companyName: data.companyName,
        roleType: data.roleType,
        studentName: data.studentName || 'Anonymous',
        verdict: resolvedVerdict,
        batch: data.batch,
        placementType: data.placementType,
        workModel: data.workModel,
        ctc: data.ctc,
    };

    // 1. Overview Chunk — include all identifying details
    const overviewParts = [
        `Student ${metadata.studentName} interviewed at ${metadata.companyName} for a ${metadata.roleType.replace('_', ' ')} role.`,
    ];
    if (resolvedVerdict) overviewParts.push(`Outcome: The student was ${resolvedVerdict}.`);
    if (data.placementType) overviewParts.push(`Placement Type: ${data.placementType.replace('_', ' ')}.`);
    if (data.workModel) overviewParts.push(`Work Model: ${data.workModel.replace('_', ' ')}.`);
    if (data.ctc) overviewParts.push(`Offered CTC: ₹${formatCompensation(data.ctc, data.roleType)}.`); // stipends are per month
    if (data.batch) overviewParts.push(`Batch: ${data.batch}.`);
    if (data.courseBranch) overviewParts.push(`Course/Branch: ${data.courseBranch}.`);
    if (data.minCGPA) overviewParts.push(`Eligibility required a minimum CGPA of ${data.minCGPA}.`);
    if (data.historyOfBacklogs) overviewParts.push(`History of Backlogs: ${data.historyOfBacklogs}.`);
    if (data.standingBacklogs) overviewParts.push(`Standing Backlogs: ${data.standingBacklogs}.`);
    if (data.tags && data.tags.length > 0) overviewParts.push(`Skills & Topics matching this role: ${data.tags.join(', ')}.`);
    if (data.resumeShortlisting !== undefined) overviewParts.push(`Resume Shortlisting: ${data.resumeShortlisting ? 'Yes' : 'No'}.`);

    chunks.push(overviewParts.join(' '));

    // 2. Round Chunks
    if (data.rounds && data.rounds.length > 0) {
        data.rounds.forEach((round, index) => {
            const roundType = round.roundType || round.interviewType || round.type || 'Round';
            let roundText = `Round ${index + 1} (${roundType}) at ${metadata.companyName} for ${metadata.roleType}:`;

            if (round.duration) roundText += ` Duration was ${round.duration}.`;
            if (round.description) roundText += ` \nDescription: ${round.description}`;
            if (round.experience) roundText += ` \nExperience: ${round.experience}`;

            // Hackathon logic
            if (round.problemStatement) roundText += ` \nProblem Statement: ${round.problemStatement}`;
            if (round.strategy) roundText += ` \nStrategy: ${round.strategy}`;

            // GD logic
            if (roundType === 'gd' && round.topics) roundText += ` \nDiscussion Topics: ${round.topics}`;
            if (roundType === 'gd' && round.tips) roundText += ` \nTips: ${round.tips}`;

            // Test logic
            if (roundType === 'test' && round.topics) roundText += ` \nTopics: ${Array.isArray(round.topics) ? round.topics.join(', ') : round.topics}`;
            if (round.studySources) roundText += ` \nStudy Sources: ${round.studySources}`;

            // Interview logic
            if (round.questions && round.questions.length > 0) {
                roundText += ` \nQuestions Asked:`;
                round.questions.forEach(q => {
                    if (typeof q === 'string') {
                        roundText += `\n- ${q}`;
                    } else {
                        roundText += `\n- ${q.question}`;
                        if (q.answerTip) roundText += ` (Tip: ${q.answerTip})`;
                    }
                });
            }
            if (round.notes) roundText += ` \nNotes: ${round.notes}`;

            chunks.push(roundText.trim());
        });
    }

    // 3. Final Thoughts Chunk
    const summaryParts = [];
    if (data.overallExperience) {
        summaryParts.push(`Overall Experience at ${metadata.companyName}: ${data.overallExperience}`);
    }
    if (data.tipsForJuniors) {
        summaryParts.push(`Preparation Tips for ${metadata.companyName}: ${data.tipsForJuniors}`);
    }

    if (summaryParts.length > 0) {
        chunks.push(summaryParts.join(' \n\n'));
    }

    // Map into required format with rich metadata
    return chunks.map(text => ({
        text,
        metadata
    }));
}
