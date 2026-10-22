/**
 * Read-only audit of every company page. Run: node scripts/audit-guide.mjs
 * (uses MONGODB_URI from the environment, else from .env.local; only ever reads).
 *
 * Loads every APPROVED experience, groups them by company exactly as the site
 * does, and runs the same code the pages run (buildGuide, stepBody, roundBlocks,
 * questionsOf, roundKind). It reports every round or guide section that would
 * render empty, ignore stored text, or show questions differently. Exits 1 if
 * it finds a problem, so it can gate a deploy.
 */
import fs from 'node:fs';
import mongoose from 'mongoose';

const g = await import('../lib/guide.ts');

const uri =
    process.env.MONGODB_URI ??
    fs
        .readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
        .match(/^MONGODB_URI\s*=\s*["']?([^"'\n]+)/m)?.[1];
if (!uri) throw new Error('MONGODB_URI not set');

await mongoose.connect(uri);
const rows = await mongoose.connection.db.collection('experiences').find({ status: 'APPROVED' }).toArray();
await mongoose.disconnect();

const LABELS = new Set(['type', 'roundType', 'interviewType', 'roundNumber', 'duration', 'links', '_id', 'id']);
const rawText = (r) => g.textOf(Object.fromEntries(Object.entries(r).filter(([k]) => !LABELS.has(k))));
const rawQuestions = (r) => (Array.isArray(r.questions) ? r.questions : typeof r.questions === 'string' ? r.questions.split(/\n+/) : []).filter((q) => g.textOf(q).length > 2);

const byCompany = new Map();
for (const e of rows) byCompany.set(e.company ?? '', [...(byCompany.get(e.company ?? '') ?? []), e]);

const report = [];
const info = new Map(); // shape → count, for the record
const note = (k) => info.set(k, (info.get(k) ?? 0) + 1);

for (const [company, exps] of [...byCompany].sort((a, b) => a[0].localeCompare(b[0]))) {
    const problems = [];
    // Reader: every round of every experience
    for (const e of exps) {
        const who = `${e.studentName?.trim() || 'Anonymous'} (${e._id})`;
        (Array.isArray(e.rounds) ? e.rounds : []).forEach((r, i) => {
            if (!r || typeof r !== 'object') return problems.push(`${who} round ${i + 1}: not an object (${JSON.stringify(r)})`);
            const blocks = g.roundBlocks(r);
            const questions = g.questionsOf(r);
            note(`round type=${r.type ?? '-'} roundType=${r.roundType ?? '-'} → ${g.roundKind(r)}`);
            for (const q of Array.isArray(r.questions) ? r.questions : []) note(`question as ${q === null ? 'null' : typeof q === 'object' ? `{${Object.keys(q).sort().join(',')}}` : typeof q}`);
            if (typeof r.questions === 'string') note('questions as one string');
            if (g.roundKind(r) === 'other') problems.push(`${who} round ${i + 1}: unknown round type (type=${r.type}, roundType=${r.roundType})`);
            for (const b of blocks.filter((x) => x.extra)) problems.push(`${who} round ${i + 1}: field "${b.field}" is not a named field, shown only by the fallback`);
            if (!blocks.length && !questions.length && rawText(r)) problems.push(`${who} round ${i + 1}: has text but renders empty: ${rawText(r).slice(0, 80)}`);
            if (questions.length < rawQuestions(r).length) problems.push(`${who} round ${i + 1}: ${rawQuestions(r).length - questions.length} stored question(s) not shown`);
            if (!blocks.length && !questions.length && !rawText(r)) note('round with no content (reader shows one honest line)');
        });
    }
    // Guide: only companies that get one
    let guideNote = 'reader only';
    if (exps.length >= g.GUIDE_MIN) {
        const guide = g.buildGuide(
            exps.map((e) => ({ ...e, id: String(e._id) })),
            company
        );
        guideNote = `guide: ${guide.steps.map((s) => `${s.label} [${g.stepBody(guide, s)}]`).join(', ')}`;
        for (const s of guide.steps) if (g.stepBody(guide, s) === 'none') note('guide step with no descriptions (shows one honest line)');
        const stored = exps.flatMap((e) => (Array.isArray(e.rounds) ? e.rounds : []).filter(Boolean).flatMap(rawQuestions)).length;
        if (stored > 0 && guide.questions.groups.length === 0) problems.push(`guide: ${stored} stored questions but the question bank is empty`);
        if (guide.questions.total < stored) problems.push(`guide: question bank holds ${guide.questions.total} of ${stored} stored questions`);
        for (const q of guide.questions.groups) if (!q.text.trim() || q.students.length === 0) problems.push(`guide: blank question bank row`);
        if (!guide.pay.length) problems.push('guide: no pay tile');
    }
    report.push({ company, experiences: exps.length, problems, guideNote });
}

for (const r of report) {
    console.log(`${r.problems.length ? '✗' : '✓'} ${r.company} — ${r.experiences} experience(s), ${r.problems.length} problem(s); ${r.guideNote}`);
    for (const p of r.problems) console.log(`    ${p}`);
}
console.log('\nShapes seen:');
for (const [k, n] of [...info].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${k}`);
const total = report.reduce((s, r) => s + r.problems.length, 0);
console.log(`\n${report.length} companies, ${rows.length} approved experiences, ${total} problem(s).`);
process.exitCode = total ? 1 : 0;
