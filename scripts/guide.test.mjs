/**
 * Self-check for lib/guide.ts. Run: node scripts/guide.test.mjs
 *
 * The prep guide is only trustworthy if its counting is: these fail loudly if
 * durations, role typos, question grouping or the evidence thresholds drift.
 */
import assert from 'node:assert/strict';

const g = await import('../lib/guide.ts');

// Durations: ranges become midpoints, bare small numbers and junk are ignored
assert.equal(g.parseMinutes('1 Hour'), 60);
assert.equal(g.parseMinutes('25 mins'), 25);
assert.equal(g.parseMinutes('30-40 mins'), 35);
assert.equal(g.parseMinutes('45-1hr'), 52.5);
assert.equal(g.parseMinutes('40'), 40);
assert.equal(g.parseMinutes('2'), null);
assert.equal(g.parseMinutes('long'), null);
assert.equal(g.durationLabel([60]), null); // one report is not a pattern
assert.equal(g.durationLabel([25, 30, 30, 30, 35, 40, 40, 50, 52.5, 60, 60, 60, 60]), '30 min to 1 hr');
assert.equal(g.durationLabel([30, 30]), 'About 30 min');

// Roles: case, spacing and small typos merge; numbered levels never do
const roles = g.canonicalRoles(['Data Analyst', 'Data Analayst', 'data analyst ', 'SDE 1', 'SDE 2', 'SDE 2']);
assert.equal(roles.get('Data Analayst'), 'Data Analyst');
assert.equal(roles.get('data analyst '), 'Data Analyst');
assert.equal(roles.get('SDE 1'), 'SDE 1');
assert.equal(roles.get('SDE 2'), 'SDE 2');

// Questions: numbering and punctuation ignored, common phrasings grouped
assert.equal(g.normalizeQuestion('Q1. What do you know about Thorogood?'), 'what do you know about thorogood');
assert.equal(g.normalizeQuestion('Tell me about yourself'), 'introduce yourself');
assert.equal(g.normalizeQuestion('Introduce yourself.'), 'introduce yourself');
assert.equal(g.payLabel(45000, 'INTERNSHIP'), '₹45,000');
assert.equal(g.payLabel(12.5, 'FULL_TIME'), '12.5 LPA');
assert.equal(g.payLabel(0, 'INTERNSHIP'), null);

// A six-experience company exercising every section
const test = (topics) => ({ type: 'test', topics });
const interview = (interviewType, duration, questions) => ({ type: 'interview', interviewType, duration, questions });
const exps = [
    { id: 'a', role: 'Data Analyst', studentName: 'Asha', batch: '2025', ctc: 30000, roleType: 'INTERNSHIP', minCGPA: 7, rounds: [test('Data Sufficiency, Probability'), interview('technical', '30 mins', ['Introduce yourself', 'What is SQL?'])], tipsForJuniors: 'Practise essay writing daily. Know your resume well and speak with confidence about every project you list.' },
    { id: 'b', role: 'Data Analayst', studentName: 'Bala', batch: '2025', ctc: 0, roleType: 'INTERNSHIP', minCGPA: 0, rounds: [test('data sufficiency'), interview('technical', '1 hour', [{ question: 'Tell me about yourself', answerTip: 'Keep it under a minute' }])], tipsForJuniors: 'Essay practice helps. Communication matters.' },
    { id: 'c', role: 'Data Analyst', studentName: 'Chitra', batch: '2026', ctc: 35000, roleType: 'INTERNSHIP', minCGPA: 7, rounds: [test('Probability; Blood relations'), interview('mixed', '40 minutes', ['What is SQL?'])], tipsForJuniors: 'Revise your resume.' },
    { id: 'd', role: 'Consultant', studentName: 'Dev', batch: '2027', ctc: 40000, roleType: 'INTERNSHIP', minCGPA: 7.5, rounds: [test('Blood relations'), interview('mixed', '', [])], tipsForJuniors: '' },
    { id: 'e', role: 'Consultant', studentName: '', batch: '2027', ctc: 45000, roleType: 'INTERNSHIP', minCGPA: 7, rounds: [test('Verbal'), interview('technical', '45-1hr', ['Why this company?'])], tipsForJuniors: 'Be confident.' },
    { id: 'f', role: 'Engineer', studentName: 'Farah', batch: '2027', ctc: 12, roleType: 'FULL_TIME', minCGPA: 0, rounds: [interview('hr', '20 min', [])], tipsForJuniors: '' },
];
const guide = g.buildGuide(exps, 'Acme');

assert.equal(guide.n, 6);
assert.equal(guide.batchRange, '2025 to 2027');
assert.deepEqual(guide.pay[0], { basis: 'stipend', label: '₹30,000–45,000', shared: 4, total: 5 });
assert.deepEqual(guide.pay[1], { basis: 'ctc', label: 'Only 1 shared', shared: 1, total: 1 }); // one offer is not a range
assert.deepEqual(guide.sequence, { label: 'Online test → Interview', count: 5 });
assert.deepEqual(guide.steps.map((s) => [s.label, s.count]), [['Online test', 5], ['Interview', 6]]);
assert.deepEqual(guide.cgpa, { value: 7, count: 3, specified: 4 }); // 0 = not given, never counted
// Only topics named by 2+ students; "Verbal" (1) is left out
assert.deepEqual(guide.testTopics.map((t) => [t.label, t.count]), [['Blood Relations', 2], ['Data Sufficiency', 2], ['Probability', 2]]);
assert.ok(guide.testComponents.some((c) => c.label === 'Essay writing' && c.count === 2));
// "Introduce yourself" and "Tell me about yourself" are one question asked to two students
assert.equal(guide.questions.groups[0].text, 'Introduce yourself.');
assert.deepEqual(guide.questions.groups[0].students.map((s) => s.name), ['Asha', 'Bala']);
assert.deepEqual(guide.questions.groups[0].tips, ['Keep it under a minute']);
assert.equal(guide.questions.groups[1].students.length, 2); // "What is SQL?"
assert.equal(guide.questions.total, 5);
assert.equal(guide.questions.groups.length, 3);
// The typo'd role joins "Data Analyst" in the timeline
assert.deepEqual(guide.timeline[0].roles, [{ role: 'Data Analyst', count: 2 }]);
// Only batches with 2+ reports are compared, and the figures are ones students actually reported
assert.ok(/^Roles moved from Data Analyst \(2025\) to Consultant \(2027\)/.test(guide.headline));
assert.ok(!/42,500/.test(guide.headline)); // never a made-up median
assert.ok(guide.themes.find((t) => t.label === 'Communication and confidence').count >= 2);
assert.ok(guide.quote && guide.quote.text.length >= 40 && exps.find((e) => e.id === guide.quote.id).tipsForJuniors.includes(guide.quote.text));
assert.equal(guide.duration.label, '30 min to 55 min'); // [20, 30, 40, 52.5, 60]: the middle half

// Thin data never invents sections
const thin = g.buildGuide([{ id: 'x', role: 'SDE', batch: '2026', ctc: 0, roleType: 'FULL_TIME', minCGPA: 0, rounds: [] }], 'Tiny');
assert.deepEqual(thin.pay, [{ basis: 'ctc', label: 'Not shared', shared: 0, total: 1 }]);
assert.equal(thin.cgpa, null);
assert.equal(thin.cgpaReports, 0);
// A single CGPA report is not enough to state a cutoff
assert.equal(g.buildGuide([{ id: 'p', role: 'SDE', minCGPA: 8, rounds: [] }, { id: 'q', role: 'SDE', minCGPA: 0, rounds: [] }], 'Two').cgpa, null);
assert.equal(thin.sequence, null);
assert.equal(thin.duration, null);
assert.deepEqual(thin.timeline, []);
assert.equal(thin.headline, null);
assert.equal(thin.quote, null);
assert.equal(g.GUIDE_MIN, 3);

console.log('guide.test.mjs: all assertions passed');
