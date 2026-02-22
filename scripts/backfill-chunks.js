/**
 * Backfill script: Generate ExperienceChunks for all existing approved experiences.
 * 
 * Run: node scripts/backfill-chunks.js
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Load .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const eqIdx = line.indexOf('=');
    if (eqIdx > 0) {
        envVars[line.substring(0, eqIdx).trim()] = line.substring(eqIdx + 1).trim();
    }
});

const MONGODB_URI = envVars.MONGODB_URI;

if (!MONGODB_URI) { console.error('❌ MONGODB_URI not found'); process.exit(1); }

// Skip embeddings for now — the text-based fallback search will work without them.
// Embeddings can be backfilled later once the HuggingFace API URL is resolved.
async function getEmbedding() { return []; }

// ─── Chunking helper ────────────────────────────────────────────────
function chunkExperience(data) {
    const chunks = [];
    const resolvedVerdict = data.finalVerdict || data.verdict || undefined;
    const metadata = {
        companyName: data.companyName || 'Unknown',
        roleType: data.roleType || 'FULL_TIME',
        studentName: data.studentName || 'Anonymous',
        verdict: resolvedVerdict,
        batch: data.batch,
        placementType: data.placementType,
        workModel: data.workModel,
        ctc: data.ctc,
    };

    // Overview
    const op = [`Student ${metadata.studentName} interviewed at ${metadata.companyName} for a ${(metadata.roleType || '').replace('_', ' ')} role.`];
    if (resolvedVerdict) op.push(`Outcome: The student was ${resolvedVerdict}.`);
    if (data.placementType) op.push(`Placement Type: ${data.placementType.replace('_', ' ')}.`);
    if (data.workModel) op.push(`Work Model: ${data.workModel.replace('_', ' ')}.`);
    if (data.ctc) op.push(`Offered CTC: ${data.ctc} LPA.`);
    if (data.batch) op.push(`Batch: ${data.batch}.`);
    if (data.courseBranch) op.push(`Course/Branch: ${data.courseBranch}.`);
    if (data.minCGPA) op.push(`Min CGPA: ${data.minCGPA}.`);
    if (data.tags && data.tags.length > 0) op.push(`Skills: ${data.tags.join(', ')}.`);
    chunks.push(op.join(' '));

    // Rounds
    if (data.rounds && Array.isArray(data.rounds)) {
        data.rounds.forEach((round, i) => {
            const rt = round.roundType || round.interviewType || round.type || 'Round';
            let t = `Round ${i + 1} (${rt}) at ${metadata.companyName} for ${metadata.roleType}:`;
            if (round.duration) t += ` Duration: ${round.duration}.`;
            if (round.description) t += ` Description: ${round.description}`;
            if (round.experience) t += ` Experience: ${round.experience}`;
            if (round.problemStatement) t += ` Problem: ${round.problemStatement}`;
            if (round.strategy) t += ` Strategy: ${round.strategy}`;
            if (round.topics) t += ` Topics: ${Array.isArray(round.topics) ? round.topics.join(', ') : round.topics}`;
            if (round.studySources) t += ` Study Sources: ${round.studySources}`;
            if (round.questions && round.questions.length > 0) {
                t += ` Questions:`;
                round.questions.forEach(q => {
                    if (typeof q === 'string') t += `\n- ${q}`;
                    else { t += `\n- ${q.question || ''}`; if (q.answerTip) t += ` (Tip: ${q.answerTip})`; }
                });
            }
            if (round.notes) t += ` Notes: ${round.notes}`;
            chunks.push(t.trim());
        });
    }

    // Final Thoughts
    const sp = [];
    if (data.overallExperience) sp.push(`Overall Experience at ${metadata.companyName}: ${data.overallExperience}`);
    if (data.tipsForJuniors) sp.push(`Tips for ${metadata.companyName}: ${data.tipsForJuniors}`);
    if (sp.length > 0) chunks.push(sp.join(' '));

    return chunks.map(text => ({ text, metadata }));
}

// ─── Main ───────────────────────────────────────────────────────────
async function main() {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const experiencesCol = db.collection('experiences');
    const chunksCol = db.collection('experiencechunks');

    const experiences = await experiencesCol.find({ status: 'APPROVED' }).toArray();
    console.log(`📊 Found ${experiences.length} approved experiences\n`);

    let totalChunks = 0, ok = 0, fail = 0;

    for (let i = 0; i < experiences.length; i++) {
        const exp = experiences[i];
        console.log(`[${i + 1}/${experiences.length}] ${exp.company} - ${exp.role}`);

        try {
            const existing = await chunksCol.countDocuments({ experienceId: exp._id });
            if (existing > 0) { console.log(`  ⏭️ Already has ${existing} chunks`); continue; }

            const chunks = chunkExperience({
                companyName: exp.company,
                roleType: exp.roleType,
                studentName: exp.studentName || exp.studentId || 'Anonymous',
                ctc: exp.ctc, placementType: exp.placementType, workModel: exp.workModel,
                minCGPA: exp.minCGPA, batch: exp.batch, courseBranch: exp.courseBranch,
                verdict: exp.verdict, finalVerdict: exp.finalVerdict,
                rounds: exp.rounds || [], tags: exp.tags || [],
                tipsForJuniors: exp.tipsForJuniors || '', overallExperience: exp.overallExperience || '',
            });

            console.log(`  📝 ${chunks.length} chunks`);
            const dbChunks = [];
            for (const chunk of chunks) {
                try {
                    const embedding = await getEmbedding(chunk.text);
                    dbChunks.push({
                        experienceId: exp._id, text: chunk.text, metadata: chunk.metadata,
                        embedding, createdAt: new Date(), updatedAt: new Date(),
                    });
                    await new Promise(r => setTimeout(r, 300)); // rate limit safety
                } catch (e) {
                    console.log(`  ⚠️ Embedding failed: ${e.message}`);
                    dbChunks.push({
                        experienceId: exp._id, text: chunk.text, metadata: chunk.metadata,
                        embedding: [], createdAt: new Date(), updatedAt: new Date(),
                    });
                }
            }

            if (dbChunks.length > 0) {
                await chunksCol.insertMany(dbChunks);
                totalChunks += dbChunks.length;
                ok++;
                console.log(`  ✅ Saved ${dbChunks.length} chunks`);
            }
        } catch (err) {
            fail++;
            console.log(`  ❌ ${err.message}`);
        }
    }

    console.log(`\n${'═'.repeat(50)}`);
    console.log(`✅ Backfill Complete!`);
    console.log(`   Success: ${ok} | Failed: ${fail}`);
    console.log(`   Total chunks: ${totalChunks}`);
    console.log(`${'═'.repeat(50)}`);

    await mongoose.disconnect();
}

main().catch(err => { console.error('❌', err); process.exit(1); });
