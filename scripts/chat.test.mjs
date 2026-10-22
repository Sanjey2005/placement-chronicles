/**
 * Self-check for lib/chat.ts. Run: node scripts/chat.test.mjs
 *
 * The chat renders whatever these return; the asserts fail loudly if an SSE event
 * split across network chunks gets lost, failed answers leak into the history sent
 * back to the model, or a student shows up twice under one answer.
 */
import assert from 'node:assert/strict';

// Node 24 strips TS types natively, so lib/chat.ts imports as-is.
const { takeEvents, apiHistory, uniqueSources, sourcesLabel, initials, roleLabel, rehypeCaret } = await import('../lib/chat.ts');
const { terms, keywordScores, spreadAcross } = await import('../lib/retrieval.ts');

// An event cut mid-JSON waits in `rest` until the next chunk completes it.
let buf = 'data: {"text":"Five "}\n\ndata: {"te';
let out = takeEvents(buf);
assert.deepEqual(out.events, [{ text: 'Five ' }]);
assert.equal(out.rest, 'data: {"te');
buf = out.rest + 'xt":"rounds"}\n\ndata: {"sources":[],"done":true}\n\n';
out = takeEvents(buf);
assert.deepEqual(out.events, [{ text: 'rounds' }, { sources: [], done: true }]);
assert.equal(out.rest, '');

// Garbage is skipped without dropping the events around it.
assert.deepEqual(takeEvents('data: {oops}\n\n: ping\n\ndata: {"text":"ok"}\n\n').events, [{ text: 'ok' }]);

// History: questions plus answers that arrived (stopped ones too); errors and the
// in-flight placeholder stay out; capped at the last 10.
const turns = [
    { id: 1, role: 'user', content: 'Q1' },
    { id: 2, role: 'assistant', content: 'A1', status: 'done' },
    { id: 3, role: 'user', content: 'Q2' },
    { id: 4, role: 'assistant', content: '', status: 'error', error: { kind: 'limit' } },
    { id: 5, role: 'user', content: 'Q3' },
    { id: 6, role: 'assistant', content: 'half an ans', status: 'stopped' },
    { id: 7, role: 'user', content: 'Q4' },
    { id: 8, role: 'assistant', content: '', status: 'streaming' },
];
assert.deepEqual(apiHistory(turns), [
    { role: 'user', content: 'Q1' },
    { role: 'assistant', content: 'A1' },
    { role: 'user', content: 'Q2' },
    { role: 'user', content: 'Q3' },
    { role: 'assistant', content: 'half an ans' },
    { role: 'user', content: 'Q4' },
]);
const many = Array.from({ length: 14 }, (_, i) => ({ id: i, role: 'user', content: `Q${i}` }));
assert.equal(apiHistory(many).length, 10);
assert.equal(apiHistory(many)[0].content, 'Q4');

// One chip per student per company, first (most relevant) occurrence wins.
const sources = [
    { company: 'J.P. Morgan', role: 'INTERNSHIP', student: 'Sunil J', similarity: 0.71 },
    { company: 'J.P. Morgan', role: 'INTERNSHIP', student: 'Nithin V', similarity: 0.66 },
    { company: 'J.P. Morgan', role: 'INTERNSHIP', student: 'Sunil J', similarity: 0.52 },
];
assert.deepEqual(uniqueSources(sources).map((s) => s.student), ['Sunil J', 'Nithin V']);
assert.equal(sourcesLabel(uniqueSources(sources)), '2 J.P. Morgan experiences');
assert.equal(sourcesLabel(sources.slice(0, 1)), '1 J.P. Morgan experience');
assert.equal(sourcesLabel([...sources, { company: 'Thorogood', role: 'INTERNSHIP', student: 'Aparna', similarity: 0.5 }]), '4 experiences');

assert.equal(initials('Sree Varshni S'), 'SV');
assert.equal(initials('L. Shambhavi'), 'LS');
assert.equal(initials('Aparna'), 'A');
assert.equal(initials(undefined), '?');

// The streaming caret trails the last word. Mid-table it goes in the cell being written,
// even while empty; a <span> straight inside the <tr> broke hydration.
const el = (tagName, children = []) => ({ type: 'element', tagName, properties: {}, children });
const txt = (value) => ({ type: 'text', value });
const withCaret = (tree) => (rehypeCaret({ className: 'caret' })(tree), tree);
const table = withCaret({ type: 'root', children: [el('table', [el('tbody', [el('tr', [el('td', [txt('6.0')]), txt('\n'), el('td')])])])] });
assert.equal(table.children[0].children[0].children[0].children[2].children[0].tagName, 'span');
const list = withCaret({ type: 'root', children: [el('ul', [txt('\n'), el('li', [txt('95 × 95')]), txt('\n')])] });
assert.deepEqual(list.children[0].children[1].children.map((c) => c.type), ['text', 'element']);
const rule = withCaret({ type: 'root', children: [el('p', [txt('Five rounds')]), el('hr')] });
assert.equal(rule.children[1].children.length, 0); // never inside a void element
assert.equal(rule.children[2].properties.className[0], 'caret');

// Retrieval, server side. Stop words go (generic ones like "rounds" too), short acronyms stay, plurals fold.
assert.deepEqual(terms('What DSA questions did they ask in the C++ rounds, generally?'), ['dsa', 'question', 'ask', 'c++']);

// Keyword ranking (embeddings down): more and rarer matching terms rank higher; no shared term scores 0.
const docs = [
    'Round 1 (test): Topics: arrays, graphs, dynamic programming',
    'Overview: the student was selected. Work model: hybrid.',
    'Tips: practise graphs and trees daily. Graphs come up again in the hackathon.',
];
const scores = keywordScores(terms('graph and tree questions'), docs);
assert.equal(scores[1], 0);
assert.ok(scores[2] > scores[0] && scores[0] > 0);

// A broad question spreads across companies: one excerpt per experience, round-robin by company,
// so a company with many write-ups can't fill the context.
const ranked = [
    { id: 'T1a', company: 'Thorogood', experience: 'e1' },
    { id: 'T1b', company: 'Thorogood', experience: 'e1' },
    { id: 'T2', company: 'Thorogood', experience: 'e2' },
    { id: 'T3', company: 'Thorogood', experience: 'e3' },
    { id: 'J1', company: 'J.P. Morgan', experience: 'e4' },
    { id: 'K1', company: 'KLA', experience: 'e5' },
    { id: 'J2', company: 'J.P. Morgan', experience: 'e6' },
];
const pick = (limit) => spreadAcross(ranked, limit, (x) => x).map((x) => x.id);
assert.deepEqual(pick(4), ['T1a', 'J1', 'K1', 'T2']);
assert.deepEqual(pick(10), ['T1a', 'J1', 'K1', 'T2', 'J2', 'T3']);
// One company: ranked order, capped per write-up so a few students are heard, not one.
const thorogood = ranked.filter((x) => x.company === 'Thorogood');
assert.deepEqual(spreadAcross(thorogood, 3, (x) => x, 2).map((x) => x.id), ['T1a', 'T1b', 'T2']);
assert.deepEqual(spreadAcross(thorogood, 3, (x) => x, 1).map((x) => x.id), ['T1a', 'T2', 'T3']);

assert.equal(roleLabel('SUMMER_INTERNSHIP'), 'Summer internship');
assert.equal(roleLabel('APPRENTICE'), 'APPRENTICE');

console.log('chat self-check passed');
