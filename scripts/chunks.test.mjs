/**
 * Self-check for the chunk swap in lib/chunks.ts. Run: node scripts/chunks.test.mjs
 *
 * With Hugging Face failing, a rebuild must leave the old chunks alone (it used to delete them
 * first, so an approve or edit silently dropped the experience from chat). With it working,
 * the new chunks replace the old ones and nothing is left over. No network, no database:
 * the embedder and the chunk collection are in-memory fakes.
 */
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// lib/chunks.ts and lib/vector.ts use extensionless relative imports, which Node can't resolve alone.
registerHooks({
    resolve(specifier, context, next) {
        const ours = context.parentURL && !context.parentURL.includes('/node_modules/');
        if (ours && specifier.startsWith('.') && !/\.\w+$/.test(specifier)) specifier += '.ts';
        return next(specifier, context);
    },
});

const { rebuildChunksForExperience } = await import('../lib/chunks.ts');
console.error = () => {}; // the skip path logs; keep the output clean

// Just enough of the ExperienceChunk model for the swap: find().select().lean(), insertMany, deleteMany.
function fakeStore(rows) {
    let nextId = 100;
    return {
        rows,
        find: (q) => ({ select: () => ({ lean: async () => rows.filter((r) => r.experienceId === q.experienceId).map((r) => ({ _id: r._id })) }) }),
        insertMany: async (docs) => { for (const d of docs) rows.push({ ...d, _id: nextId++ }); },
        deleteMany: async (q) => {
            const ids = new Set(q._id.$in);
            for (let i = rows.length - 1; i >= 0; i--) if (ids.has(rows[i]._id)) rows.splice(i, 1);
        },
    };
}

const exp = {
    _id: 'exp1', company: 'KLA', roleType: 'INTERNSHIP', studentName: 'Ajay H', ctc: 125000,
    rounds: [{ type: 'test', topics: 'DSA' }, { type: 'hackathon', description: 'One day' }], tipsForJuniors: 'Practise',
};
const old = () => [
    { _id: 1, experienceId: 'exp1', text: 'old overview' },
    { _id: 2, experienceId: 'exp1', text: 'old round' },
    { _id: 3, experienceId: 'other', text: 'someone else' },
];

// Hugging Face out of credits: nothing changes, and the result says it was skipped.
let store = fakeStore(old());
let result = await rebuildChunksForExperience(exp, { embed: async () => { throw new Error('402 no credits'); }, store });
assert.equal(result.status, 'skipped');
assert.deepEqual(store.rows.map((r) => r._id), [1, 2, 3]);

// A later chunk failing still keeps every old chunk (no half-swapped experience).
let calls = 0;
store = fakeStore(old());
result = await rebuildChunksForExperience(exp, { embed: async () => (++calls === 3 ? [] : [0.1, 0.2]), store });
assert.equal(result.status, 'skipped');
assert.deepEqual(store.rows.map((r) => r._id), [1, 2, 3]);

// Working embeddings: overview, 2 rounds and tips replace the old two; the other experience is untouched.
store = fakeStore(old());
result = await rebuildChunksForExperience(exp, { embed: async () => [0.1, 0.2], store });
assert.deepEqual(result, { status: 'replaced', chunks: 4 });
assert.equal(store.rows.filter((r) => r.experienceId === 'exp1').length, 4);
assert.ok(!store.rows.some((r) => r.text.startsWith('old')));
assert.ok(store.rows.some((r) => r._id === 3));
assert.match(store.rows.find((r) => r.experienceId === 'exp1').text, /₹1,25,000 \/ month/);

console.log('chunks self-check passed');
