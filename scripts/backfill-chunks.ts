// Rebuild all RAG chunks with real embeddings.
// Run: node scripts/backfill-chunks.ts   (Node 22.6+/24 native type stripping)
// Requires .env.local with MONGODB_URI and HUGGINGFACE_API_KEY.

process.loadEnvFile('.env.local');

async function run() {
    const { default: dbConnect } = await import('../lib/db');
    const { default: Experience } = await import('../models/Experience');
    const { default: ExperienceChunk } = await import('../models/ExperienceChunk');
    const { rebuildChunksForExperience } = await import('../lib/chunks');
    const { default: mongoose } = await import('mongoose');

    if (!process.env.HUGGINGFACE_API_KEY) {
        throw new Error('HUGGINGFACE_API_KEY missing — backfill would store zero chunks');
    }

    await dbConnect();

    // ponytail: full rebuild every run — purges empty embeddings, PII roll
    // numbers, and orphaned chunks in one pass. Make incremental if the corpus
    // ever outgrows HF rate limits.
    const purged = await ExperienceChunk.deleteMany({});
    console.log(`Purged ${purged.deletedCount} existing chunks`);

    const experiences = await Experience.find({ status: 'APPROVED' }).lean();
    console.log(`Rebuilding chunks for ${experiences.length} approved experiences...`);

    let totalChunks = 0;
    for (const [i, exp] of experiences.entries()) {
        const n = await rebuildChunksForExperience(exp);
        totalChunks += n;
        console.log(`[${i + 1}/${experiences.length}] ${exp.company}: ${n} chunks`);
        await new Promise(r => setTimeout(r, 300)); // HF rate-limit spacing
    }

    console.log(`Done: ${totalChunks} chunks across ${experiences.length} experiences`);
    await mongoose.disconnect();
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});

export {}; // module scope — avoids global `run` colliding with other scripts
