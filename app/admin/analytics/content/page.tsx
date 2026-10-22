import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import GlassCard from '@/components/GlassCard';
import Navbar from '@/components/Navbar';
import InfoTip from '@/components/admin/InfoTip';
import { AnalyticsHeader, Change, ColumnChart, Panel, Pills, StatCard, formatNumber, type BarItem } from '@/components/admin/AnalyticsUI';
import dbConnect from '@/lib/db';
import { SESSION_COOKIE, verifySession } from '@/lib/session';
import { averageCTC, formatCompensation, selectionRate } from '@/lib/utils';
import { ANALYTICS_HELP, breakdowns, monthLabel, type AnalyticsRow, type Item } from '@/lib/analytics';
import Company from '@/models/Company';
import Experience from '@/models/Experience';

// What students have shared, per graduating batch. The visitor side (page views,
// sources, devices) is the sibling page, /admin/analytics.

export const metadata: Metadata = { title: 'Experience analytics | Placement Chronicles' };
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

const bars = (items: Item[]): BarItem[] => items.map((item) => ({ key: item.name, label: item.name, value: item.value }));

export default async function ContentAnalyticsPage({ searchParams }: { searchParams: Promise<{ batch?: string }> }) {
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
    const panel = { unit: 'Experiences', empty: 'Nothing recorded for this batch.' };

    return (
        <>
            <Navbar />
            <main className="min-h-screen bg-background text-foreground">
                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
                    <AnalyticsHeader active="content" subtitle="What students have shared: companies, packages, branches and how long the process runs." />

                    <Pills
                        label="Batch"
                        info={ANALYTICS_HELP.batch}
                        items={[null, ...batches].map((key) => ({
                            key: key ?? 'all',
                            label: key ?? 'All batches',
                            href: key ? `/admin/analytics/content?batch=${encodeURIComponent(key)}` : '/admin/analytics/content',
                            active: key === batch,
                        }))}
                    />

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
                                    note={<Change current={summary.experiences} previous={prev?.experiences} period="batch" />}
                                />
                                <StatCard
                                    label="Companies"
                                    info={ANALYTICS_HELP.companies}
                                    value={formatNumber(summary.companies)}
                                    note={<Change current={summary.companies} previous={prev?.companies} period="batch" />}
                                />
                                <StatCard
                                    label="Avg. package"
                                    info={ANALYTICS_HELP.package}
                                    value={formatCompensation(summary.avgCtc)}
                                    note={<Change current={summary.avgCtc} previous={prev?.avgCtc} period="batch" />}
                                />
                                <StatCard
                                    label="Selection rate"
                                    info={ANALYTICS_HELP.selection}
                                    value={`${summary.selectionRate}%`}
                                    note={<Change current={summary.selectionRate} previous={prev?.selectionRate} period="batch" />}
                                />
                            </div>

                            <GlassCard className="min-w-0 p-5">
                                <h2 className="mb-4 flex items-center gap-1.5 text-sm font-semibold">
                                    Experiences shared over time
                                    <InfoTip label="Experiences shared over time">{ANALYTICS_HELP.chart}</InfoTip>
                                </h2>
                                <ColumnChart
                                    points={lists.series.map((point) => ({ key: point.t, label: monthLabel(point.t), value: point.count }))}
                                    period="Month"
                                    valueLabel="experiences"
                                />
                            </GlassCard>

                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                <Panel title="Top companies" info={ANALYTICS_HELP.topCompanies} items={bars(lists.companies)} {...panel} />
                                <Panel title="Top roles" info={ANALYTICS_HELP.roles} items={bars(lists.roles)} {...panel} />
                                <Panel title="Branches" info={ANALYTICS_HELP.branches} items={bars(lists.branches)} {...panel} />
                                {!batch && <Panel title="Batches" info={ANALYTICS_HELP.batches} items={bars(lists.batches)} {...panel} />}
                                <Panel title="Role type" info={ANALYTICS_HELP.roleType} items={bars(lists.roleTypes)} {...panel} />
                                <Panel title="Placement type" info={ANALYTICS_HELP.placementType} items={bars(lists.placementTypes)} {...panel} />
                                <Panel title="Work model" info={ANALYTICS_HELP.workModel} items={bars(lists.workModels)} {...panel} />
                                <Panel title="Rounds" info={ANALYTICS_HELP.rounds} items={bars(lists.rounds)} {...panel} />
                                <Panel title="Minimum CGPA" info={ANALYTICS_HELP.cgpa} items={bars(lists.cgpa)} {...panel} />
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
