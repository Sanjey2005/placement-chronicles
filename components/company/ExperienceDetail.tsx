'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, Link2, Github, Youtube, HardDrive, Link as LinkIcon, ThumbsUp } from 'lucide-react';
import { useSession } from '@/components/Providers';
import { getRound } from '@/lib/rounds';
import { formatMinutes, parseMinutes, payLabel, questionsOf, roundKind, isInternship, type GuideRound } from '@/lib/guide';
import { cn } from '@/lib/utils';
import type { CompanyExperience, Helpful } from './CompanyView';

// Every field a round may carry. Rounds are Mongoose Mixed, so any subset can appear.
type RoundFields = GuideRound & {
    roundNumber?: number;
    experience?: string;
    problemStatement?: string;
    strategy?: string;
    studySources?: string;
    tips?: string;
    links?: Array<{ type?: string; url?: string }>;
};

const PREVIEW_QUESTIONS = 6;

const topicsText = (t: RoundFields['topics']) => (Array.isArray(t) ? t.join(', ') : String(t ?? '')).trim();

function LinkGlyph({ type }: { type?: string }) {
    if (type === 'youtube') return <Youtube className="h-4 w-4 shrink-0" aria-hidden />;
    if (type === 'github') return <Github className="h-4 w-4 shrink-0" aria-hidden />;
    if (type === 'drive') return <HardDrive className="h-4 w-4 shrink-0" aria-hidden />;
    return <LinkIcon className="h-4 w-4 shrink-0" aria-hidden />;
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <p className="text-xs font-semibold text-outline">{title}</p>
            <div className="text-[15px] leading-relaxed text-muted-foreground whitespace-pre-line">{children}</div>
        </div>
    );
}

const navButton =
    'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-hairline text-muted-foreground transition-colors hover:text-foreground hover:bg-foreground/[0.04] disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

export default function ExperienceDetail({
    exp,
    role,
    position,
    total,
    onPrev,
    onNext,
    helpful,
    onHelpful,
}: {
    exp: CompanyExperience;
    role: string;
    position: number;
    total: number;
    onPrev?: () => void;
    onNext?: () => void;
    helpful?: Helpful;
    onHelpful?: () => void;
}) {
    const { isAdmin } = useSession();
    const canVote = !isAdmin && !exp.isOwn; // admins and the author see the count but don't vote
    const [openRounds, setOpenRounds] = useState<Set<number>>(new Set());
    const [fullStory, setFullStory] = useState(false);
    const rounds = (Array.isArray(exp.rounds) ? exp.rounds : []) as RoundFields[];
    const anchor = (part: string) => `exp-${exp.id}-${part}`;

    const pay = payLabel(exp.ctc, exp.roleType);
    const interview = rounds.find((r) => roundKind(r) === 'interview' && r.duration);
    const minutes = parseMinutes(interview?.duration);
    const process = rounds.map((r) => getRound(r).label).join(' → ');
    const verdict = exp.finalVerdict === 'selected' ? 'Selected' : exp.finalVerdict === 'rejected' ? 'Not selected' : null;

    const facts = [
        { label: isInternship(exp.roleType) ? 'Stipend' : 'CTC', value: pay ? `${pay}${isInternship(exp.roleType) ? ' /mo' : ''}` : 'Not shared', muted: !pay },
        rounds.length > 0 && { label: 'Process', value: process },
        interview?.duration && { label: 'Interview', value: minutes ? formatMinutes(minutes) : interview.duration },
        { label: 'Min CGPA', value: exp.minCGPA ? exp.minCGPA.toFixed(1) : 'Not given', muted: !exp.minCGPA },
    ].filter(Boolean) as Array<{ label: string; value: string; muted?: boolean }>;

    const toggleRound = (i: number) =>
        setOpenRounds((prev) => {
            const next = new Set(prev);
            if (next.has(i)) next.delete(i);
            else next.add(i);
            return next;
        });

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            toast.success('Link to this experience copied');
        } catch {
            toast.error('Could not copy the link');
        }
    };

    return (
        <div className="flex flex-col gap-6 p-5 sm:p-7">
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 space-y-1.5">
                    <h2 className="text-2xl sm:text-[28px] font-bold leading-tight tracking-tight">{role}</h2>
                    <p className="text-sm text-muted-foreground">
                        {[exp.studentName?.trim() || 'Anonymous', exp.courseBranch, exp.batch && `Batch ${exp.batch}`].filter(Boolean).join(' · ')}
                        {verdict && (
                            <>
                                {' · '}
                                <span className={cn('font-semibold', verdict === 'Selected' ? 'text-success' : 'text-destructive')}>{verdict}</span>
                            </>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="hidden lg:inline font-mono text-xs text-outline mr-1">
                        {position} / {total}
                    </span>
                    <button type="button" onClick={onPrev} disabled={!onPrev} aria-label="Previous experience" className={cn(navButton, 'hidden lg:inline-flex')}>
                        <ChevronUp className="h-[18px] w-[18px]" />
                    </button>
                    <button type="button" onClick={onNext} disabled={!onNext} aria-label="Next experience" className={cn(navButton, 'hidden lg:inline-flex')}>
                        <ChevronDown className="h-[18px] w-[18px]" />
                    </button>
                    <HelpfulButton helpful={helpful} onHelpful={onHelpful} canVote={canVote} />
                    <button type="button" onClick={copyLink} aria-label="Copy link to this experience" className={navButton}>
                        <Link2 className="h-[18px] w-[18px]" />
                    </button>
                </div>
            </header>

            <dl className="grid grid-cols-2 sm:grid-cols-4 border-y border-hairline">
                {facts.map((f, i) => (
                    <div key={f.label} className={cn('py-3.5 pr-4 space-y-1', i > 0 && 'sm:border-l sm:border-hairline sm:pl-4', i % 2 === 1 && 'border-l border-hairline pl-4')}>
                        <dt className="text-xs text-outline">{f.label}</dt>
                        <dd className={cn('text-[15px] font-bold leading-snug tabular-nums', f.muted && 'font-semibold text-outline')}>{f.value}</dd>
                    </div>
                ))}
            </dl>

            <nav aria-label="Sections" className="flex flex-wrap gap-2">
                {exp.tipsForJuniors && <SectionLink href={`#${anchor('advice')}`}>Advice</SectionLink>}
                {rounds.map((r, i) => {
                    const q = questionsOf(r).length;
                    return (
                        <SectionLink key={i} href={`#${anchor(`r${i}`)}`}>
                            <span className="font-mono text-[11px] text-outline">{String(i + 1).padStart(2, '0')}</span>
                            {getRound(r).label}
                            {q > 0 && <span className="rounded-full bg-primary-fixed px-2 text-xs font-bold text-primary">{q}</span>}
                        </SectionLink>
                    );
                })}
                {exp.overallExperience && <SectionLink href={`#${anchor('story')}`}>In their words</SectionLink>}
            </nav>

            {exp.tipsForJuniors && (
                <section id={anchor('advice')} aria-labelledby={`${anchor('advice')}-h`} className="scroll-mt-28 space-y-2">
                    <h3 id={`${anchor('advice')}-h`} className="text-[13px] font-bold text-primary">
                        Advice for juniors
                    </h3>
                    <p className="max-w-[72ch] text-[17px] leading-relaxed whitespace-pre-line">{exp.tipsForJuniors}</p>
                </section>
            )}

            {rounds.map((r, i) => {
                const questions = questionsOf(r);
                const open = openRounds.has(i);
                const shown = open ? questions : questions.slice(0, PREVIEW_QUESTIONS);
                const links = (r.links ?? []).filter((l) => l.url && /^https?:\/\//i.test(l.url));
                const topics = topicsText(r.topics);
                return (
                    <section key={i} id={anchor(`r${i}`)} aria-labelledby={`${anchor(`r${i}`)}-h`} className="scroll-mt-28 space-y-3 border-t border-hairline pt-5">
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <span className="font-mono text-[13px] font-semibold text-primary">{String(i + 1).padStart(2, '0')}</span>
                            <h3 id={`${anchor(`r${i}`)}-h`} className="text-lg font-bold">
                                {getRound(r).label}
                            </h3>
                            <span className="ml-auto text-[13px] text-outline">
                                {[r.duration, questions.length > 0 && `${questions.length} question${questions.length === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
                            </span>
                        </div>
                        <div className="max-w-[76ch] space-y-3">
                            {r.description && <p className="text-[15px] leading-relaxed text-muted-foreground whitespace-pre-line">{r.description}</p>}
                            {r.experience && <p className="text-[15px] leading-relaxed text-muted-foreground whitespace-pre-line">{r.experience}</p>}
                            {r.problemStatement && <Block title="Problem">{r.problemStatement}</Block>}
                            {r.strategy && <Block title="Approach">{r.strategy}</Block>}
                            {topics && <Block title="Topics">{topics}</Block>}
                            {r.studySources && <Block title="Prepared with">{r.studySources}</Block>}
                            {r.notes && <Block title="Notes">{r.notes}</Block>}
                            {r.tips && <Block title="Tips">{r.tips}</Block>}
                            {links.length > 0 && (
                                <ul className="flex flex-col gap-2">
                                    {links.map((l, li) => (
                                        <li key={li}>
                                            <a
                                                href={l.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 rounded-xl border border-hairline px-3 py-2 text-sm text-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
                                            >
                                                <LinkGlyph type={l.type} />
                                                <span className="truncate">{l.url}</span>
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {questions.length > 0 && (
                                <ol className="border-t border-hairline">
                                    {shown.map((q, qi) => (
                                        <li key={qi} className="flex gap-3.5 border-b border-hairline py-2.5 text-[15px] leading-relaxed">
                                            <span className="pt-0.5 font-mono text-xs text-outline">{String(qi + 1).padStart(2, '0')}</span>
                                            <span className="min-w-0">
                                                {q.question}
                                                {q.answerTip && <span className="mt-1 block text-sm italic text-muted-foreground">{q.answerTip}</span>}
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            )}
                            {questions.length > PREVIEW_QUESTIONS && (
                                <button
                                    type="button"
                                    onClick={() => toggleRound(i)}
                                    aria-expanded={open}
                                    className="min-h-11 rounded-full border border-hairline px-4 text-sm font-bold text-primary hover:bg-foreground/[0.04] focus-visible:outline-2 focus-visible:outline-ring"
                                >
                                    {open ? 'Show fewer' : `Show all ${questions.length} questions`}
                                </button>
                            )}
                        </div>
                    </section>
                );
            })}

            {exp.overallExperience && (
                <section id={anchor('story')} aria-labelledby={`${anchor('story')}-h`} className="scroll-mt-28 space-y-2 border-t border-hairline pt-5">
                    <h3 id={`${anchor('story')}-h`} className="text-lg font-bold">
                        In their words
                    </h3>
                    <p className={cn('max-w-[72ch] text-[15px] leading-relaxed text-muted-foreground whitespace-pre-line', !fullStory && 'line-clamp-6')}>{exp.overallExperience}</p>
                    {exp.overallExperience.length > 420 && (
                        <button type="button" onClick={() => setFullStory((v) => !v)} aria-expanded={fullStory} className="min-h-11 text-sm font-bold text-primary hover:underline">
                            {fullStory ? 'Show less' : 'Read the full account'}
                        </button>
                    )}
                </section>
            )}

            {(exp.tags?.length ?? 0) > 0 && (
                <p className="border-t border-hairline pt-4 text-sm leading-relaxed text-muted-foreground">
                    <span className="font-bold text-foreground">Skills that came up: </span>
                    {exp.tags!.join(' · ')}
                </p>
            )}

            {canVote && (
                <div className="flex flex-wrap items-center gap-3 border-t border-hairline pt-5">
                    <p className="text-[15px] font-semibold">Did this help you prepare?</p>
                    <HelpfulButton helpful={helpful} onHelpful={onHelpful} canVote />
                </div>
            )}

            <p className="text-xs text-outline">
                As submitted: backlog history {exp.historyOfBacklogs?.toLowerCase() ?? 'not given'}, standing backlogs {exp.standingBacklogs?.toLowerCase() ?? 'not given'}
                {exp.resumeShortlisting ? ', resume shortlisting round' : ''}.
            </p>
        </div>
    );
}

/** Marks an experience as helpful (one vote per student); shows the total. */
function HelpfulButton({ helpful, onHelpful, canVote }: { helpful?: Helpful; onHelpful?: () => void; canVote: boolean }) {
    const count = helpful?.count ?? 0;
    if (!canVote) {
        return count > 0 ? (
            <span className="inline-flex h-10 items-center gap-1.5 px-1 text-sm text-muted-foreground">
                <ThumbsUp className="h-4 w-4" aria-hidden />
                {count} found this helpful
            </span>
        ) : null;
    }
    const on = !!helpful?.mine;
    return (
        <button
            type="button"
            onClick={onHelpful}
            aria-pressed={on}
            className={cn(
                'inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                on ? 'border-transparent bg-primary-fixed text-primary' : 'border-hairline text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground'
            )}
        >
            <ThumbsUp className={cn('h-4 w-4', on && 'fill-current')} aria-hidden />
            Helpful
            {count > 0 && <span className="tabular-nums">{count}</span>}
            {count > 0 && <span className="sr-only">{count === 1 ? 'student' : 'students'} found this helpful</span>}
        </button>
    );
}

function SectionLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <a
            href={href}
            className="inline-flex min-h-9 items-center gap-2 rounded-full border border-hairline px-3.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
            {children}
        </a>
    );
}
