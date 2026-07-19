/**
 * Self-check for lib/rounds.ts. Run: node scripts/rounds.test.mjs
 *
 * The old icon map matched a free-text label, so `type: 'gd'` silently fell
 * through to the default and rendered as "Gd". These asserts fail loudly if the
 * discriminated union and the map drift apart again.
 */
import assert from 'node:assert/strict';

// Node 24 strips TS types natively, so lib/rounds.ts imports as-is.
const { getRound } = await import('../lib/rounds.ts');
const { averageCTC, selectionRate } = await import('../lib/utils.ts');

// The two shapes that were broken.
assert.equal(getRound({ type: 'gd' }).label, 'Group Discussion');
assert.equal(getRound({ type: 'interview', interviewType: 'mixed' }).label, 'Mixed Interview');

// The rest of the live union.
assert.equal(getRound({ type: 'test' }).label, 'Online Assessment');
assert.equal(getRound({ type: 'hackathon' }).label, 'Hackathon');
assert.equal(getRound({ type: 'interview', interviewType: 'hr' }).label, 'HR Interview');
assert.equal(getRound({ type: 'interview' }).label, 'Technical Interview'); // schema default

// Legacy free-text rows must still resolve.
assert.equal(getRound({ roundType: 'Online Assessment' }).label, 'Online Assessment');
assert.equal(getRound({ roundType: 'group discussion' }).label, 'Group Discussion');

// Never throw on junk — rounds are Mixed and Mongoose validates nothing.
assert.equal(getRound(undefined).label, 'Round');
assert.equal(getRound({}).label, 'Round');
assert.ok(getRound({ roundType: 'Fireside Chat' }).Icon);

// Money math: internships are normalised to LPA, zeros excluded.
assert.equal(averageCTC([{ ctc: 10000, roleType: 'INTERNSHIP' }]), 1.2);
assert.equal(averageCTC([{ ctc: 12, roleType: 'FULL_TIME' }, { ctc: 0 }]), 12);
assert.equal(averageCTC([]), null);
assert.equal(averageCTC([{ ctc: 0 }]), null); // no data != zero CTC

assert.equal(selectionRate([{ finalVerdict: 'selected' }, { finalVerdict: 'rejected' }]), 50);
assert.equal(selectionRate([]), 0);

console.log('rounds.test.mjs: all assertions passed');
