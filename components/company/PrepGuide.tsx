'use client';

import { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { canonicalRoles, MIN_EVIDENCE, payLabel, type Guide, type QuestionGroup } from '@/lib/guide';
import { cn } from '@/lib/utils';
import type { CompanyExperience } from './CompanyView';

const initials = (name: string) => {
    const words = name.replace(/[^A-Za-z ]/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return '?';
    return (words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[words.length - 1][0]).toUpperCase();
};

const pct = (count: number, of: number) => `${Math.round((count / Math.max(of, 1)) * 100)}%`;

function Bar({ label, count, of, strong }: { label: string; count: number; of: number; strong?: boolean }) {
    return (
        <div className="relative flex items-center justify-between gap-3 rounded-[10px] px-3 py-2 text-sm">
            <span aria-hidden className={cn('absolute inset-y-0 left-0 rounded-[10px]', strong ? 'bg-primary/25' : 'bg-primary/12')} style={{ width: pct(count, of) }} />
            <span className="relative font-semibold">{label}</span>
            <span className="relative font-mono text-xs text-muted-foreground">
                {count} of {of}
            </span>
        </div>
    );
}

const FILTERS = ['Most asked', 'Interview', 'Online test', 'With answer tips'] as const;
type Filter = (typeof FILTERS)[number];

/** The company's prep guide: every figure is a count of experiences, every quote a student's own words. */
export default function PrepGuide({
    guide,
    items,
    onOpen,
    onShowAll,
}: {
    guide: Guide;
    items: CompanyExperience[];
    onOpen: (id: string) => void;
    onShowAll: () => void;
}) {
    const [filter, setFilter] = useState<Filter>('Most asked');
    const [allQuestions, setAllQuestions] = useState(false);
    const roleOf = useMemo(() => canonicalRoles(items.map((e) => e.role)), [items]);
    const n = guide.n;

    const questions = guide.questions.groups.filter((q) =>
        filter === 'Interview' ? q.kind === 'interview' : filter === 'Online test' ? q.kind === 'test' : filter === 'With answer tips' ? q.tips.length > 0 : true
    );
    const shownQuestions = allQuestions ? questions : questions.slice(0, 8);
    const topAsked = guide.questions.groups.find((q) => q.kind === 'interview' && q.students.length >= 2);
    const tipCount = guide.questions.groups.filter((q) => q.tips.length > 0).length;
    const recent = [...items]
        .sort((a, b) => (Number.parseInt(b.batch ?? '', 10) || 0) - (Number.parseInt(a.batch ?? '', 10) || 0) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 6);

    const [mainPay, otherPay] = guide.pay;
    const tiles = [
        mainPay && {
            label: mainPay.basis === 'stipend' ? 'Stipend' : 'CTC',
            value: mainPay.label + (mainPay.basis === 'stipend' && mainPay.shared >= MIN_EVIDENCE ? ' /mo' : ''),
            note: `${mainPay.shared} of ${mainPay.total} shared it${otherPay ? ` · ${otherPay.basis === 'stipend' ? 'Internships' : 'Full-time'}: ${otherPay.label}` : ''}`,
        },
        guide.sequence && {
            label: 'Process',
            value: guide.sequence.label,
            note: guide.sequence.count === n ? `All ${n} students` : `${guide.sequence.count} of ${n} students`,
        },
        {
            label: 'Minimum CGPA',
            value: guide.cgpa ? guide.cgpa.value.toFixed(1) : guide.cgpaReports === 1 ? 'Not enough data' : 'Not given',
            note: guide.cgpa
                ? `Cited by ${guide.cgpa.count} of ${guide.cgpa.specified} who listed one`
                : guide.cgpaReports === 1
                  ? 'Only 1 student listed a cutoff'
                  : 'No one listed a cutoff',
        },
        guide.duration && { label: 'Interview length', value: guide.duration.label, note: `From ${guide.duration.reports} reports` },
    ].filter(Boolean) as Array<{ label: string; value: string; note: string }>;

    return (
        <div className="space-y-7">
            <dl className="flex flex-wrap gap-3">
                {tiles.map((t) => (
                    <div key={t.label} className="glass min-w-[200px] flex-1 space-y-1 rounded-[20px] px-[18px] py-4">
                        <dt className="text-xs text-outline">{t.label}</dt>
                        <dd className="text-xl font-bold leading-snug tabular-nums">{t.value}</dd>
                        <dd className="text-xs text-outline">{t.note}</dd>
                    </div>
                ))}
            </dl>

            {guide.steps.length > 0 && (
                <section aria-labelledby="guide-process" className="space-y-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 id="guide-process" className="text-xl font-bold sm:text-2xl">
                            The process
                        </h3>
                        <p className="text-sm text-muted-foreground">How many of the {n} students went through each round</p>
                    </div>
                    <div className="flex flex-wrap items-stretch gap-4">
                        {guide.steps.map((step, i) => (
                            <article key={step.kind} className="glass min-w-[280px] flex-1 space-y-4 rounded-[24px] p-6">
                                <div className="flex items-baseline gap-3">
                                    <span className="font-mono text-[13px] font-semibold text-primary">{String(i + 1).padStart(2, '0')}</span>
                                    <h4 className="text-lg font-bold">{step.label}</h4>
                                    <span className="ml-auto text-[13px] text-outline">{step.count === n ? `All ${n}` : `${step.count} of ${n}`}</span>
                                </div>
                                {step.kind === 'test' && (
                                    <>
                                        {guide.testComponents.length > 0 && (
                                            <p className="text-[15px] leading-relaxed text-muted-foreground">
                                                {guide.testComponents.map((c, ci) => (
                                                    <span key={c.label}>
                                                        {ci > 0 && ' '}
                                                        {c.label} came up in <span className="font-bold text-foreground">{c.count} of {n}</span> accounts.
                                                    </span>
                                                ))}
                                            </p>
                                        )}
                                        {guide.testTopics.length > 0 && (
                                            <div className="space-y-1">
                                                <p className="pb-1 text-xs font-semibold text-outline">Topics students named</p>
                                                {guide.testTopics.map((t, ti) => (
                                                    <Bar key={t.label} label={t.label} count={t.count} of={n} strong={ti === 0} />
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                                {step.kind === 'interview' && (
                                    <>
                                        <div className="flex flex-wrap gap-2.5">
                                            {guide.interviewTypes.map((t) => (
                                                <div key={t.label} className="min-w-[96px] flex-1 rounded-2xl border border-hairline px-4 py-3">
                                                    <p className="text-2xl font-bold tabular-nums">{t.count}</p>
                                                    <p className="text-[13px] text-muted-foreground">{t.label}</p>
                                                </div>
                                            ))}
                                            <div className="min-w-[96px] flex-1 rounded-2xl border border-hairline px-4 py-3">
                                                <p className="text-2xl font-bold tabular-nums">{guide.questions.total}</p>
                                                <p className="text-[13px] text-muted-foreground">Questions reported</p>
                                            </div>
                                        </div>
                                        <p className="text-[15px] leading-relaxed text-muted-foreground">
                                            {guide.interviewRounds >= 2 && <>Usually {guide.interviewRounds} interview rounds. </>}
                                            {guide.duration && <>Typically {guide.duration.label.replace(/^About /, 'about ')}. </>}
                                            {topAsked && (
                                                <>
                                                    Most asked: <span className="font-semibold text-foreground">“{topAsked.text}”</span> ({topAsked.students.length} students).
                                                </>
                                            )}
                                        </p>
                                    </>
                                )}
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {guide.questions.groups.length > 0 && (
                <section aria-labelledby="guide-questions" className="glass space-y-3.5 rounded-[28px] p-6 sm:p-7">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 id="guide-questions" className="text-xl font-bold sm:text-2xl">
                            Question bank
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {guide.questions.groups.length} different questions from {n} students, most asked first
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter questions">
                        {FILTERS.filter((f) => f !== 'With answer tips' || tipCount > 0).map((f) => (
                            <button
                                key={f}
                                type="button"
                                aria-pressed={filter === f}
                                onClick={() => setFilter(f)}
                                className={cn(
                                    'inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-ring',
                                    filter === f ? 'bg-primary-fixed text-primary' : 'border border-hairline text-muted-foreground hover:text-foreground'
                                )}
                            >
                                {f}
                                {f === 'With answer tips' && <span className="opacity-70">{tipCount}</span>}
                            </button>
                        ))}
                    </div>
                    <ol className="border-t border-hairline">
                        {shownQuestions.map((q, qi) => (
                            <QuestionRow key={`${q.text}-${qi}`} q={q} index={qi} onOpen={onOpen} />
                        ))}
                    </ol>
                    {questions.length === 0 && <p className="py-4 text-sm text-muted-foreground">No questions in this filter yet.</p>}
                    {questions.length > 8 && (
                        <button
                            type="button"
                            onClick={() => setAllQuestions((v) => !v)}
                            aria-expanded={allQuestions}
                            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                        >
                            {allQuestions ? 'Show fewer' : `See all ${questions.length} questions`}
                            {!allQuestions && <ArrowRight className="h-3.5 w-3.5" aria-hidden />}
                        </button>
                    )}
                </section>
            )}

            {(guide.themes.length > 0 || guide.quote) && (
                <div className="flex flex-wrap items-stretch gap-4">
                    {guide.themes.length > 0 && (
                        <section aria-labelledby="guide-advice" className="glass min-w-[300px] flex-[1.3] space-y-3 rounded-[24px] p-6">
                            <h3 id="guide-advice" className="text-xl font-bold">
                                What seniors stress
                            </h3>
                            <p className="text-sm text-muted-foreground">How many of the {n} write-ups mention each theme</p>
                            {guide.themes.map((t, ti) => (
                                <Bar key={t.label} label={t.label} count={t.count} of={n} strong={ti === 0} />
                            ))}
                        </section>
                    )}
                    {guide.quote && (
                        <figure className="glass m-0 flex min-w-[280px] flex-1 flex-col justify-between gap-5 rounded-[24px] p-7">
                            <blockquote className="flex gap-3.5">
                                <span aria-hidden className="text-5xl font-bold leading-[0.8] text-primary">
                                    “
                                </span>
                                <p className="text-xl font-semibold leading-snug tracking-tight sm:text-2xl">{guide.quote.text}</p>
                            </blockquote>
                            <figcaption className="flex flex-wrap items-center gap-2.5 text-sm text-muted-foreground">
                                <span aria-hidden className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary-fixed text-xs font-bold text-primary">
                                    {initials(guide.quote.name)}
                                </span>
                                {guide.quote.name}, {guide.quote.role}
                                {guide.quote.batch ? `, Batch ${guide.quote.batch}` : ''}
                                <button type="button" onClick={() => onOpen(guide.quote!.id)} className="ml-auto min-h-11 font-bold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                                    Read it
                                </button>
                            </figcaption>
                        </figure>
                    )}
                </div>
            )}

            {guide.timeline.length >= 2 && (
                <section aria-labelledby="guide-timeline" className="glass space-y-5 rounded-[28px] p-6 sm:p-7">
                    <div className="space-y-1.5">
                        <h3 id="guide-timeline" className="text-xl font-bold sm:text-2xl">
                            How it has changed
                        </h3>
                        {guide.headline && <p className="text-[15px] leading-relaxed text-muted-foreground">{guide.headline}</p>}
                    </div>
                    <ol className="flex flex-wrap gap-y-6">
                        {guide.timeline.map((t, ti) => {
                            const last = ti === guide.timeline.length - 1;
                            return (
                                <li key={t.batch} className="flex min-w-[170px] flex-1 flex-col gap-2.5 pr-4">
                                    <div className="flex items-center gap-2" aria-hidden>
                                        <span className={cn('h-3 w-3 rounded-full border-2', last ? 'border-primary bg-primary' : t.pay ? 'border-primary' : 'border-outline')} />
                                        {!last && <span className="h-0.5 flex-1 bg-hairline" />}
                                    </div>
                                    <span className={cn('font-mono text-[13px] font-semibold', last ? 'text-primary' : 'text-outline')}>BATCH {t.batch}</span>
                                    {t.roles.map((r) => (
                                        <span key={r.role} className="text-[15px] font-bold leading-snug">
                                            {r.role} <span className="font-semibold text-outline">×{r.count}</span>
                                        </span>
                                    ))}
                                    <span className="text-[13px] text-muted-foreground">{t.pay ? <span className="font-bold text-foreground">{t.pay}</span> : 'Pay not shared'}</span>
                                </li>
                            );
                        })}
                    </ol>
                </section>
            )}

            <section aria-labelledby="guide-accounts" className="space-y-3.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 id="guide-accounts" className="text-xl font-bold sm:text-2xl">
                        Read the accounts
                    </h3>
                    <button type="button" onClick={onShowAll} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                        All {n} experiences
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </button>
                </div>
                <ul className="flex flex-wrap gap-3">
                    {recent.map((e) => {
                        const pay = payLabel(e.ctc, e.roleType);
                        return (
                            <li key={e.id} className="min-w-[260px] flex-1">
                                <button
                                    type="button"
                                    onClick={() => onOpen(e.id)}
                                    className="glass flex w-full flex-col gap-1 rounded-[18px] px-4 py-3.5 text-left transition-colors hover:bg-foreground/[0.03] focus-visible:outline-2 focus-visible:outline-ring"
                                >
                                    <span className="flex items-baseline justify-between gap-3">
                                        <span className="text-[15px] font-bold">{roleOf.get(e.role)}</span>
                                        <span className={cn('text-[13px] font-bold tabular-nums', !pay && 'font-semibold text-outline')}>{pay ?? 'Not shared'}</span>
                                    </span>
                                    <span className="text-[13px] text-muted-foreground">
                                        {e.studentName?.trim() || 'Anonymous'}
                                        {e.batch ? ` · Batch ${e.batch}` : ''}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </section>

            <p className="text-xs leading-relaxed text-outline">
                Built only from what these {n} students wrote: counts, never guesses. Backlog answers and selected/rejected outcomes are left out because the share form fills them in by
                default.
            </p>
        </div>
    );
}

function QuestionRow({ q, index, onOpen }: { q: QuestionGroup; index: number; onOpen: (id: string) => void }) {
    const many = q.students.length >= 2;
    return (
        <li className="border-b border-hairline">
            <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-4 rounded-md px-1 py-3.5 hover:bg-foreground/[0.03] focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                    <span className="w-6 shrink-0 font-mono text-xs text-outline">{String(index + 1).padStart(2, '0')}</span>
                    <span className="flex-1 text-[15px] font-semibold leading-snug sm:text-base">{q.text}</span>
                    {many && (
                        <span className="hidden shrink-0 items-center sm:inline-flex" aria-hidden>
                            {q.students.slice(0, 5).map((s) => (
                                <span key={s.id} className="-ml-2 inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-primary-fixed text-[10px] font-bold text-primary first:ml-0">
                                    {initials(s.name)}
                                </span>
                            ))}
                        </span>
                    )}
                    <span className="w-[92px] shrink-0 text-right text-[13px] text-muted-foreground">{many ? `${q.students.length} students` : q.tips.length ? 'Has a tip' : ''}</span>
                </summary>
                <div className="space-y-2.5 pb-4 pl-10 pr-2">
                    {q.tips.map((tip, ti) => (
                        <p key={ti} className="text-sm italic leading-relaxed text-muted-foreground">
                            {tip}
                        </p>
                    ))}
                    <p className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-muted-foreground">
                        Asked to
                        {q.students.map((s, si) => (
                            <span key={s.id}>
                                <button type="button" onClick={() => onOpen(s.id)} className="min-h-9 font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                                    {s.name}
                                    {s.batch ? ` (${s.batch})` : ''}
                                </button>
                                {si < q.students.length - 1 ? ',' : ''}
                            </span>
                        ))}
                    </p>
                </div>
            </details>
        </li>
    );
}
