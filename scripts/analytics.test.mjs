/**
 * Self-check for lib/analytics.ts. Run: node scripts/analytics.test.mjs
 *
 * The page's numbers come from these tallies; the asserts fail loudly if
 * month bucketing drifts off IST, zero-filling stops, or a list's order flips.
 */
import assert from 'node:assert/strict';

// Node 24 strips TS types natively, so lib/analytics.ts imports as-is.
const { breakdowns, monthKey, monthsBetween, monthLabel, niceMax } = await import('../lib/analytics.ts');

// IST, not UTC: 20:00 UTC on 31 Jan is already 1 Feb in Coimbatore.
assert.equal(monthKey(new Date('2026-01-31T20:00:00Z')), '2026-02');
assert.deepEqual(monthsBetween('2025-11', '2026-02'), ['2025-11', '2025-12', '2026-01', '2026-02']);
assert.deepEqual(monthsBetween('2026-03', '2026-02'), []);
assert.equal(monthLabel('2026-02'), 'Feb 2026');

// Axis maximum is an even "round" number so the half-line label is whole.
assert.equal(niceMax(0), 2);
assert.equal(niceMax(51), 60);
assert.equal(niceMax(101), 120);

const row = (over) => ({
    company: 'KLA',
    role: 'Intern',
    ctc: 10000,
    roleType: 'INTERNSHIP',
    placementType: 'ON_CAMPUS',
    workModel: 'ON_SITE',
    batch: '2027',
    courseBranch: 'M.Sc Software Systems',
    minCGPA: 0,
    roundCount: 2,
    finalVerdict: 'selected',
    createdAt: new Date('2026-02-10T06:00:00Z'),
    ...over,
});
const rows = [
    row({}),
    row({ company: 'JPMC', roundCount: 10, minCGPA: 7.5, createdAt: new Date('2026-04-01T06:00:00Z') }),
    row({ company: 'JPMC', roleType: 'FULL_TIME', workModel: 'WFH', batch: '2026', roundCount: 0, role: 'Intern ' }),
];
const b = breakdowns(rows, new Date('2026-05-15T00:00:00Z'));

// Months are zero-filled from the first experience up to "now".
assert.deepEqual(b.series, [
    { t: '2026-02', count: 2 },
    { t: '2026-03', count: 0 },
    { t: '2026-04', count: 1 },
    { t: '2026-05', count: 0 },
]);
// Counts sort by value, ties by name; a trailing space is the same name.
assert.deepEqual(b.roles, [{ name: 'Intern', value: 3 }]);
assert.deepEqual(b.companies, [{ name: 'JPMC', value: 2 }, { name: 'KLA', value: 1 }]);
// Enum values read as words.
assert.deepEqual(b.roleTypes, [{ name: 'Internship', value: 2 }, { name: 'Full-time', value: 1 }]);
assert.deepEqual(b.workModels, [{ name: 'On site', value: 2 }, { name: 'Work from home', value: 1 }]);
// Numeric lists sort by number ("2 rounds" before "10 rounds"); zero rounds is not a bucket.
assert.deepEqual(b.rounds, [{ name: '2 rounds', value: 1 }, { name: '10 rounds', value: 1 }]);
assert.deepEqual(b.cgpa, [{ name: '7.5', value: 1 }, { name: 'Not given', value: 2 }]);
assert.deepEqual(b.batches, [{ name: '2026', value: 1 }, { name: '2027', value: 2 }]);
// No rows, no chart.
assert.deepEqual(breakdowns([]).series, []);

console.log('analytics.test.mjs: all assertions passed');
