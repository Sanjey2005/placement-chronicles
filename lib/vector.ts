/**
 * Vector utilities. Embeddings run in-process with transformers.js (ONNX), no API call:
 * Xenova/all-MiniLM-L6-v2 is the ONNX export of sentence-transformers/all-MiniLM-L6-v2,
 * and with the same 256-token truncation, mean pooling and L2 normalisation its
 * vectors match the 384-d ones already stored (cosine 0.993 to 1.000 on 24 sampled chunks).
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { formatCompensation } from './utils';

const MODEL = 'Xenova/all-MiniLM-L6-v2';
// Same pin as scripts/fetch-model.mjs, so a runtime download gets the reviewed files, never whatever `main` holds today
const REVISION = '751bff37182d3f1213fa05d7196b954e230abad9';
const MAX_TOKENS = 256; // sentence-transformers' max_seq_length for this model; the tokenizer would allow 512

type Embed = (text: string) => Promise<number[]>;
let loading: Promise<Embed> | null = null;

/** Safe facts for /api/health: whether the bundled weights are at the path this process resolves. */
export const modelFiles = () => ({
    bundledFilesPresent: localModels() !== null,
    foundAtCwd: localModels() === join(process.cwd(), '.model-cache'),
    cwdName: process.cwd().split('/').pop() ?? '',
});

/** Where this process's weights came from, once loading has started (/api/health reports it). */
export let modelSource: 'bundled' | 'downloaded' | null = null;

// scripts/fetch-model.mjs puts the files in <project>/.model-cache at build time and next.config.ts
// ships them with the routes. That is the cwd locally; /var/task is Vercel's function root, in case
// the function runs from elsewhere.
const localModels = () =>
    [join(process.cwd(), '.model-cache'), '/var/task/.model-cache'].find((dir) => existsSync(join(dir, MODEL, 'onnx', 'model.onnx'))) ?? null;

/**
 * Loads the tokenizer and fp32 weights once per process; a failed load is retried next call.
 * Call it early (chat does) so the load overlaps other work.
 */
export function loadModel(): Promise<Embed> {
    loading ??= (async (): Promise<Embed> => {
        const { AutoModel, AutoTokenizer, env, mean_pooling } = await import('@huggingface/transformers');
        const bundled = localModels();
        // Bundled files are the normal path; without them, download (to /tmp on Vercel's read-only disk)
        if (bundled) env.localModelPath = bundled;
        env.allowRemoteModels = !bundled;
        modelSource = env.allowRemoteModels ? 'downloaded' : 'bundled';
        if (env.allowRemoteModels) {
            console.warn(`⚠️ ${MODEL} is not bundled (run scripts/fetch-model.mjs); downloading it at runtime`);
            if (process.env.VERCEL) env.cacheDir = '/tmp/transformers-cache';
        }
        const started = Date.now();
        const [tokenizer, model] = await Promise.all([
            AutoTokenizer.from_pretrained(MODEL, { revision: REVISION }),
            AutoModel.from_pretrained(MODEL, { dtype: 'fp32', revision: REVISION }),
        ]);
        console.log(`✅ Embedding model loaded in ${Date.now() - started}ms`);
        return async (text) => {
            const inputs = tokenizer(text, { truncation: true, max_length: MAX_TOKENS });
            const { last_hidden_state } = await model(inputs);
            return Array.from(mean_pooling(last_hidden_state, inputs.attention_mask).normalize(2, -1).data as Float32Array);
        };
    })();
    loading.catch(() => {
        loading = null;
    });
    return loading;
}

/** 384-d sentence embedding. Throws if the model can't load, so chat falls back to keyword search. */
export async function getEmbedding(text: string): Promise<number[]> {
    try {
        const embed = await loadModel();
        return await embed(text.substring(0, 2000));
    } catch (error) {
        console.error('❌ Embedding failed:', error instanceof Error ? error.message : String(error));
        throw error;
    }
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
