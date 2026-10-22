// Pure helpers for /admin/analytics: row shape, tallies and chart math. No imports,
// so scripts/analytics.test.mjs can load it straight into Node like lib/rounds.ts.

/** One approved, visible experience, slimmed to what the analytics page reads. */
export interface AnalyticsRow {
    company: string;
    role: string;
    ctc?: number;
    roleType?: string;
    placementType?: string;
    workModel?: string;
    batch?: string;
    courseBranch?: string;
    minCGPA?: number;
    roundCount: number;
    finalVerdict?: string;
    createdAt: Date;
}

export interface Item {
    name: string;
    value: number;
}

/** Experiences shared in one IST month; `t` is "YYYY-MM". */
export interface SeriesPoint {
    t: string;
    count: number;
}

export interface Breakdowns {
    series: SeriesPoint[];
    companies: Item[];
    roles: Item[];
    branches: Item[];
    batches: Item[];
    roleTypes: Item[];
    placementTypes: Item[];
    workModels: Item[];
    rounds: Item[];
    cgpa: Item[];
}

const LABELS: Record<string, string> = {
    FULL_TIME: 'Full-time',
    INTERNSHIP: 'Internship',
    SUMMER_INTERNSHIP: 'Summer internship',
    ON_CAMPUS: 'On campus',
    OFF_CAMPUS: 'Off campus',
    ON_SITE: 'On site',
    WFH: 'Work from home',
    HYBRID: 'Hybrid',
};

const label = (value?: string) => (value ? LABELS[value] ?? value : undefined);

/** Rows per key, biggest first; `limit` keeps free-text lists (companies, roles) to a top-N. */
function tally(rows: AnalyticsRow[], key: (row: AnalyticsRow) => string | undefined, limit = Infinity): Item[] {
    const counts = new Map<string, number>();
    for (const row of rows) {
        const name = key(row)?.trim(); // six stored roles end in a space and would double up
        if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return [...counts]
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
        .slice(0, limit);
}

/** Same items ordered by name with numeric collation, so "2 rounds" sits before "10 rounds". */
const byName = (items: Item[]) =>
    [...items].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

const monthFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit' });

/** "YYYY-MM" of a date in IST, so a late-night submission lands on the right month. */
export const monthKey = (date: Date) => monthFormat.format(date);

/** Every "YYYY-MM" from `from` to `to`, inclusive; empty when `from` is later. */
export function monthsBetween(from: string, to: string): string[] {
    const [toYear, toMonth] = to.split('-').map(Number);
    let [year, month] = from.split('-').map(Number);
    const months: string[] = [];
    while (year < toYear || (year === toYear && month <= toMonth)) {
        months.push(`${year}-${String(month).padStart(2, '0')}`);
        if (month === 12) {
            year++;
            month = 1;
        } else {
            month++;
        }
    }
    return months;
}

/** Chart series and every bar list on the page, from the rows already filtered to a batch. */
export function breakdowns(rows: AnalyticsRow[], now = new Date()): Breakdowns {
    const perMonth = new Map(tally(rows, (row) => monthKey(row.createdAt)).map((item) => [item.name, item.value]));
    const first = [...perMonth.keys()].sort()[0];
    // ponytail: zero-filled from the first experience to now; cap the span if the site lives long enough for the bars to get thin.
    const series = first ? monthsBetween(first, monthKey(now)).map((t) => ({ t, count: perMonth.get(t) ?? 0 })) : [];

    return {
        series,
        companies: tally(rows, (row) => row.company, 10),
        roles: tally(rows, (row) => row.role, 10),
        branches: tally(rows, (row) => row.courseBranch, 10),
        batches: byName(tally(rows, (row) => row.batch)),
        roleTypes: tally(rows, (row) => label(row.roleType)),
        placementTypes: tally(rows, (row) => label(row.placementType)),
        workModels: tally(rows, (row) => label(row.workModel)),
        rounds: byName(tally(rows, (row) => (row.roundCount > 0 ? `${row.roundCount} round${row.roundCount === 1 ? '' : 's'}` : undefined))),
        cgpa: byName(tally(rows, (row) => (row.minCGPA ? String(row.minCGPA) : 'Not given'))),
    };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Feb 2026" for a series key. */
export function monthLabel(t: string): string {
    const [year, month] = t.split('-').map(Number);
    return `${MONTHS[month - 1]} ${year}`;
}

/** Smallest "round" even number ≥ value (…, 100, 120, 160, 200, 240, 300, …), so the axis half-line is whole. */
export function niceMax(value: number): number {
    if (value <= 2) return 2;
    const pow = 10 ** Math.floor(Math.log10(value));
    const nice = [1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10]
        .map((m) => Math.round(m * pow))
        .find((n) => n >= value && n % 2 === 0);
    return nice ?? 10 * pow;
}

/** Plain-English explanations behind each ⓘ on /admin/analytics. */
export const ANALYTICS_HELP = {
    batch: 'Pick a graduating batch to look at. The small ▲ / ▼ numbers compare it with the batch before it. “All batches” has no comparison.',
    experiences: 'Approved experiences students have shared. Pending, flagged and rejected entries, and hidden companies, are left out, exactly as on the home feed.',
    companies: 'How many different companies those experiences cover.',
    package: 'Average compensation in LPA. Internship stipends are converted to a yearly figure (× 12). Entries that chose “Prefer not to say” are skipped.',
    selection: 'Share of shared experiences that ended in an offer. Students mostly write about the ones they got, so expect this to run high.',
    chart: 'Experiences shared per month, by the date they were submitted. Hover over or tap a bar for the exact number.',
    topCompanies: 'Companies with the most shared experiences.',
    roles: 'Job titles as students typed them, so the same role can appear under two spellings.',
    branches: 'The course or branch of the student who shared the experience.',
    batches: 'Graduating batch of the student who shared the experience.',
    roleType: 'Full-time offers versus internships.',
    placementType: 'Whether the student went through campus placements or applied on their own.',
    workModel: 'Where the job is done: on site, from home, or a mix.',
    rounds: 'How many rounds the process had, from the first test to the final interview.',
    cgpa: 'The minimum CGPA the company asked for, as students reported it. “Not given” means they left it blank or there was no cutoff.',
} as const;
