import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import GlassCard from '@/components/GlassCard';
import Navbar from '@/components/Navbar';
import InfoTip from '@/components/admin/InfoTip';
import LiveVisitors from '@/components/admin/LiveVisitors';
import { AnalyticsHeader, Change, ColumnChart, Panel, Pills, StatCard, formatNumber, type BarItem } from '@/components/admin/AnalyticsUI';
import { SESSION_COOKIE, verifySession } from '@/lib/session';
import {
    RANGES,
    TRAFFIC_HELP,
    bucketLabel,
    countryLabel,
    flag,
    formatDuration,
    isRangeKey,
    pageLabel,
    rangeWindow,
    type RangeKey,
    type Row,
    type Summary,
    type Totals,
} from '@/lib/traffic';
import { trafficSummary, trafficTotals } from '@/lib/traffic-queries';

// Visitor analytics modelled on Stotradhwani's /admin/analytics: page views
// recorded by components/PageViewTracker.tsx at /api/pv, summarised here per
// range (?range=), with a live panel polled every 15 s.

export const metadata: Metadata = { title: 'Analytics | Placement Chronicles' };
export const dynamic = 'force-dynamic'; // always fresh

const toItems = (rows: Row[], label: (row: Row) => string = (row) => row.name ?? 'Unknown'): BarItem[] =>
    rows.map((row, i) => ({ key: `${row.name ?? 'unknown'}-${i}`, label: label(row), value: row.visitors }));

const PERIOD: Record<RangeKey, string> = { today: 'Hour', '7d': 'Day', '30d': 'Day', '90d': 'Day', '12m': 'Month' };

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
    // middleware.ts already gates /admin; this keeps the page safe if it is ever moved.
    const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
    if (session?.role !== 'admin') redirect('/');

    const { range: param } = await searchParams;
    const range: RangeKey = isRangeKey(param) ? param : '7d';
    const { from, to, prev: prevWindow } = rangeWindow(range);

    let summary: Summary | null = null;
    let prev: Totals | undefined;
    try {
        [summary, prev] = await Promise.all([
            trafficSummary(from, to, RANGES[range].bucket),
            prevWindow ? trafficTotals(prevWindow.from, prevWindow.to) : undefined,
        ]);
    } catch (error) {
        console.error('[analytics] summary failed:', error instanceof Error ? error.message : String(error));
    }

    const panel = { unit: 'Visitors', empty: 'No visits in this period.' };

    return (
        <>
            <Navbar />
            <main className="min-h-screen bg-background text-foreground">
                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
                    <AnalyticsHeader active="visitors" subtitle="How many students use the site, which pages they open, and how they found it." />

                    <Pills
                        label="Date range"
                        info={TRAFFIC_HELP.range}
                        items={(Object.keys(RANGES) as RangeKey[]).map((key) => ({
                            key,
                            label: RANGES[key].label,
                            href: `/admin/analytics?range=${key}`,
                            active: key === range,
                        }))}
                    />

                    {!summary ? (
                        <GlassCard className="p-12 text-center text-sm text-muted-foreground">Couldn&apos;t load analytics. Refresh the page to try again.</GlassCard>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                                <StatCard
                                    label="Visitors"
                                    info={TRAFFIC_HELP.visitors}
                                    value={formatNumber(summary.totals.visitors)}
                                    note={<Change current={summary.totals.visitors} previous={prev?.visitors} period="period" />}
                                />
                                <StatCard
                                    label="Page views"
                                    info={TRAFFIC_HELP.pageviews}
                                    value={formatNumber(summary.totals.pageviews)}
                                    note={<Change current={summary.totals.pageviews} previous={prev?.pageviews} period="period" />}
                                />
                                <StatCard
                                    label="Bounce rate"
                                    info={TRAFFIC_HELP.bounce}
                                    value={`${summary.totals.bounce_rate}%`}
                                    note={<Change current={summary.totals.bounce_rate} previous={prev?.bounce_rate} period="period" upIsGood={false} />}
                                />
                                <StatCard
                                    label="Avg. visit time"
                                    info={TRAFFIC_HELP.duration}
                                    value={formatDuration(summary.totals.avg_duration_s)}
                                    note={<Change current={summary.totals.avg_duration_s} previous={prev?.avg_duration_s} period="period" />}
                                />
                            </div>

                            <div className="grid gap-4 lg:grid-cols-3">
                                <GlassCard className="min-w-0 p-5 lg:col-span-2">
                                    <h2 className="mb-4 flex items-center gap-1.5 text-sm font-semibold">
                                        Visitors over time
                                        <InfoTip label="Visitors over time">{TRAFFIC_HELP.chart}</InfoTip>
                                    </h2>
                                    <ColumnChart
                                        points={summary.series.map((point) => ({
                                            key: point.t,
                                            label: bucketLabel(point.t, RANGES[range].bucket),
                                            value: point.visitors,
                                            extra: point.pageviews,
                                        }))}
                                        period={PERIOD[range]}
                                        valueLabel="visitors"
                                        extraLabel="page views"
                                    />
                                </GlassCard>
                                <GlassCard className="min-w-0 p-5">
                                    <LiveVisitors />
                                </GlassCard>
                            </div>

                            <div className="grid gap-4 lg:grid-cols-2">
                                <Panel title="Top pages" info={TRAFFIC_HELP.pages} items={toItems(summary.pages, (row) => pageLabel(row.name))} {...panel} />
                                <Panel title="How they arrived" info={TRAFFIC_HELP.sources} items={toItems(summary.sources)} {...panel} />
                                <Panel
                                    title="Cities"
                                    info={TRAFFIC_HELP.location}
                                    items={toItems(summary.cities, (row) => `${flag(row.country)} ${row.name ?? 'Unknown'}${row.region ? `, ${row.region}` : ''}`)}
                                    {...panel}
                                />
                                <Panel title="Countries" info={TRAFFIC_HELP.location} items={toItems(summary.countries, (row) => countryLabel(row.name))} {...panel} />
                            </div>

                            <div className="grid gap-4 lg:grid-cols-3">
                                <Panel title="Devices" info={TRAFFIC_HELP.devices} items={toItems(summary.devices)} {...panel} />
                                <Panel title="Browsers" info={TRAFFIC_HELP.browsers} items={toItems(summary.browsers)} {...panel} />
                                <Panel title="Operating systems" info={TRAFFIC_HELP.os} items={toItems(summary.os)} {...panel} />
                            </div>

                            <div className="grid gap-4 lg:grid-cols-2">
                                <Panel title="Landing pages" info={TRAFFIC_HELP.landing} items={toItems(summary.entry_pages, (row) => pageLabel(row.name))} {...panel} />
                                {summary.campaigns.length > 0 && (
                                    <Panel title="Campaigns (UTM links)" info={TRAFFIC_HELP.campaigns} items={toItems(summary.campaigns)} {...panel} />
                                )}
                            </div>

                            <p className="text-xs text-muted-foreground">
                                Signed-in students are counted once per day. Admin visits and the login page aren&apos;t counted, and no roll
                                numbers or IP addresses are stored. Links opened from WhatsApp or Instagram often arrive without a referrer and
                                show as &quot;Direct&quot;. Add <code className="rounded bg-surface-container px-1 py-0.5">?utm_source=whatsapp</code> to
                                links you share to see them separately.
                            </p>
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}
