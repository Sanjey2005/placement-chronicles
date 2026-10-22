import type { PipelineStage } from 'mongoose';
import dbConnect from '@/lib/db';
import PageView from '@/models/PageView';
import { bucketKeys, countRows, istDateKey, istMidnight, type Bucket, type Live, type Row, type SeriesPoint, type Summary, type Totals } from '@/lib/traffic';

// MongoDB versions of Stotradhwani's analytics_totals / analytics_summary /
// analytics_live Postgres functions (supabase/migrations/add_page_views.sql there).

const TZ = 'Asia/Kolkata';
const SESSION_GAP_MS = 30 * 60_000;
const LIVE_MS = 5 * 60_000;
const LIMIT = 20;

const EMPTY_TOTALS: Totals = { visitors: 0, pageviews: 0, sessions: 0, bounce_rate: 0, avg_duration_s: 0 };

/**
 * Headline numbers for a window. A session is one visitor's views with gaps under
 * 30 minutes; a bounce is a one-view session; duration runs from the first view
 * to the last heartbeat.
 */
export async function trafficTotals(from: Date, to: Date): Promise<Totals> {
    await dbConnect();
    const [totals] = await PageView.aggregate<Totals>([
        { $match: { createdAt: { $gte: from, $lt: to } } },
        {
            $setWindowFields: {
                partitionBy: '$visitorId',
                sortBy: { createdAt: 1 },
                output: { prevSeen: { $shift: { output: '$lastSeenAt', by: -1, default: null } } },
            },
        },
        {
            $set: {
                starts: {
                    $cond: [{ $or: [{ $eq: ['$prevSeen', null] }, { $gt: [{ $subtract: ['$createdAt', '$prevSeen'] }, SESSION_GAP_MS] }] }, 1, 0],
                },
            },
        },
        {
            $setWindowFields: {
                partitionBy: '$visitorId',
                sortBy: { createdAt: 1 },
                output: { sessionNo: { $sum: '$starts', window: { documents: ['unbounded', 'current'] } } },
            },
        },
        // One row per session, then per visitor, then the whole window.
        { $group: { _id: { v: '$visitorId', s: '$sessionNo' }, views: { $sum: 1 }, first: { $min: '$createdAt' }, last: { $max: '$lastSeenAt' } } },
        {
            $group: {
                _id: '$_id.v',
                views: { $sum: '$views' },
                sessions: { $sum: 1 },
                bounces: { $sum: { $cond: [{ $eq: ['$views', 1] }, 1, 0] } },
                durationMs: { $sum: { $subtract: ['$last', '$first'] } },
            },
        },
        {
            $group: {
                _id: null,
                visitors: { $sum: 1 },
                pageviews: { $sum: '$views' },
                sessions: { $sum: '$sessions' },
                bounces: { $sum: '$bounces' },
                durationMs: { $sum: '$durationMs' },
            },
        },
        {
            $project: {
                _id: 0,
                visitors: 1,
                pageviews: 1,
                sessions: 1,
                bounce_rate: { $round: [{ $multiply: [{ $divide: ['$bounces', '$sessions'] }, 100] }, 0] },
                avg_duration_s: { $round: [{ $divide: ['$durationMs', { $multiply: ['$sessions', 1000] }] }, 0] },
            },
        },
    ]);
    return totals ?? EMPTY_TOTALS;
}

/** Distinct visitors (and views) per value of `key`, biggest first. */
function breakdown(key: unknown, match?: Record<string, unknown>): PipelineStage.FacetPipelineStage[] {
    return [
        ...(match ? [{ $match: match }] : []),
        { $group: { _id: { k: key, v: '$visitorId' }, views: { $sum: 1 } } },
        { $group: { _id: '$_id.k', visitors: { $sum: 1 }, pageviews: { $sum: '$views' } } },
        { $sort: { visitors: -1, pageviews: -1, _id: 1 } },
        { $limit: LIMIT },
        { $project: { _id: 0, name: '$_id', visitors: 1, pageviews: 1 } },
    ];
}

const orUnknown = (field: string) => ({ $ifNull: [field, 'Unknown'] });

// "source / medium / campaign", skipping the parts that are missing.
const campaignName = {
    $reduce: {
        input: { $filter: { input: ['$utmSource', '$utmMedium', '$utmCampaign'], cond: { $ne: ['$$this', null] } } },
        initialValue: '',
        in: { $cond: [{ $eq: ['$$value', ''] }, '$$this', { $concat: ['$$value', ' / ', '$$this'] }] },
    },
};

type Facets = Omit<Summary, 'totals' | 'series'> & { series: SeriesPoint[] };

/** Everything /admin/analytics shows for a window. */
export async function trafficSummary(from: Date, to: Date, bucket: Bucket): Promise<Summary> {
    await dbConnect();
    const [totals, [facets]] = await Promise.all([
        trafficTotals(from, to),
        PageView.aggregate<Facets>([
            { $match: { createdAt: { $gte: from, $lt: to } } },
            {
                $facet: {
                    series: [
                        {
                            $group: {
                                _id: {
                                    t: {
                                        $dateToString: {
                                            date: { $dateTrunc: { date: '$createdAt', unit: bucket, timezone: TZ } },
                                            format: '%Y-%m-%dT%H:%M',
                                            timezone: TZ,
                                        },
                                    },
                                    v: '$visitorId',
                                },
                                views: { $sum: 1 },
                            },
                        },
                        { $group: { _id: '$_id.t', visitors: { $sum: 1 }, pageviews: { $sum: '$views' } } },
                        { $project: { _id: 0, t: '$_id', visitors: 1, pageviews: 1 } },
                    ],
                    pages: breakdown('$path'),
                    // Entry views (source not null) are arrivals from outside the site.
                    entry_pages: breakdown('$path', { source: { $ne: null } }),
                    sources: breakdown('$source', { source: { $ne: null } }),
                    countries: breakdown('$country'),
                    cities: [
                        { $group: { _id: { k: { c: orUnknown('$city'), r: '$region', n: '$country' }, v: '$visitorId' } } },
                        { $group: { _id: '$_id.k', visitors: { $sum: 1 } } },
                        { $sort: { visitors: -1, '_id.c': 1 } },
                        { $limit: LIMIT },
                        { $project: { _id: 0, name: '$_id.c', region: '$_id.r', country: '$_id.n', visitors: 1 } },
                    ],
                    devices: breakdown(orUnknown('$device')),
                    browsers: breakdown(orUnknown('$browser')),
                    os: breakdown(orUnknown('$os')),
                    campaigns: breakdown(campaignName, {
                        $or: [{ utmSource: { $ne: null } }, { utmMedium: { $ne: null } }, { utmCampaign: { $ne: null } }],
                    }),
                },
            },
        ]),
    ]);

    // Zero-fill so quiet hours, days and months still get a (flat) bar.
    const byKey = new Map(facets.series.map((point) => [point.t, point]));
    const series = bucketKeys(from, to, bucket).map((t) => byKey.get(t) ?? { t, visitors: 0, pageviews: 0 });
    return { ...facets, totals, series };
}

/** Who is on the site right now (heartbeat within 5 minutes) and today's totals (IST). */
export async function trafficLive(): Promise<Live> {
    await dbConnect();
    const liveSince = new Date(Date.now() - LIVE_MS);
    const todayStart = istMidnight(istDateKey(new Date()));
    const [result] = await PageView.aggregate<{
        latest: { path: string; city: string | null }[];
        today: { visitors: number; pageviews: number }[];
    }>([
        { $match: { $or: [{ lastSeenAt: { $gt: liveSince } }, { createdAt: { $gte: todayStart } }] } },
        {
            $facet: {
                // Each live visitor's most recent page.
                latest: [
                    { $match: { lastSeenAt: { $gt: liveSince } } },
                    { $sort: { lastSeenAt: -1 } },
                    { $group: { _id: '$visitorId', path: { $first: '$path' }, city: { $first: '$city' } } },
                ],
                today: [
                    { $match: { createdAt: { $gte: todayStart } } },
                    { $group: { _id: '$visitorId', views: { $sum: 1 } } },
                    { $group: { _id: null, visitors: { $sum: 1 }, pageviews: { $sum: '$views' } } },
                ],
            },
        },
    ]);

    const latest = result?.latest ?? [];
    const today = result?.today[0];
    const pages: Row[] = countRows(latest.map((view) => view.path));
    const cities: Row[] = countRows(latest.map((view) => view.city));
    return { live: latest.length, today_visitors: today?.visitors ?? 0, today_pageviews: today?.pageviews ?? 0, pages, cities };
}
