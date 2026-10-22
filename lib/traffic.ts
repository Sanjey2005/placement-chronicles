// Visitor analytics helpers shared by the /api/pv beacon, /admin/analytics and
// scripts/traffic.test.mjs. Ported from Stotradhwani's src/lib/analytics.ts.
// Pure, no imports: safe in client components and loadable straight into Node.

export type Bucket = 'hour' | 'day' | 'month';
export type RangeKey = 'today' | '7d' | '30d' | '90d' | '12m';

export const RANGES: Record<RangeKey, { label: string; days: number; bucket: Bucket }> = {
    today: { label: 'Today', days: 1, bucket: 'hour' },
    '7d': { label: '7 days', days: 7, bucket: 'day' },
    '30d': { label: '30 days', days: 30, bucket: 'day' },
    '90d': { label: '90 days', days: 90, bucket: 'day' },
    '12m': { label: '12 months', days: 365, bucket: 'month' },
};

export function isRangeKey(value: unknown): value is RangeKey {
    return typeof value === 'string' && (Object.keys(RANGES) as string[]).includes(value);
}

const DAY_MS = 86_400_000;
const istDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' });

/** "YYYY-MM-DD" of a moment in IST. */
export const istDateKey = (date: Date) => istDate.format(date);

/** The instant an IST day starts. */
export const istMidnight = (dateKey: string) => new Date(`${dateKey}T00:00:00+05:30`);

/**
 * A range's window, starting on an IST day (or month) boundary so the first chart
 * bar is whole, plus the same window shifted back by the range for % change.
 * ponytail: no 12-month comparison, because the year before it has expired (13-month retention).
 */
export function rangeWindow(key: RangeKey, now = new Date()) {
    const { days, bucket } = RANGES[key];
    const today = istDateKey(now);

    let from: Date;
    if (bucket === 'month') {
        const [year, month] = today.split('-').map(Number);
        const firstOfMonth = new Date(Date.UTC(year, month - 12, 1)); // 11 months back; Date.UTC wraps the year
        from = istMidnight(firstOfMonth.toISOString().slice(0, 10));
    } else {
        from = new Date(istMidnight(today).getTime() - (days - 1) * DAY_MS); // IST has no DST
    }

    const shift = days * DAY_MS;
    const prev = bucket === 'month' ? null : { from: new Date(from.getTime() - shift), to: new Date(now.getTime() - shift) };
    return { from, to: now, prev };
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Every bucket key ("YYYY-MM-DDTHH:MM", IST, the shape the Mongo pipeline emits)
 * from `from` to `to`, so empty hours/days/months still get a bar.
 */
export function bucketKeys(from: Date, to: Date, bucket: Bucket): string[] {
    const keys: string[] = [];
    if (bucket === 'hour') {
        // IST is a fixed +05:30, so stepping whole hours from an IST hour boundary stays on boundaries.
        const ist = (d: Date) => new Date(d.getTime() + 330 * 60_000);
        const start = ist(from);
        start.setUTCMinutes(0, 0, 0);
        for (let t = start.getTime(); t <= ist(to).getTime(); t += 3_600_000) {
            const d = new Date(t);
            keys.push(`${d.toISOString().slice(0, 13)}:00`);
        }
        return keys;
    }
    if (bucket === 'day') {
        for (let day = istDateKey(from); day <= istDateKey(to); day = istDateKey(new Date(istMidnight(day).getTime() + DAY_MS + 3_600_000))) {
            keys.push(`${day}T00:00`);
        }
        return keys;
    }
    let [year, month] = istDateKey(from).split('-').map(Number);
    const last = istDateKey(to).slice(0, 7);
    while (`${year}-${pad(month)}` <= last) {
        keys.push(`${year}-${pad(month)}-01T00:00`);
        if (month === 12) {
            year++;
            month = 1;
        } else {
            month++;
        }
    }
    return keys;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Label for a bucket key like "2026-10-06T14:00" (already IST). */
export function bucketLabel(t: string, bucket: Bucket): string {
    const [date, time = '00:00'] = t.split('T');
    const [year, month, day] = date.split('-').map(Number);
    if (bucket === 'hour') {
        const hour = Number(time.slice(0, 2));
        return `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`;
    }
    if (bucket === 'month') return `${MONTHS[month - 1]} ${year}`;
    return `${day} ${MONTHS[month - 1]}`;
}

// First match wins, so the specific Google products sit above Google itself.
const SOURCE_RULES: [RegExp, string][] = [
    [/^gemini\.google\./, 'Gemini'],
    [/^mail\.google\.|^com\.google\.android\.gm$/, 'Gmail'],
    [/(^|\.)(youtube\.com|youtu\.be)$|^com\.google\.android\.youtube$/, 'YouTube'],
    // Search only: Meet, Docs, Classroom etc. keep their own hostnames.
    [/^google\.[a-z.]+$|^com\.google\.android\.googlequicksearchbox$/, 'Google'],
    [/(^|\.)bing\.com$/, 'Bing'],
    [/(^|\.)duckduckgo\.com$/, 'DuckDuckGo'],
    [/(^|\.)(facebook\.com|fb\.com)$|^com\.facebook\.(katana|lite|orca)$/, 'Facebook'],
    [/(^|\.)instagram\.com$|^com\.instagram\.android$/, 'Instagram'],
    [/(^|\.)(whatsapp\.com|wa\.me)$|^l\.wl\.co$|^com\.whatsapp(\.w4b)?$/, 'WhatsApp'],
    [/^(t\.co|(mobile\.)?x\.com|(mobile\.)?twitter\.com|com\.twitter\.android)$/, 'X'],
    [/^t\.me$|(^|\.)telegram\.org$|^org\.telegram\.messenger$/, 'Telegram'],
    [/(^|\.)linkedin\.com$|^lnkd\.in$|^com\.linkedin\.android$/, 'LinkedIn'],
    [/(^|\.)reddit\.com$|^com\.reddit\.frontpage$/, 'Reddit'],
    [/^ecampus\.psgtech\.ac\.in$/, 'eCampus'],
    [/^(chatgpt\.com|chat\.openai\.com)$/, 'ChatGPT'],
    [/^claude\.ai$/, 'Claude'],
];

const UTM_NAMES: Record<string, string> = {
    google: 'Google',
    whatsapp: 'WhatsApp',
    wa: 'WhatsApp',
    instagram: 'Instagram',
    ig: 'Instagram',
    linkedin: 'LinkedIn',
    telegram: 'Telegram',
    email: 'Email',
};

const bareHost = (host: string) => host.toLowerCase().replace(/^www\./, '');

function hostOf(url: string): string {
    try {
        return bareHost(new URL(url).hostname);
    } catch {
        return '';
    }
}

/** Where a view came from. `ref` is undefined for in-site navigation, which is not an arrival. */
export function classifySource(
    ref: string | undefined,
    utmSource: string | null,
    ownHost: string
): { source: string | null; referrer: string | null } {
    if (ref === undefined) return { source: null, referrer: null };
    const host = hostOf(ref);
    const internal = host !== '' && host === bareHost(ownHost);
    const referrer = host && !internal ? host : null;

    const utm = utmSource?.trim().slice(0, 100);
    if (utm) return { source: UTM_NAMES[utm.toLowerCase()] ?? utm, referrer };
    if (internal) return { source: null, referrer: null };
    if (!host) return { source: 'Direct', referrer: null };
    return { source: SOURCE_RULES.find(([re]) => re.test(host))?.[1] ?? host, referrer };
}

// UAs contain each other's tokens (Edge says Chrome, Chrome says Safari), so order matters.
const BROWSER_RULES: [RegExp, string][] = [
    [/FBAN|FBAV|FB_IAB/, 'Facebook app'],
    [/Instagram/, 'Instagram app'],
    [/Edg(e|A|iOS)?\//, 'Edge'],
    [/OPR\/|Opera/, 'Opera'],
    [/SamsungBrowser/, 'Samsung Internet'],
    [/CriOS|Chrome\//, 'Chrome'],
    [/FxiOS|Firefox\//, 'Firefox'],
    [/Safari\//, 'Safari'],
];

const OS_RULES: [RegExp, string][] = [
    [/Windows/, 'Windows'],
    [/iPhone|iPad|iPod/, 'iOS'], // iOS UAs also say "like Mac OS X"
    [/Android/, 'Android'], // Android UAs also say "Linux"
    [/CrOS/, 'ChromeOS'],
    [/Macintosh|Mac OS X/, 'macOS'],
    [/Linux/, 'Linux'],
];

const firstMatch = (rules: [RegExp, string][], ua: string) => rules.find(([re]) => re.test(ua))?.[1] ?? 'Other';

export function parseUserAgent(ua: string): { browser: string; os: string } {
    return { browser: firstMatch(BROWSER_RULES, ua), os: firstMatch(OS_RULES, ua) };
}

// Crawlers that run JS would otherwise reach the beacon. (?<!cu): "CUBOT" is a phone brand.
const BOT_RE = /(?<!cu)bot|crawl|spider|slurp|headless|lighthouse|pagespeed|inspectiontool|googleother|preview|externalhit|python|curl|wget|httpclient/i;

export const isBot = (ua: string) => !ua || BOT_RE.test(ua);

/** Screen width, not UA: iPads send a desktop UA. */
export function deviceFromWidth(width: unknown): string | null {
    if (typeof width !== 'number' || !Number.isFinite(width) || width <= 0) return null;
    return width < 768 ? 'Mobile' : width < 1024 ? 'Tablet' : 'Desktop';
}

/** Regional-indicator flag emoji (Windows shows the two letters instead). */
export function flag(code: string | null | undefined): string {
    return code && /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : '🌐';
}

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

export function countryName(code: string | null | undefined): string {
    if (!code) return 'Unknown';
    try {
        return regionNames.of(code) ?? code;
    } catch {
        return code;
    }
}

export const countryLabel = (code: string | null | undefined) => `${flag(code)} ${countryName(code)}`;

export function formatDuration(seconds: number): string {
    const s = Math.round(seconds);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ${pad(s % 60)}s`;
    return `${Math.floor(m / 60)}h ${pad(m % 60)}m`;
}

/** Count of each value, biggest first: the live panel's tally of who is on which page. */
export function countRows(values: (string | null)[], limit = 10): Row[] {
    const counts = new Map<string | null, number>();
    for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
    return [...counts]
        .map(([name, visitors]) => ({ name, visitors }))
        .sort((a, b) => b.visitors - a.visitors || String(a.name).localeCompare(String(b.name)))
        .slice(0, limit);
}

/** Page paths as people know them. */
const PAGE_NAMES: Record<string, string> = {
    '/': 'Home feed',
    '/chat': 'Chat assistant',
    '/share-experience': 'Share experience',
    '/about': 'About',
    '/login': 'Login',
};

export const pageLabel = (path: string | null) => (path ? PAGE_NAMES[path] ?? path : 'Unknown');

/** Plain-English explanations behind each ⓘ on /admin/analytics. */
export const TRAFFIC_HELP = {
    range: 'Pick the period to look at. The small ▲ / ▼ numbers compare it with the same length of time just before: for “7 days”, the 7 days before that. “12 months” has no comparison.',
    visitors: 'Students who used the site. Each student counts once per day, even across phone and laptop, so someone who comes back tomorrow counts again. Admin visits and the login page aren’t counted.',
    pageviews: 'Every page opened on the site, including several pages opened by the same student.',
    bounce: 'The share of visits where a student opened just one page and left. Reading experiences happens inside the home page, so a long read there still counts as one page.',
    duration: 'How long a visit lasts on average, from the first page until the student leaves or closes the tab.',
    chart: 'Visitors per hour (Today), per day, or per month (12 months). Hover over or tap a bar to see the exact numbers.',
    live: 'Students who have the site open right now (anyone active in the last 5 minutes).',
    pages: 'The pages students looked at most. Each student is counted once per page.',
    sources: 'Where students came from: WhatsApp, Google, eCampus and so on. “Direct” means the source is unknown: they typed the address, used a bookmark, or tapped a link inside an app like WhatsApp, which hides where links come from. Tip: add ?utm_source=whatsapp to links you share to see them separately.',
    location: 'Worked out from the internet connection, so it’s approximate. Campus Wi-Fi and mobile data often show the provider’s city rather than the student’s.',
    devices: 'Phone, tablet or computer, judged by screen size.',
    browsers: 'The app students used to open the site, such as Chrome or Safari. “Instagram app” means a link opened inside Instagram.',
    os: 'The system on their phone or computer: Android, iOS (iPhone / iPad), Windows or macOS.',
    landing: 'The first page students see when they arrive on the site.',
    campaigns: 'Visits from links you tagged yourself, like placement-chronicles.vercel.app/?utm_source=whatsapp&utm_campaign=batch2027. Tag the links you share to see which ones bring students in.',
} as const;

// Shapes returned by lib/traffic-queries.ts.
export interface Totals {
    visitors: number;
    pageviews: number;
    sessions: number;
    bounce_rate: number;
    avg_duration_s: number;
}

export interface SeriesPoint {
    t: string;
    visitors: number;
    pageviews: number;
}

export interface Row {
    name: string | null;
    visitors: number;
    pageviews?: number;
    region?: string | null;
    country?: string | null;
}

export interface Summary {
    totals: Totals;
    series: SeriesPoint[];
    pages: Row[];
    entry_pages: Row[];
    sources: Row[];
    countries: Row[];
    cities: Row[];
    devices: Row[];
    browsers: Row[];
    os: Row[];
    campaigns: Row[];
}

export interface Live {
    live: number;
    today_visitors: number;
    today_pageviews: number;
    pages: Row[];
    cities: Row[];
}
