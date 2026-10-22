'use client';

import { useMemo, useRef, useState } from 'react';
import { ArrowDownUp, ChevronLeft, ChevronRight, ThumbsUp } from 'lucide-react';
import ExperienceDetail from './ExperienceDetail';
import { canonicalRoles, formatMinutes, parseMinutes, payLabel, questionsOf, roundKind, type GuideRound } from '@/lib/guide';
import { cn } from '@/lib/utils';
import type { CompanyExperience, Helpful } from './CompanyView';

const batchNum = (b?: string) => Number.parseInt(b ?? '', 10) || 0;
const time = (d?: string | Date) => (d ? new Date(d).getTime() || 0 : 0);

function meta(e: CompanyExperience): string {
    const rounds = (Array.isArray(e.rounds) ? e.rounds : []) as GuideRound[];
    const minutes = parseMinutes(rounds.find((r) => roundKind(r) === 'interview' && r.duration)?.duration);
    const questions = rounds.reduce((sum, r) => sum + questionsOf(r).length, 0);
    return [
        rounds.length && `${rounds.length} round${rounds.length === 1 ? '' : 's'}`,
        minutes && formatMinutes(minutes),
        questions && `${questions} Q`,
    ]
        .filter(Boolean)
        .join(' · ');
}

const chip = (on: boolean) =>
    cn(
        'inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring',
        on ? 'bg-primary-fixed text-primary' : 'border border-hairline text-muted-foreground hover:text-foreground'
    );

/** The "All experiences" view: a batch-grouped list beside a reading pane. On phones the pane opens over the list. */
export default function ExperienceReader({
    items,
    selectedId,
    onSelect,
    helpful,
    onHelpful,
}: {
    items: CompanyExperience[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    helpful: Record<string, Helpful>;
    onHelpful: (id: string) => void;
}) {
    const roleOf = useMemo(() => canonicalRoles(items.map((e) => e.role)), [items]);
    const [role, setRole] = useState<string | null>(null);
    const [sort, setSort] = useState<'newest' | 'oldest' | 'helpful'>('newest');
    const [paneOpen, setPaneOpen] = useState(() => selectedId !== null);
    const paneRef = useRef<HTMLElement>(null);

    const roles = useMemo(() => {
        const tally = new Map<string, number>();
        items.forEach((e) => tally.set(roleOf.get(e.role)!, (tally.get(roleOf.get(e.role)!) ?? 0) + 1));
        return [...tally].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    }, [items, roleOf]);

    const list = useMemo(
        () =>
            items
                .filter((e) => !role || roleOf.get(e.role) === role)
                .sort(
                    (a, b) =>
                        (sort === 'helpful' ? (helpful[b.id]?.count ?? 0) - (helpful[a.id]?.count ?? 0) : 0) ||
                        (batchNum(b.batch) - batchNum(a.batch)) * (sort === 'oldest' ? -1 : 1) ||
                        time(b.createdAt) - time(a.createdAt)
                ),
        [items, role, roleOf, sort, helpful]
    );

    const groups = useMemo(() => {
        if (sort === 'helpful') return [{ batch: 'Most helpful first', rows: list }];
        const out: Array<{ batch: string; rows: CompanyExperience[] }> = [];
        for (const e of list) {
            const batch = e.batch || 'Batch not given';
            if (out.at(-1)?.batch !== batch) out.push({ batch, rows: [] });
            out.at(-1)!.rows.push(e);
        }
        return out;
    }, [list, sort]);

    const current = list.find((e) => e.id === selectedId) ?? list[0] ?? null;
    const index = current ? list.indexOf(current) : -1;

    const select = (id: string) => {
        onSelect(id);
        setPaneOpen(true);
        const pane = paneRef.current;
        // Bring the pane into view when its top is off screen (always on phones, where it replaces the list)
        if (pane && (window.innerWidth < 1024 || pane.getBoundingClientRect().top < 0)) {
            requestAnimationFrame(() => pane.scrollIntoView({ block: 'start', behavior: 'smooth' }));
        }
    };
    const hasPrev = index > 0;
    const hasNext = index >= 0 && index < list.length - 1;
    const prev = hasPrev ? () => select(list[index - 1].id) : undefined;
    const next = hasNext ? () => select(list[index + 1].id) : undefined;

    return (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            <nav
                aria-label="Experiences"
                className={cn(
                    'glass rounded-[24px] p-2 lg:sticky lg:top-24 lg:w-[380px] lg:shrink-0 lg:max-h-[calc(100dvh-7.5rem)] lg:overflow-y-auto',
                    paneOpen && 'hidden lg:block'
                )}
            >
                <div className="flex flex-wrap items-center gap-2 p-2">
                    {roles.length > 1 && (
                        <>
                            <button type="button" aria-pressed={role === null} onClick={() => setRole(null)} className={chip(role === null)}>
                                All <span className="opacity-70">{items.length}</span>
                            </button>
                            {roles.map(([name, count]) => (
                                <button key={name} type="button" aria-pressed={role === name} onClick={() => setRole(name)} className={chip(role === name)}>
                                    {name} <span className="opacity-70">{count}</span>
                                </button>
                            ))}
                        </>
                    )}
                    <label className={cn(chip(false), 'ml-auto cursor-pointer')}>
                        <ArrowDownUp className="h-3.5 w-3.5" aria-hidden />
                        <span className="sr-only">Sort experiences</span>
                        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="cursor-pointer bg-transparent font-semibold outline-none">
                            <option value="newest">Newest batch first</option>
                            <option value="oldest">Oldest batch first</option>
                            <option value="helpful">Most helpful</option>
                        </select>
                    </label>
                </div>
                {groups.map((g) => (
                    <div key={g.batch}>
                        <div className="flex items-baseline justify-between px-3.5 pb-1.5 pt-3 font-mono text-xs tracking-wide text-outline">
                            <span>{/^\d+$/.test(g.batch) ? `BATCH ${g.batch}` : g.batch.toUpperCase()}</span>
                            <span>{g.rows.length}</span>
                        </div>
                        <ul>
                            {g.rows.map((e) => {
                                const pay = payLabel(e.ctc, e.roleType);
                                const selected = e.id === current?.id;
                                return (
                                    <li key={e.id}>
                                        <button
                                            type="button"
                                            onClick={() => select(e.id)}
                                            aria-current={selected ? 'true' : undefined}
                                            className={cn(
                                                'relative flex w-full flex-col gap-1 rounded-2xl px-3.5 py-3 text-left transition-colors hover:bg-foreground/[0.04] focus-visible:outline-2 focus-visible:outline-ring',
                                                selected && 'edge-gradient bg-primary/[0.08]'
                                            )}
                                        >
                                            <span className="flex items-baseline justify-between gap-3">
                                                <span className="text-[15px] font-bold leading-snug">{roleOf.get(e.role)}</span>
                                                <span className={cn('shrink-0 text-[13px] font-bold tabular-nums', !pay && 'font-semibold text-outline')}>{pay ?? 'Not shared'}</span>
                                            </span>
                                            <span className="truncate text-[13px] text-muted-foreground">
                                                {e.studentName?.trim() || 'Anonymous'}
                                                {e.courseBranch ? ` · ${e.courseBranch}` : ''}
                                            </span>
                                            <span className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-wide text-outline">
                                                <span>{meta(e)}</span>
                                                {(helpful[e.id]?.count ?? 0) > 0 && (
                                                    <span className="inline-flex items-center gap-1">
                                                        <ThumbsUp className="h-3 w-3" aria-hidden />
                                                        {helpful[e.id].count}
                                                        <span className="sr-only"> found this helpful</span>
                                                    </span>
                                                )}
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </nav>

            <article ref={paneRef} aria-label="Selected experience" className={cn('glass min-w-0 flex-1 scroll-mt-24 rounded-[28px]', !paneOpen && 'hidden lg:block')}>
                <div className="flex items-center justify-between px-4 pt-3 lg:hidden">
                    <button type="button" onClick={() => setPaneOpen(false)} className="inline-flex min-h-11 items-center gap-1 text-[15px] font-bold">
                        <ChevronLeft className="h-5 w-5" aria-hidden />
                        All experiences
                    </button>
                    {current && (
                        <span className="font-mono text-xs text-outline">
                            {index + 1} / {list.length}
                        </span>
                    )}
                </div>
                {current ? (
                    <ExperienceDetail key={current.id} exp={current} role={roleOf.get(current.role) ?? current.role} position={index + 1} total={list.length} onPrev={prev} onNext={next} helpful={helpful[current.id]} onHelpful={() => onHelpful(current.id)} />
                ) : (
                    <p className="p-8 text-center text-muted-foreground">No experiences match this filter.</p>
                )}
                {current && list.length > 1 && (
                    <div className="sticky bottom-0 flex gap-2.5 rounded-b-[28px] border-t border-hairline bg-[var(--glass-fill)] p-3 backdrop-blur-xl lg:hidden">
                        <button type="button" onClick={prev} disabled={!hasPrev} className="inline-flex min-h-12 flex-1 items-center justify-center gap-1 rounded-2xl border border-hairline text-[15px] font-bold disabled:opacity-30">
                            <ChevronLeft className="h-[18px] w-[18px]" aria-hidden />
                            Previous
                        </button>
                        <button type="button" onClick={next} disabled={!hasNext} className="inline-flex min-h-12 flex-1 items-center justify-center gap-1 rounded-2xl bg-primary-fixed text-[15px] font-bold text-primary disabled:opacity-30">
                            Next
                            <ChevronRight className="h-[18px] w-[18px]" aria-hidden />
                        </button>
                    </div>
                )}
            </article>
        </div>
    );
}
