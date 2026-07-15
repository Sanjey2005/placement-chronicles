/**
 * Chunk lifecycle helpers shared by the ingestion routes and the backfill script.
 * Uses relative imports (not @/) so scripts can run via plain `node` type stripping.
 */

import { getEmbedding, chunkExperience } from './vector';
import ExperienceChunk from '../models/ExperienceChunk';

/**
 * Rebuild the RAG chunks for one experience: delete existing chunks,
 * re-chunk, embed, and insert. Returns the number of chunks stored.
 * Chunks whose embedding fails are skipped — rerun the backfill to recover.
 */
export async function rebuildChunksForExperience(exp: any): Promise<number> {
    await ExperienceChunk.deleteMany({ experienceId: exp._id });

    const chunks = chunkExperience({
        companyName: exp.company,
        roleType: exp.roleType,
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
        try {
            const embedding = await getEmbedding(chunk.text);
            if (embedding.length === 0) continue; // no key configured — skip, don't store empty
            docs.push({
                experienceId: exp._id,
                text: chunk.text,
                metadata: chunk.metadata,
                embedding,
            });
        } catch {
            // skip this chunk; backfill rerun recovers it
        }
    }

    if (docs.length > 0) {
        await ExperienceChunk.insertMany(docs);
    }
    return docs.length;
}

export async function deleteChunksForExperience(experienceId: any): Promise<void> {
    await ExperienceChunk.deleteMany({ experienceId });
}
