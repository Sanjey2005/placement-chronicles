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

    // ponytail: full rebuild every run, one experience at a time. Each swap keeps
    // the old chunks until the new ones have embedded, so a run with Hugging Face
    // down changes nothing instead of emptying the chatbot. Make incremental if the
    // corpus ever outgrows HF rate limits.
    const experiences = await Experience.find({ status: 'APPROVED' }).lean();

    // Chunks of experiences that are no longer approved (or are gone) are orphans
    const orphans = await ExperienceChunk.deleteMany({ experienceId: { $nin: experiences.map((e) => e._id) } });
    console.log(`Removed ${orphans.deletedCount} orphaned chunks`);
    console.log(`Rebuilding chunks for ${experiences.length} approved experiences...`);

    let totalChunks = 0;
    let skipped = 0;
    for (const [i, exp] of experiences.entries()) {
        const result = await rebuildChunksForExperience(exp);
        if (result.status === 'replaced') totalChunks += result.chunks;
        else skipped++;
        console.log(`[${i + 1}/${experiences.length}] ${exp.company}: ${result.status === 'replaced' ? `${result.chunks} chunks` : `skipped, old chunks kept (${result.reason})`}`);
        await new Promise(r => setTimeout(r, 300)); // HF rate-limit spacing
    }

    console.log(`Done: ${totalChunks} chunks across ${experiences.length - skipped} experiences, ${skipped} skipped`);
    await mongoose.disconnect();
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});

export {}; // module scope — avoids global `run` colliding with other scripts
