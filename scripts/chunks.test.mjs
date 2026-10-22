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

// Just enough of the ExperienceChunk model for the swap: insertMany (returns ids) and deleteMany
// with { _id: { $in } } or { experienceId, _id: { $lt } }. Numeric ids grow like ObjectIds.
let nextId = 100;
function fakeStore(rows) {
    return {
        rows,
        insertMany: async (docs) => docs.map((d) => { const row = { ...d, _id: nextId++ }; rows.push(row); return row; }),
        deleteMany: async (q) => {
            const drop = (r) => (q._id.$in ? q._id.$in.includes(r._id) : r.experienceId === q.experienceId && r._id < q._id.$lt);
            for (let i = rows.length - 1; i >= 0; i--) if (drop(rows[i])) rows.splice(i, 1);
        },
    };
}
const approved = async () => true;

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
let result = await rebuildChunksForExperience(exp, { embed: async () => { throw new Error('402 no credits'); }, store, isApproved: approved });
assert.equal(result.status, 'skipped');
assert.deepEqual(store.rows.map((r) => r._id), [1, 2, 3]);

// A later chunk failing still keeps every old chunk (no half-swapped experience).
let calls = 0;
store = fakeStore(old());
result = await rebuildChunksForExperience(exp, { embed: async () => (++calls === 3 ? [] : [0.1, 0.2]), store, isApproved: approved });
assert.equal(result.status, 'skipped');
assert.deepEqual(store.rows.map((r) => r._id), [1, 2, 3]);

// Working embeddings: overview, 2 rounds and tips replace the old two; the other experience is untouched.
store = fakeStore(old());
result = await rebuildChunksForExperience(exp, { embed: async () => [0.1, 0.2], store, isApproved: approved });
assert.deepEqual(result, { status: 'replaced', chunks: 4 });
assert.equal(store.rows.filter((r) => r.experienceId === 'exp1').length, 4);
assert.ok(!store.rows.some((r) => r.text.startsWith('old')));
assert.ok(store.rows.some((r) => r._id === 3));
assert.match(store.rows.find((r) => r.experienceId === 'exp1').text, /₹1,25,000 \/ month/);

// Rejected before the swap (the rebuild runs after the response): nothing is inserted.
store = fakeStore(old());
result = await rebuildChunksForExperience(exp, { embed: async () => [0.1], store, isApproved: async () => false });
assert.equal(result.status, 'skipped');
assert.deepEqual(store.rows.map((r) => r._id), [1, 2, 3]);

// Rejected while inserting (its delete already ran): our new chunks are taken back out too.
store = fakeStore([{ _id: 3, experienceId: 'other', text: 'someone else' }]);
let checks = 0;
result = await rebuildChunksForExperience(exp, { embed: async () => [0.1], store, isApproved: async () => ++checks === 1 });
assert.equal(result.status, 'skipped');
assert.deepEqual(store.rows.map((r) => r._id), [3]);

// Two overlapping rebuilds: both insert before either deletes. The later insert wins, the earlier
// set and the old chunks go, and the experience is never left with none.
store = fakeStore(old());
let releaseFirst;
const gate = new Promise((r) => { releaseFirst = r; });
const first = rebuildChunksForExperience(exp, { embed: async () => [0.1], store: { ...store, deleteMany: async (q) => { await gate; return store.deleteMany(q); } }, isApproved: approved });
await new Promise((r) => setTimeout(r, 10)); // first has inserted and is parked before its delete
const second = await rebuildChunksForExperience(exp, { embed: async () => [0.2], store, isApproved: approved });
releaseFirst();
await first;
const mine = store.rows.filter((r) => r.experienceId === 'exp1');
assert.equal(second.status, 'replaced');
assert.equal(mine.length, 4);
assert.ok(mine.every((r) => r.embedding[0] === 0.2), 'only the later rebuild survives');

console.log('chunks self-check passed');
