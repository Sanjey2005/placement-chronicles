import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import GlassCard from '@/components/GlassCard';
import Navbar from '@/components/Navbar';
import InfoTip from '@/components/admin/InfoTip';
import dbConnect from '@/lib/db';
import { SESSION_COOKIE, verifySession } from '@/lib/session';
import { averageCTC, cn, formatCompensation, selectionRate } from '@/lib/utils';
import { ANALYTICS_HELP, breakdowns, monthLabel, niceMax, type AnalyticsRow, type Item, type SeriesPoint } from '@/lib/analytics';
import Company from '@/models/Company';
import Experience from '@/models/Experience';

// Modelled on Stotradhwani's /admin/analytics: the server page computes the numbers,
// pills in the URL pick the period (here a graduating batch) and the ▲/▼ compare it
// with the period before. The chart and bar lists are CSS only, so the ⓘ popovers are
// the only client code.

export const metadata: Metadata = { title: 'Analytics | Placement Chronicles' };
export const dynamic = 'force-dynamic'; // always fresh, like the admin stats route

interface Totals {
    experiences: number;
    companies: number;
    avgCtc: number | null;
    selectionRate: number;
}

const totals = (rows: AnalyticsRow[]): Totals => ({
    experiences: rows.length,
    companies: new Set(rows.map((row) => row.company)).size,
    avgCtc: averageCTC(rows),
    selectionRate: selectionRate(rows),
});

const formatNumber = (n: number) => n.toLocaleString('en-IN');

function Change({ current, previous }: { current: number | null; previous: number | null | undefined }) {
    if (previous === undefined) return null; // all batches, or the earliest one: nothing to compare with
    if (current === null || !previous) return <>nothing to compare yet</>;
    const change = Math.round(((current - previous) / previous) * 100);
    if (change === 0) return <>same as the previous batch</>;
    return (
        <span className={cn('font-medium', change > 0 ? 'text-success' : 'text-destructive')}>
            {change > 0 ? '▲' : '▼'} {Math.abs(change)}% vs previous batch
        </span>
    );
}

function StatCard({ label, info, value, note }: { label: string; info: string; value: ReactNode; note: ReactNode }) {
    return (
        <GlassCard className="p-4 sm:p-5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
                <InfoTip label={label}>{info}</InfoTip>
            </p>
            <p className="mt-1 text-2xl font-bold sm:text-3xl">{value}</p>
            <div className="mt-0.5 min-h-4 text-xs text-muted-foreground">{note}</div>
        </GlassCard>
    );
}

/** Vercel-style bar list: a light wash behind each row, sized to its value. */
function Panel({ title, info, items }: { title: string; info: string; items: Item[] }) {
    const max = Math.max(...items.map((item) => item.value), 1);
    return (
        <GlassCard className="min-w-0 p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                    {title}
                    <InfoTip label={title}>{info}</InfoTip>
                </h2>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Experiences</span>
            </div>
            {items.length === 0 ? (
                <p className="py-6 text-center text-sm italic text-muted-foreground">Nothing recorded for this batch.</p>
            ) : (
                <ul className="space-y-1">
                    {items.map((item) => (
                        <li key={item.name} className="relative flex items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-sm">
                            <span aria-hidden className="absolute inset-y-0 left-0 rounded-md bg-primary/15" style={{ width: `${(item.value / max) * 100}%` }} />
                            <span className="relative min-w-0 truncate" title={item.name}>{item.name}</span>
                            <span className="relative font-semibold tabular-nums">{formatNumber(item.value)}</span>
                        </li>
                    ))}
                </ul>
            )}
        </GlassCard>
    );
}

/**
 * Experiences per month as columns. Hover or keyboard-focus a column for its
 * count. CSS only, so it renders on the server; the table below carries every
 * value without hovering.
 */
function Chart({ series }: { series: SeriesPoint[] }) {
    const max = niceMax(Math.max(0, ...series.map((point) => point.count)));
    const ticks = [0, max / 2, max];
    const labelIndexes = series.length > 3 ? [0, Math.floor((series.length - 1) / 2), series.length - 1] : series.map((_, i) => i);

    return (
        <figure>
            <div className="relative ml-8 h-56">
                {ticks.map((tick) => (
                    <div key={tick} className="absolute inset-x-0 border-t border-outline-variant/70" style={{ bottom: `${(tick / max) * 100}%` }}>
                        <span className="absolute right-full mr-2 -translate-y-1/2 text-[10px] tabular-nums text-muted-foreground">{formatNumber(tick)}</span>
                    </div>
                ))}

                <div className="absolute inset-0 flex items-end gap-[2px]">
                    {series.map((point, i) => (
                        <div
                            key={point.t}
                            tabIndex={0}
                            role="img"
                            aria-label={`${monthLabel(point.t)}: ${point.count} experiences`}
                            className="group relative flex h-full flex-1 items-end justify-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                        >
                            <div
                                className="w-full max-w-6 rounded-t-[4px] bg-primary transition-opacity group-hover:opacity-75 group-focus-visible:opacity-75"
                                style={{ height: `${(point.count / max) * 100}%` }}
                            />
                            <div
                                role="tooltip"
                                className={cn(
                                    'pointer-events-none absolute top-0 z-10 hidden whitespace-nowrap rounded-lg border border-outline-variant bg-popover px-3 py-2 text-xs text-popover-foreground shadow-m3 group-hover:block group-focus-visible:block',
                                    i < series.length / 2 ? 'left-0' : 'right-0'
                                )}
                            >
                                <p className="text-muted-foreground">{monthLabel(point.t)}</p>
                                <p>
                                    <span className="font-semibold">{formatNumber(point.count)}</span> experiences
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="ml-8 mt-2 flex justify-between text-[10px] text-muted-foreground">
                {labelIndexes.map((i) => (
                    <span key={series[i].t}>{monthLabel(series[i].t)}</span>
                ))}
            </div>

            <details className="mt-4 text-xs">
                <summary className="cursor-pointer text-muted-foreground">Show as table</summary>
                <table className="mt-2 w-full text-left tabular-nums">
                    <thead className="text-muted-foreground">
                        <tr>
                            <th className="py-1 font-semibold">Month</th>
                            <th className="py-1 text-right font-semibold">Experiences</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                        {series.map((point) => (
                            <tr key={point.t}>
                                <td className="py-1">{monthLabel(point.t)}</td>
                                <td className="py-1 text-right">{formatNumber(point.count)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </details>
        </figure>
    );
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ batch?: string }> }) {
    // middleware.ts already gates /admin; this keeps the page safe if it is ever moved.
    const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
    if (session?.role !== 'admin') redirect('/');

    await dbConnect();
    // Same visibility rule as getAllExperiences: approved, and not from a hidden company.
    const hidden = await Company.distinct('canonicalName', { isHidden: true });
    // ponytail: one slim query and a JS reduce, so lib/utils' money maths is reused as-is;
    // move to a $facet pipeline if the collection outgrows a few thousand rows.
    const rows = await Experience.aggregate<AnalyticsRow>([
        { $match: { status: 'APPROVED', company: { $nin: hidden } } },
        {
            $project: {
                _id: 0,
                company: 1,
                role: 1,
                ctc: 1,
                roleType: 1,
                placementType: 1,
                workModel: 1,
                batch: 1,
                courseBranch: 1,
                minCGPA: 1,
                finalVerdict: 1,
                createdAt: 1,
                roundCount: { $cond: [{ $isArray: '$rounds' }, { $size: '$rounds' }, 0] },
            },
        },
    ]);

    const batches = [...new Set(rows.map((row) => row.batch ?? '').filter((batch) => batch))].sort();
    const { batch: param } = await searchParams;
    const batch = param && batches.includes(param) ? param : null;
    const inBatch = (name: string) => rows.filter((row) => row.batch === name);
    const selected = batch ? inBatch(batch) : rows;
    const previousBatch = batch ? batches[batches.indexOf(batch) - 1] : undefined;
    const prev = previousBatch ? totals(inBatch(previousBatch)) : undefined;
    const summary = totals(selected);
    const lists = breakdowns(selected);

    return (
        <>
            <Navbar />
            <main className="min-h-screen bg-background text-foreground">
                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold sm:text-3xl">Analytics</h1>
                        <p className="text-sm text-muted-foreground">What students have shared: companies, packages, branches and how long the process runs.</p>
                    </div>

                    <nav aria-label="Batch" className="mb-6 flex flex-wrap items-center gap-2">
                        {[null, ...batches].map((key) => (
                            <Link
                                key={key ?? 'all'}
                                href={key ? `/admin/analytics?batch=${encodeURIComponent(key)}` : '/admin/analytics'}
                                scroll={false}
                                aria-current={key === batch ? 'page' : undefined}
                                className={cn(
                                    'inline-flex h-8 items-center rounded-full px-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                                    key === batch
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground ring-1 ring-outline-variant hover:bg-surface-container-high hover:text-foreground'
                                )}
                            >
                                {key ?? 'All batches'}
                            </Link>
                        ))}
                        <InfoTip label="Batch and comparisons">{ANALYTICS_HELP.batch}</InfoTip>
                    </nav>

                    {selected.length === 0 ? (
                        <GlassCard className="p-12 text-center text-sm text-muted-foreground">
                            No approved experiences yet. Numbers appear here once the first one is approved.
                        </GlassCard>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                                <StatCard
                                    label="Experiences"
                                    info={ANALYTICS_HELP.experiences}
                                    value={formatNumber(summary.experiences)}
                                    note={<Change current={summary.experiences} previous={prev?.experiences} />}
                                />
                                <StatCard
                                    label="Companies"
                                    info={ANALYTICS_HELP.companies}
                                    value={formatNumber(summary.companies)}
                                    note={<Change current={summary.companies} previous={prev?.companies} />}
                                />
                                <StatCard
                                    label="Avg. package"
                                    info={ANALYTICS_HELP.package}
                                    value={formatCompensation(summary.avgCtc)}
                                    note={<Change current={summary.avgCtc} previous={prev?.avgCtc} />}
                                />
                                <StatCard
                                    label="Selection rate"
                                    info={ANALYTICS_HELP.selection}
                                    value={`${summary.selectionRate}%`}
                                    note={<Change current={summary.selectionRate} previous={prev?.selectionRate} />}
                                />
                            </div>

                            <GlassCard className="min-w-0 p-5">
                                <h2 className="mb-4 flex items-center gap-1.5 text-sm font-semibold">
                                    Experiences shared over time
                                    <InfoTip label="Experiences shared over time">{ANALYTICS_HELP.chart}</InfoTip>
                                </h2>
                                <Chart series={lists.series} />
                            </GlassCard>

                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                <Panel title="Top companies" info={ANALYTICS_HELP.topCompanies} items={lists.companies} />
                                <Panel title="Top roles" info={ANALYTICS_HELP.roles} items={lists.roles} />
                                <Panel title="Branches" info={ANALYTICS_HELP.branches} items={lists.branches} />
                                {!batch && <Panel title="Batches" info={ANALYTICS_HELP.batches} items={lists.batches} />}
                                <Panel title="Role type" info={ANALYTICS_HELP.roleType} items={lists.roleTypes} />
                                <Panel title="Placement type" info={ANALYTICS_HELP.placementType} items={lists.placementTypes} />
                                <Panel title="Work model" info={ANALYTICS_HELP.workModel} items={lists.workModels} />
                                <Panel title="Rounds" info={ANALYTICS_HELP.rounds} items={lists.rounds} />
                                <Panel title="Minimum CGPA" info={ANALYTICS_HELP.cgpa} items={lists.cgpa} />
                            </div>

                            <p className="text-xs text-muted-foreground">
                                Only approved experiences from visible companies are counted, the same set students see on the home page.
                                Packages are in LPA; internship stipends are converted to a yearly figure.
                            </p>
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}
