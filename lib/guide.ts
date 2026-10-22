// Prep guide maths for the company page. Plain counting over what students
// submitted: no AI, no guessing. Every figure carries how many experiences it
// rests on, and every quote or question is a student's exact words.
// Import-free so scripts/guide.test.mjs can load it straight into Node.
//
// Deliberately NOT counted: backlog answers and the selected/rejected outcome.
// The share form pre-fills those, so an untouched default is indistinguishable
// from a real answer.

/** Below this many experiences the patterns are anecdotes, so the company page opens on the Reader. */
export const GUIDE_MIN = 5;

/** No figure, topic, theme or trend is shown unless at least this many students back it. */
export const MIN_EVIDENCE = 2;

export interface GuideQuestion {
    question?: string;
    answerTip?: string;
}

export interface GuideRound {
    type?: string;
    interviewType?: string;
    roundType?: string;
    duration?: string;
    topics?: string | string[];
    notes?: string;
    description?: string;
    questions?: Array<string | GuideQuestion>;
}

export interface GuideExperience {
    id: string;
    role: string;
    studentName?: string;
    batch?: string;
    ctc?: number;
    roleType?: string;
    minCGPA?: number;
    rounds?: unknown[];
    tipsForJuniors?: string;
    overallExperience?: string;
    createdAt?: string | Date;
}

export type RoundKind = 'test' | 'interview' | 'gd' | 'hackathon' | 'other';

export const KIND_LABEL: Record<RoundKind, string> = {
    test: 'Online test',
    interview: 'Interview',
    gd: 'Group discussion',
    hackathon: 'Hackathon',
    other: 'Other round',
};

const roundsOf = (e: GuideExperience): GuideRound[] =>
    Array.isArray(e.rounds) ? e.rounds.filter((r): r is GuideRound => !!r && typeof r === 'object') : [];

export function roundKind(r: GuideRound): RoundKind {
    switch (r.type) {
        case 'test': return 'test';
        case 'interview': return 'interview';
        case 'gd': return 'gd';
        case 'hackathon': return 'hackathon';
    }
    const label = String(r.roundType ?? '').toLowerCase(); // legacy free-text rows
    if (/online|assessment|aptitude|mcq|\btest\b/.test(label)) return 'test';
    if (/group discussion|\bgd\b/.test(label)) return 'gd';
    if (/hackathon/.test(label)) return 'hackathon';
    if (/interview|technical|\bhr\b|managerial/.test(label)) return 'interview';
    return 'other';
}

export const questionsOf = (r: GuideRound): Array<{ question: string; answerTip: string }> =>
    (Array.isArray(r.questions) ? r.questions : [])
        .map((q) => (typeof q === 'string' ? { question: q, answerTip: '' } : { question: q?.question ?? '', answerTip: q?.answerTip ?? '' }))
        .filter((q) => q.question.trim().length > 2);

// ── Small formatters ──────────────────────────────────────────────────────

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

export const isInternship = (roleType?: string) => roleType === 'INTERNSHIP' || roleType === 'SUMMER_INTERNSHIP';

/** "₹45,000" for a monthly stipend, "12 LPA" for a full-time CTC, null when not shared (0). */
export function payLabel(ctc: number | undefined, roleType?: string): string | null {
    if (!ctc || ctc <= 0) return null;
    return isInternship(roleType) ? `₹${inr.format(ctc)}` : `${inr.format(ctc)} LPA`;
}

function rangeLabel(values: number[], stipend: boolean): string {
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    if (stipend) return lo === hi ? `₹${inr.format(lo)}` : `₹${inr.format(lo)}–${inr.format(hi)}`;
    return lo === hi ? `${inr.format(lo)} LPA` : `${inr.format(lo)}–${inr.format(hi)} LPA`;
}

const median = (values: number[]) => {
    const s = [...values].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

const batchNum = (b?: string) => {
    const n = Number.parseInt(b ?? '', 10);
    return Number.isFinite(n) ? n : 0;
};

// ── Durations ─────────────────────────────────────────────────────────────

/**
 * Minutes from free text like "1 Hour", "25 mins", "30-40 mins", "45-1hr" or "40".
 * A range becomes its midpoint; a bare number above 4 is minutes; anything
 * unreadable or outside 5 min to 5 hr is ignored rather than guessed.
 */
export function parseMinutes(text?: string): number | null {
    if (!text) return null;
    const tokens = [...text.toLowerCase().matchAll(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|h\b|minutes?|mins?|m\b)?/g)];
    const values: number[] = [];
    for (const [, num, unit] of tokens) {
        const n = Number(num);
        if (unit?.startsWith('h')) values.push(n * 60);
        else if (unit?.startsWith('m')) values.push(n);
        else if (n > 4) values.push(n);
    }
    if (values.length === 0) return null;
    const minutes = values.reduce((a, b) => a + b, 0) / values.length;
    return minutes >= 5 && minutes <= 300 ? minutes : null;
}

export function formatMinutes(minutes: number): string {
    const m = Math.round(minutes / 5) * 5;
    if (m < 60) return `${m} min`;
    const h = m / 60;
    return `${Number.isInteger(h) ? h : h.toFixed(1)} hr`;
}

/** Typical length from 2+ reports: the middle half when there are 3 or more, else the full span. */
export function durationLabel(minutes: number[]): string | null {
    if (minutes.length < 2) return null;
    const s = [...minutes].sort((a, b) => a - b);
    const lo = s.length >= 3 ? s[Math.floor((s.length - 1) * 0.25)] : s[0];
    const hi = s.length >= 3 ? s[Math.ceil((s.length - 1) * 0.75)] : s[s.length - 1];
    const a = formatMinutes(lo);
    const b = formatMinutes(hi);
    return a === b ? `About ${a}` : `${a} to ${b}`;
}

// ── Roles ─────────────────────────────────────────────────────────────────

function editDistance(a: string, b: string): number {
    const row = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        let prev = row[0];
        row[0] = i;
        for (let j = 1; j <= b.length; j++) {
            const tmp = row[j];
            row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
            prev = tmp;
        }
    }
    return row[b.length];
}

/**
 * Raw role → display role. Case and spacing differences collapse, and a typo
 * one or two letters off ("Data Analayst") joins the more common spelling.
 * Roles whose digits differ ("SDE 1" / "SDE 2") are never merged.
 */
export function canonicalRoles(roles: string[]): Map<string, string> {
    const clean = (r: string) => r.trim().replace(/\s+/g, ' ');
    const tally = new Map<string, { display: string; n: number }>();
    for (const raw of roles) {
        const display = clean(raw);
        const key = display.toLowerCase();
        const entry = tally.get(key) ?? { display, n: 0 };
        entry.n++;
        tally.set(key, entry);
    }
    const keys = [...tally.keys()].sort((a, b) => tally.get(b)!.n - tally.get(a)!.n || a.localeCompare(b));
    const root = new Map<string, string>();
    const digits = (s: string) => s.replace(/\D/g, '');
    for (const [i, key] of keys.entries()) {
        const limit = key.length >= 8 ? 2 : 1;
        const match = keys
            .slice(0, i)
            .find((other) => root.get(other) === other && key.length >= 5 && digits(key) === digits(other) && editDistance(key, other) <= limit);
        root.set(key, match ?? key);
    }
    const out = new Map<string, string>();
    for (const raw of roles) out.set(raw, tally.get(root.get(clean(raw).toLowerCase())!)!.display);
    return out;
}

// ── Questions ─────────────────────────────────────────────────────────────

const ALIASES: Array<[RegExp, string, string]> = [
    [/^(please )?(tell (me|us) (about|something about) yourself|introduce yourself( briefly)?|(give )?(a |your )?(short |brief )?(self )?introduction( about yourself)?)$/, 'introduce yourself', 'Introduce yourself.'],
    [/^((do you have )?any questions for (us|them|the panel)|questions to ask( them)?|(at the end )?i was asked to (ask|question) them)$/, 'questions for the panel', 'Do you have any questions for us?'],
];

/** Lowercase, numbering and punctuation stripped, so trivially different wordings group together. */
export function normalizeQuestion(q: string): string {
    const base = q
        .toLowerCase()
        .replace(/^\s*(q\s*)?\d+\s*[.):-]\s*/, '')
        .replace(/[^a-z0-9 ]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return ALIASES.find(([re]) => re.test(base))?.[1] ?? base;
}

export interface QuestionGroup {
    text: string;
    kind: RoundKind;
    students: Array<{ id: string; name: string; batch?: string }>;
    tips: string[];
}

// ── Test topics and components ────────────────────────────────────────────

const TOPIC_NAMES: Record<string, string> = {
    'data sufficiency': 'Data Sufficiency',
    'data interpretation': 'Data Interpretation',
    di: 'Data Interpretation',
    quant: 'Quantitative Aptitude',
    quants: 'Quantitative Aptitude',
    'quantitative aptitude': 'Quantitative Aptitude',
    'logical reasoning': 'Logical Reasoning',
    reasoning: 'Logical Reasoning',
    'verbal ability': 'Verbal Ability',
    verbal: 'Verbal Ability',
    'directions and seating arrangements': 'Directions and Seating',
    'seating arrangement': 'Directions and Seating',
    'seating arrangements': 'Directions and Seating',
    'alligations and mixtures': 'Alligation and Mixtures',
    'alligation and mixtures': 'Alligation and Mixtures',
    dsa: 'DSA',
    'data structures': 'DSA',
    sql: 'SQL',
    dbms: 'DBMS',
    os: 'Operating Systems',
    'operating systems': 'Operating Systems',
    cn: 'Computer Networks',
    'computer networks': 'Computer Networks',
    oops: 'OOP',
    oop: 'OOP',
    mcq: 'MCQs',
    mcqs: 'MCQs',
};

const SKIP_TOPICS = new Set(['etc', 'and', 'others', 'other', 'essay', 'essay writing', 'aptitude', 'mcq', 'mcqs']);

const titleCase = (s: string) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());

function topicLabels(topics: string | string[] | undefined): string[] {
    const raw = Array.isArray(topics) ? topics.join(',') : String(topics ?? '');
    const out = new Set<string>();
    for (const part of raw.split(/[,;\n()/]+/)) {
        const key = part.toLowerCase().replace(/[^a-z0-9 &]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^and /, '');
        if (key.length < 2 || key.length > 40 || /^\d+$/.test(key) || SKIP_TOPICS.has(key)) continue;
        out.add(TOPIC_NAMES[key] ?? titleCase(key));
    }
    return [...out];
}

const COMPONENTS: Array<{ label: string; re: RegExp }> = [
    { label: 'Essay writing', re: /\bessay/i },
    { label: 'Coding questions', re: /\bcoding\b|\bprogramming\b|leetcode|hackerrank/i },
    { label: 'Aptitude MCQs', re: /aptitude|\bquant|\bmcqs?\b|reasoning/i },
    { label: 'SQL', re: /\bsql\b/i },
];

// ── Advice themes ─────────────────────────────────────────────────────────

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function themesFor(company: string): Array<{ label: string; re: RegExp }> {
    return [
        { label: 'Communication and confidence', re: /communicat|confiden|body language|fluen/i },
        { label: 'Practise essay writing', re: /\bessay/i },
        { label: 'Know your resume inside out', re: /\bresume\b|\bcv\b/i },
        { label: 'Your projects, from every angle', re: /\bprojects?\b/i },
        { label: 'Aptitude practice', re: /aptitude|\bquant|indiabix|reasoning/i },
        { label: 'DSA and coding practice', re: /\bdsa\b|leetcode|data structures?|algorithms?|\bcoding\b/i },
        { label: 'Core CS subjects', re: /\bdbms\b|operating systems?|\boops?\b|computer networks?/i },
        { label: 'SQL practice', re: /\bsql\b/i },
        { label: 'Research the company', re: new RegExp(`about (the company|${escapeRe(company)})|research (the|about the) company`, 'i') },
        { label: 'Prepare a self-introduction', re: /self[- ]?intro|introduce yourself/i },
        { label: 'Stay calm', re: /\bcalm\b|nervous|\brelax/i },
        { label: 'Have questions ready for the panel', re: /ask (them|questions|a question|the panel)|questions to ask/i },
    ];
}

// ── The guide ─────────────────────────────────────────────────────────────

export interface Guide {
    n: number;
    batchRange: string | null;
    pay: Array<{ basis: 'stipend' | 'ctc'; label: string; shared: number; total: number }>;
    sequence: { label: string; count: number } | null;
    steps: Array<{ kind: RoundKind; label: string; count: number }>;
    interviewTypes: Array<{ label: string; count: number }>;
    interviewRounds: number;
    duration: { label: string; reports: number } | null;
    cgpa: { value: number; count: number; specified: number } | null;
    cgpaReports: number;
    testTopics: Array<{ label: string; count: number }>;
    testComponents: Array<{ label: string; count: number }>;
    questions: { total: number; groups: QuestionGroup[] };
    themes: Array<{ label: string; count: number }>;
    quote: { text: string; id: string; name: string; role: string; batch?: string } | null;
    timeline: Array<{ batch: string; roles: Array<{ role: string; count: number }>; pay: string | null }>;
    headline: string | null;
}

const INTERVIEW_TYPE_LABEL: Record<string, string> = {
    technical: 'Technical',
    hr: 'HR',
    mixed: 'Mixed',
    managerial: 'Managerial',
};

export function buildGuide(exps: GuideExperience[], company: string): Guide {
    const n = exps.length;
    const roleOf = canonicalRoles(exps.map((e) => e.role ?? ''));
    const nameOf = (e: GuideExperience) => e.studentName?.trim() || 'Anonymous';

    // Batches
    const batches = [...new Set(exps.map((e) => e.batch).filter((b): b is string => !!b))].sort((a, b) => batchNum(a) - batchNum(b));
    const batchRange = batches.length === 0 ? null : batches.length === 1 ? batches[0] : `${batches[0]} to ${batches[batches.length - 1]}`;

    // Pay, split by basis: monthly stipend for internships, LPA for full-time
    const pay: Guide['pay'] = [];
    for (const basis of ['stipend', 'ctc'] as const) {
        const group = exps.filter((e) => isInternship(e.roleType) === (basis === 'stipend'));
        if (group.length === 0) continue;
        const values = group.map((e) => e.ctc ?? 0).filter((v) => v > 0);
        // One figure is one person's offer, not a pattern: a range needs 2+ reports
        const label = values.length >= MIN_EVIDENCE ? rangeLabel(values, basis === 'stipend') : values.length === 1 ? 'Only 1 shared' : 'Not shared';
        pay.push({ basis, label, shared: values.length, total: group.length });
    }
    pay.sort((a, b) => b.total - a.total);

    // Process: the most common sequence of round kinds, and how often each kind appears
    const seqTally = new Map<string, number>();
    const kindCount = new Map<RoundKind, { count: number; pos: number }>();
    const interviewTypeCount = new Map<string, number>();
    const interviewRoundCounts: number[] = [];
    const durations: number[] = [];
    for (const e of exps) {
        const kinds = roundsOf(e).map(roundKind);
        const collapsed = kinds.filter((k, i) => k !== kinds[i - 1]);
        if (collapsed.length) seqTally.set(collapsed.join('>'), (seqTally.get(collapsed.join('>')) ?? 0) + 1);
        collapsed.forEach((k, i) => {
            if (collapsed.indexOf(k) !== i) return;
            const entry = kindCount.get(k) ?? { count: 0, pos: 0 };
            entry.count++;
            entry.pos += i;
            kindCount.set(k, entry);
        });
        const interviews = roundsOf(e).filter((r) => roundKind(r) === 'interview');
        if (interviews.length) interviewRoundCounts.push(interviews.length);
        for (const t of new Set(interviews.map((r) => r.interviewType || 'technical'))) {
            interviewTypeCount.set(t, (interviewTypeCount.get(t) ?? 0) + 1);
        }
        for (const r of interviews) {
            const m = parseMinutes(r.duration);
            if (m !== null) durations.push(m);
        }
    }
    const topSeq = [...seqTally].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)[0];
    const sequence = topSeq
        ? { label: topSeq[0].split('>').map((k) => KIND_LABEL[k as RoundKind]).join(' → '), count: topSeq[1] }
        : null;
    const steps = [...kindCount]
        .map(([kind, v]) => ({ kind, label: KIND_LABEL[kind], count: v.count, avgPos: v.pos / v.count }))
        .sort((a, b) => a.avgPos - b.avgPos || b.count - a.count)
        .map(({ kind, label, count }) => ({ kind, label, count }));
    const interviewTypes = [...interviewTypeCount]
        .map(([t, count]) => ({ label: INTERVIEW_TYPE_LABEL[t] ?? titleCase(t), count }))
        .sort((a, b) => b.count - a.count);
    const durationText = durationLabel(durations);

    // CGPA: 0 means "not given", so only real cutoffs count
    const cgpas = exps.map((e) => e.minCGPA ?? 0).filter((v) => v > 0);
    let cgpa: Guide['cgpa'] = null;
    if (cgpas.length >= MIN_EVIDENCE) {
        const tally = new Map<number, number>();
        cgpas.forEach((v) => tally.set(v, (tally.get(v) ?? 0) + 1));
        const [value, count] = [...tally].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
        cgpa = { value, count, specified: cgpas.length };
    }

    // Online test: topics named by 2+ students, and recurring components
    const testExps = exps.filter((e) => roundsOf(e).some((r) => roundKind(r) === 'test'));
    const topicTally = new Map<string, number>();
    for (const e of testExps) {
        const labels = new Set(roundsOf(e).filter((r) => roundKind(r) === 'test').flatMap((r) => topicLabels(r.topics)));
        labels.forEach((l) => topicTally.set(l, (topicTally.get(l) ?? 0) + 1));
    }
    const testTopics = [...topicTally]
        .filter(([, count]) => count >= MIN_EVIDENCE)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 6)
        .map(([label, count]) => ({ label, count }));
    const testComponents = testExps.length
        ? COMPONENTS.map(({ label, re }) => ({
              label,
              count: exps.filter((e) => {
                  const testText = roundsOf(e).filter((r) => roundKind(r) === 'test').map((r) => [r.topics, r.notes, r.description].flat().join(' ')).join(' ');
                  return re.test(`${testText} ${e.tipsForJuniors ?? ''} ${e.overallExperience ?? ''}`);
              }).length,
          }))
              .filter((c) => c.count >= MIN_EVIDENCE)
              .sort((a, b) => b.count - a.count)
              .slice(0, 2)
        : [];

    // Question bank: identical questions (after normalising) grouped, most-asked first
    const groups = new Map<string, QuestionGroup>();
    let total = 0;
    for (const e of exps) {
        for (const r of roundsOf(e)) {
            for (const { question, answerTip } of questionsOf(r)) {
                total++;
                const key = normalizeQuestion(question);
                if (!key) continue;
                const alias = ALIASES.find(([, k]) => k === key);
                const g = groups.get(key) ?? { text: alias?.[2] ?? question.trim(), kind: roundKind(r), students: [], tips: [] };
                if (!g.students.some((s) => s.id === e.id)) g.students.push({ id: e.id, name: nameOf(e), batch: e.batch });
                if (answerTip.trim() && !g.tips.includes(answerTip.trim())) g.tips.push(answerTip.trim());
                groups.set(key, g);
            }
        }
    }
    const questionGroups = [...groups.values()].sort((a, b) => b.students.length - a.students.length || b.tips.length - a.tips.length);

    // Advice themes mentioned in 2+ write-ups
    const themeDefs = themesFor(company);
    const adviceText = (e: GuideExperience) => `${e.tipsForJuniors ?? ''} ${e.overallExperience ?? ''}`;
    const themes = themeDefs
        .map(({ label, re }) => ({ label, count: exps.filter((e) => re.test(adviceText(e))).length }))
        .filter((t) => t.count >= MIN_EVIDENCE)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    // Pull quote: a short sentence of real advice touching the most themes
    const topThemes = themeDefs.filter((d) => themes.some((t) => t.label === d.label));
    let quote: Guide['quote'] = null;
    let best = { score: 0, batch: -1, len: Infinity };
    for (const e of exps) {
        for (const raw of String(e.tipsForJuniors ?? '').split(/(?<=[.!?])\s+|\n+/)) {
            const text = raw.replace(/^[\s●•*-]+/, '').trim();
            if (text.length < 40 || text.length > 170) continue;
            const score = topThemes.filter((d) => d.re.test(text)).length;
            const b = batchNum(e.batch);
            if (score > best.score || (score === best.score && score > 0 && (b > best.batch || (b === best.batch && text.length < best.len)))) {
                best = { score, batch: b, len: text.length };
                quote = { text, id: e.id, name: nameOf(e), role: roleOf.get(e.role) ?? e.role, batch: e.batch };
            }
        }
    }

    // How it has changed, batch by batch (needs 2+ batches to say anything)
    const mainBasis = pay[0]?.basis ?? 'stipend';
    const timeline: Guide['timeline'] = [];
    const paid: Array<{ batch: string; median: number; label: string }> = [];
    const staffed: Array<{ batch: string; role: string }> = [];
    if (batches.length >= 2) {
        for (const batch of batches) {
            const inBatch = exps.filter((e) => e.batch === batch);
            const roleTally = new Map<string, number>();
            inBatch.forEach((e) => {
                const r = roleOf.get(e.role) ?? e.role;
                roleTally.set(r, (roleTally.get(r) ?? 0) + 1);
            });
            const roles = [...roleTally].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 2).map(([role, count]) => ({ role, count }));
            const values = inBatch.filter((e) => isInternship(e.roleType) === (mainBasis === 'stipend')).map((e) => e.ctc ?? 0).filter((v) => v > 0);
            const label = values.length ? rangeLabel(values, mainBasis === 'stipend') : null;
            if (values.length >= MIN_EVIDENCE) paid.push({ batch, median: median(values), label: label! });
            if (inBatch.length >= MIN_EVIDENCE && roles[0]) staffed.push({ batch, role: roles[0].role });
            timeline.push({ batch, roles, pay: label });
        }
    }
    // Each claim compares only batches with 2+ reports, and quotes what students actually reported
    const parts: string[] = [];
    if (staffed.length >= 2) {
        const [from, to] = [staffed[0], staffed[staffed.length - 1]];
        if (from.role !== to.role) parts.push(`roles moved from ${from.role} (${from.batch}) to ${to.role} (${to.batch})`);
    }
    if (paid.length >= 2) {
        const [first, last] = [paid[0], paid[paid.length - 1]];
        const word = mainBasis === 'stipend' ? 'the stipend' : 'the CTC';
        if (last.median > first.median) parts.push(`${word} rose from ${first.label} (${first.batch}) to ${last.label} (${last.batch})`);
        if (last.median < first.median) parts.push(`${word} fell from ${first.label} (${first.batch}) to ${last.label} (${last.batch})`);
    }
    const headline = parts.length ? `${parts.join(', and ')}.`.replace(/^./, (c) => c.toUpperCase()) : null;

    return {
        n,
        batchRange,
        pay,
        sequence,
        steps,
        interviewTypes,
        interviewRounds: interviewRoundCounts.length ? Math.round(median(interviewRoundCounts)) : 0,
        duration: durationText ? { label: durationText, reports: durations.length } : null,
        cgpa,
        cgpaReports: cgpas.length,
        testTopics,
        testComponents,
        questions: { total, groups: questionGroups },
        themes,
        quote,
        timeline,
        headline,
    };
}
