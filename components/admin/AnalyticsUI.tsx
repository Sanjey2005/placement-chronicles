import Link from 'next/link';
import type { ReactNode } from 'react';
import GlassCard from '@/components/GlassCard';
import InfoTip from '@/components/admin/InfoTip';
import { niceMax } from '@/lib/analytics';
import { cn } from '@/lib/utils';

// Building blocks shared by /admin/analytics (visitors) and /admin/analytics/content
// (experiences), modelled on Stotradhwani's admin analytics widgets. CSS only, so
// they render on the server; the ⓘ popovers are the only client code.

export const formatNumber = (n: number) => n.toLocaleString('en-IN');

/** Page title plus the Visitors / Experiences switch. */
export function AnalyticsHeader({ active, subtitle }: { active: 'visitors' | 'content'; subtitle: string }) {
    const tabs = [
        { key: 'visitors', label: 'Visitors', href: '/admin/analytics' },
        { key: 'content', label: 'Experiences', href: '/admin/analytics/content' },
    ] as const;
    return (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
                <h1 className="text-2xl font-bold sm:text-3xl">Analytics</h1>
                <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
            <nav aria-label="Analytics view" className="inline-flex rounded-full bg-surface-container p-1 ring-1 ring-outline-variant">
                {tabs.map((tab) => (
                    <Link
                        key={tab.key}
                        href={tab.href}
                        aria-current={tab.key === active ? 'page' : undefined}
                        className={cn(
                            'rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                            tab.key === active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        {tab.label}
                    </Link>
                ))}
            </nav>
        </div>
    );
}

/** Period pills that live in the URL, plus the ⓘ explaining comparisons. */
export function Pills({ label, items, info }: { label: string; items: { key: string; label: string; href: string; active: boolean }[]; info: string }) {
    return (
        <nav aria-label={label} className="mb-6 flex flex-wrap items-center gap-2">
            {items.map((item) => (
                <Link
                    key={item.key}
                    href={item.href}
                    scroll={false}
                    aria-current={item.active ? 'page' : undefined}
                    className={cn(
                        'inline-flex h-8 items-center rounded-full px-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                        item.active
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground ring-1 ring-outline-variant hover:bg-surface-container-high hover:text-foreground'
                    )}
                >
                    {item.label}
                </Link>
            ))}
            <InfoTip label={`${label} and comparisons`}>{info}</InfoTip>
        </nav>
    );
}

/** ▲ / ▼ against the period before; `previous` undefined means there is nothing to compare with. */
export function Change({
    current,
    previous,
    period,
    upIsGood = true,
}: {
    current: number | null;
    previous: number | null | undefined;
    period: string;
    upIsGood?: boolean;
}) {
    if (previous === undefined) return null;
    if (current === null || !previous) return <>nothing to compare yet</>;
    const change = Math.round(((current - previous) / previous) * 100);
    if (change === 0) return <>same as the previous {period}</>;
    return (
        <span className={cn('font-medium', change > 0 === upIsGood ? 'text-success' : 'text-destructive')}>
            {change > 0 ? '▲' : '▼'} {Math.abs(change)}% vs previous {period}
        </span>
    );
}

export function StatCard({ label, info, value, note }: { label: string; info: string; value: ReactNode; note?: ReactNode }) {
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

export interface BarItem {
    key: string;
    label: ReactNode;
    value: number;
}

/** Vercel-style bar list: a light wash behind each row, sized to its value. */
export function BarList({ items, empty = 'Nothing recorded in this period.' }: { items: BarItem[]; empty?: string }) {
    if (items.length === 0) return <p className="py-6 text-center text-sm italic text-muted-foreground">{empty}</p>;
    const max = Math.max(...items.map((item) => item.value), 1);
    return (
        <ul className="space-y-1">
            {items.map((item) => (
                <li key={item.key} className="relative flex items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-sm">
                    <span aria-hidden className="absolute inset-y-0 left-0 rounded-md bg-primary/15" style={{ width: `${(item.value / max) * 100}%` }} />
                    <span className="relative min-w-0 truncate" title={typeof item.label === 'string' ? item.label : undefined}>
                        {item.label}
                    </span>
                    <span className="relative font-semibold tabular-nums">{formatNumber(item.value)}</span>
                </li>
            ))}
        </ul>
    );
}

/** A titled card around a BarList; `unit` names what the numbers count. */
export function Panel({ title, info, unit, items, empty }: { title: string; info: string; unit: string; items: BarItem[]; empty?: string }) {
    return (
        <GlassCard className="min-w-0 p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                    {title}
                    <InfoTip label={title}>{info}</InfoTip>
                </h2>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{unit}</span>
            </div>
            <BarList items={items} empty={empty} />
        </GlassCard>
    );
}

export interface ColumnPoint {
    key: string;
    label: string;
    value: number;
    extra?: number;
}

/**
 * Columns with a hover / keyboard-focus tooltip, and a table below that carries
 * every value without hovering.
 */
export function ColumnChart({
    points,
    period,
    valueLabel,
    extraLabel,
}: {
    points: ColumnPoint[];
    /** Heading of the table's first column: Hour, Day or Month. */
    period: string;
    valueLabel: string;
    extraLabel?: string;
}) {
    const max = niceMax(Math.max(0, ...points.map((point) => point.value)));
    const ticks = [0, max / 2, max];
    const labelIndexes = points.length > 3 ? [0, Math.floor((points.length - 1) / 2), points.length - 1] : points.map((_, i) => i);

    return (
        <figure>
            <div className="relative ml-8 h-56">
                {ticks.map((tick) => (
                    <div key={tick} className="absolute inset-x-0 border-t border-outline-variant/70" style={{ bottom: `${(tick / max) * 100}%` }}>
                        <span className="absolute right-full mr-2 -translate-y-1/2 text-[10px] tabular-nums text-muted-foreground">{formatNumber(tick)}</span>
                    </div>
                ))}

                <div className="absolute inset-0 flex items-end gap-[2px]">
                    {points.map((point, i) => (
                        <div
                            key={point.key}
                            tabIndex={0}
                            role="img"
                            aria-label={`${point.label}: ${point.value} ${valueLabel}${extraLabel ? `, ${point.extra ?? 0} ${extraLabel}` : ''}`}
                            className="group relative flex h-full flex-1 items-end justify-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                        >
                            <div
                                className="w-full max-w-6 rounded-t-[4px] bg-primary transition-opacity group-hover:opacity-75 group-focus-visible:opacity-75"
                                style={{ height: `${(point.value / max) * 100}%` }}
                            />
                            <div
                                role="tooltip"
                                className={cn(
                                    'pointer-events-none absolute top-0 z-10 hidden whitespace-nowrap rounded-lg border border-outline-variant bg-popover px-3 py-2 text-xs text-popover-foreground shadow-m3 group-hover:block group-focus-visible:block',
                                    i < points.length / 2 ? 'left-0' : 'right-0'
                                )}
                            >
                                <p className="text-muted-foreground">{point.label}</p>
                                <p>
                                    <span className="font-semibold">{formatNumber(point.value)}</span> {valueLabel}
                                </p>
                                {extraLabel && (
                                    <p>
                                        <span className="font-semibold">{formatNumber(point.extra ?? 0)}</span> {extraLabel}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="ml-8 mt-2 flex justify-between text-[10px] text-muted-foreground">
                {labelIndexes.map((i) => (
                    <span key={points[i].key}>{points[i].label}</span>
                ))}
            </div>

            <details className="mt-4 text-xs">
                <summary className="cursor-pointer text-muted-foreground">Show as table</summary>
                <table className="mt-2 w-full text-left tabular-nums">
                    <thead className="text-muted-foreground">
                        <tr>
                            <th className="py-1 font-semibold">{period}</th>
                            <th className="py-1 text-right font-semibold capitalize">{valueLabel}</th>
                            {extraLabel && <th className="py-1 text-right font-semibold capitalize">{extraLabel}</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                        {points.map((point) => (
                            <tr key={point.key}>
                                <td className="py-1">{point.label}</td>
                                <td className="py-1 text-right">{formatNumber(point.value)}</td>
                                {extraLabel && <td className="py-1 text-right">{formatNumber(point.extra ?? 0)}</td>}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </details>
        </figure>
    );
}
