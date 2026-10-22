/**
 * Chunk lifecycle helpers shared by the ingestion routes and the backfill script.
 * Uses relative imports (not @/) so scripts can run via plain `node` type stripping.
 */

import type { Types } from 'mongoose';
import { getEmbedding, chunkExperience } from './vector';
import ExperienceChunk from '../models/ExperienceChunk';
import type { IExperience } from '../models/Experience';

/** The experience fields chunking reads; satisfied by hydrated documents and lean objects alike. */
export type ChunkableExperience = Pick<
    IExperience,
    'company' | 'roleType' | 'studentName' | 'ctc' | 'placementType' | 'workModel' | 'minCGPA' | 'batch'
    | 'courseBranch' | 'verdict' | 'finalVerdict' | 'rounds' | 'tags' | 'tipsForJuniors' | 'overallExperience'
    | 'resumeShortlisting' | 'historyOfBacklogs' | 'standingBacklogs'
> & { _id: Types.ObjectId | string };

export type RebuildResult = { status: 'replaced'; chunks: number } | { status: 'skipped'; reason: string };

/**
 * Rebuild the RAG chunks for one experience: re-chunk and embed everything first,
 * and only when every chunk embedded, insert the new ones and then delete the old
 * ones by _id, so readers never see the experience with no chunks. If any
 * embedding fails (no credits, bad key, network, empty vector) the old chunks stay
 * and the result says the refresh was skipped; callers carry on regardless.
 * `deps` exists for the offline self-check.
 */
export async function rebuildChunksForExperience(
    exp: ChunkableExperience,
    deps: { embed: (text: string) => Promise<number[]>; store: typeof ExperienceChunk } = { embed: getEmbedding, store: ExperienceChunk }
): Promise<RebuildResult> {
    const chunks = chunkExperience({
        companyName: exp.company,
        roleType: exp.roleType!, // ponytail: chunkExperience requires it; add a guard if legacy docs without roleType surface
        studentName: exp.studentName || 'Anonymous', // never studentId (roll number PII)
        ctc: exp.ctc,
        placementType: exp.placementType,
        workModel: exp.workModel,
        minCGPA: exp.minCGPA,
        batch: exp.batch,
        courseBranch: exp.courseBranch,
        verdict: exp.verdict,
        finalVerdict: exp.finalVerdict,
        rounds: exp.rounds || [],
        tags: exp.tags || [],
        tipsForJuniors: exp.tipsForJuniors,
        overallExperience: exp.overallExperience,
        resumeShortlisting: exp.resumeShortlisting,
        historyOfBacklogs: exp.historyOfBacklogs,
        standingBacklogs: exp.standingBacklogs,
    });

    const docs = [];
    for (const chunk of chunks) {
        let embedding: number[];
        try {
            embedding = await deps.embed(chunk.text);
        } catch (error) {
            return skipped(exp, error instanceof Error ? error.message : String(error));
        }
        if (embedding.length === 0) return skipped(exp, 'empty embedding (no Hugging Face key?)');
        docs.push({ experienceId: exp._id, text: chunk.text, metadata: chunk.metadata, embedding });
    }

    // Swap: new chunks in first, then the old ones out, so there is never a moment with none.
    // ponytail: a reader can briefly see both sets (duplicates, not a gap); a transaction would close that.
    const old = await deps.store.find({ experienceId: exp._id }).select('_id').lean();
    await deps.store.insertMany(docs);
    await deps.store.deleteMany({ _id: { $in: old.map((c) => c._id) } });
    return { status: 'replaced', chunks: docs.length };
}

function skipped(exp: ChunkableExperience, reason: string): RebuildResult {
    console.error(`Chunk refresh skipped for ${exp.company} (${exp._id}), old chunks kept: ${reason}`);
    return { status: 'skipped', reason };
}

export async function deleteChunksForExperience(experienceId: Types.ObjectId | string): Promise<void> {
    await ExperienceChunk.deleteMany({ experienceId });
}
