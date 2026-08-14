'use client';

import { useState, useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    Building2,
    Briefcase,
    IndianRupee,
    GraduationCap,
    Clock,
    Lightbulb,
    Star,
    Info,
    ChevronDown,
    CheckCircle2,
    XCircle,
    BookOpen,
    Link as LinkIcon,
    Youtube,
    Github,
    HardDrive,
    type LucideIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCompensation } from '@/lib/utils';
import { getRound } from '@/lib/rounds';

interface ExperienceModalProps {
    isOpen: boolean;
    onClose: () => void;
    company: string;
    role: string;
    ctc: number;
    studentName?: string;
    courseBranch?: string;
    batch?: string;
    year?: number;
    roleType?: string;
    placementType?: string;
    finalVerdict?: 'selected' | 'rejected';
    minCGPA?: number;
    historyOfBacklogs?: string;
    standingBacklogs?: string;
    resumeShortlisting?: boolean;
    rounds?: any[];
    tags?: string[];
    overallExperience?: string;
    tipsForJuniors?: string;
    adminBanner?: React.ReactNode;
    adminFooter?: React.ReactNode;
}

const pretty = (s?: string) => (s ? s.replaceAll('_', ' ').toLowerCase() : '');

/**
 * Fades overflowing text with a CSS mask rather than a gradient overlay.
 * The old version hardcoded `from-card`, so the fade was the wrong colour in
 * every panel that wasn't bg-card. A mask is background-independent.
 * "Show more" is gated on real overflow, not a character count that disagreed
 * with line-clamp-3.
 */
function ExpandableText({ text }: { text: string }) {
    const [expanded, setExpanded] = useState(false);
    const [overflows, setOverflows] = useState(false);
    const ref = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (el) setOverflows(el.scrollHeight > el.clientHeight + 1);
    }, [text]);

    if (!text) return null;

    return (
        <div>
            <p
                ref={ref}
                className={
                    expanded
                        ? 'text-sm text-muted-foreground leading-relaxed whitespace-pre-line'
                        : 'text-sm text-muted-foreground leading-relaxed whitespace-pre-line line-clamp-3 [mask-image:linear-gradient(to_bottom,black_60%,transparent)]'
                }
            >
                {text}
            </p>
            {(overflows || expanded) && (
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="mt-1 text-xs text-primary hover:underline font-medium cursor-pointer"
                >
                    {expanded ? 'Show less' : 'Show more'}
                </button>
            )}
        </div>
    );
}

function Block({
    title,
    icon: Icon,
    tone = 'neutral',
    children,
}: {
    title: string;
    icon?: LucideIcon;
    tone?: 'neutral' | 'brand' | 'success' | 'warning';
    children: React.ReactNode;
}) {
    const tones = {
        neutral: 'bg-surface-container-high border-outline-variant',
        brand: 'bg-primary-fixed border-transparent',
        success: 'bg-success-container border-transparent',
        warning: 'bg-warning-container border-transparent',
    };
    const heads = {
        neutral: 'text-outline',
        brand: 'text-primary',
        success: 'text-on-success-container',
        warning: 'text-on-warning-container',
    };
    const bodies = {
        neutral: 'text-muted-foreground',
        brand: 'text-primary',
        success: 'text-on-success-container',
        warning: 'text-on-warning-container',
    };
    return (
        <div className={`p-3 rounded-xl border ${tones[tone]}`}>
            <h5
                className={`text-[11px] font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1.5 ${heads[tone]}`}
            >
                {Icon && <Icon className="h-3 w-3" />}
                {title}
            </h5>
            <div className={`text-sm leading-relaxed whitespace-pre-line ${bodies[tone]}`}>{children}</div>
        </div>
    );
}

const toList = (v: unknown, sep: RegExp): string[] =>
    Array.isArray(v)
        ? (v as string[])
        : String(v ?? '')
              .split(sep)
              .map((s) => s.trim())
              .filter(Boolean);

function RoundNode({ round, idx, isLast }: { round: any; idx: number; isLast: boolean }) {
    // All rounds expand by default — nested accordion-inside-modal scrolling
    // was confusing on mobile. The toggle still lets people collapse ones
    // they've read.
    const [open, setOpen] = useState(true);
    const { Icon, label } = getRound(round);
    const panelId = `round-panel-${idx}`;

    const questions: any[] = Array.isArray(round.questions) ? round.questions : [];
    const topics = round.topics ? toList(round.topics, /[,;\n]+/) : [];
    const sources = round.studySources ? toList(round.studySources, /[,;\n]+/) : [];
    const links: { type: string, url: string }[] = Array.isArray(round.links) ? round.links.filter((l: any) => l.url) : [];

    const getLinkIcon = (type: string) => {
        switch (type) {
            case 'youtube': return <Youtube className="h-4 w-4 shrink-0 text-red-500" />;
            case 'github': return <Github className="h-4 w-4 shrink-0" />;
            case 'drive': return <HardDrive className="h-4 w-4 shrink-0 text-blue-500" />;
            default: return <LinkIcon className="h-4 w-4 shrink-0 text-primary" />;
        }
    };

    return (
        <li className="relative pl-11">
            {/* rail */}
            {!isLast && <span className="absolute left-[15px] top-9 bottom-0 w-px bg-outline-variant" />}
            {/* node */}
            <span className="absolute left-0 top-1 w-8 h-8 rounded-full bg-primary-fixed text-primary flex items-center justify-center ring-4 ring-card">
                <Icon className="h-4 w-4" />
            </span>

            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls={panelId}
                className="w-full flex items-center gap-2 text-left py-1.5 min-h-11 cursor-pointer group/round rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
                <span className="min-w-0">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">
                        Round {round.roundNumber || idx + 1}
                    </span>
                    <span className="text-foreground font-semibold text-sm">{label}</span>
                </span>
                {round.duration && (
                    <span className="ml-auto shrink-0 text-[11px] text-outline flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {round.duration}
                    </span>
                )}
                <ChevronDown
                    className={`h-4 w-4 text-outline shrink-0 transition-transform ${round.duration ? '' : 'ml-auto'} ${open ? 'rotate-180' : ''}`}
                />
            </button>

            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        id={panelId}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="space-y-3 pt-1 pb-5">
                            {round.description && (
                                <Block title="Description">
                                    <ExpandableText text={round.description} />
                                </Block>
                            )}
                            {round.experience && (
                                <Block title="Experience">
                                    <ExpandableText text={round.experience} />
                                </Block>
                            )}
                            {round.problemStatement && (
                                <Block title="Problem Statement" tone="brand">
                                    {round.problemStatement}
                                </Block>
                            )}
                            {round.strategy && (
                                <Block title="Strategy Used" icon={Lightbulb} tone="success">
                                    {round.strategy}
                                </Block>
                            )}
                            {links.length > 0 && (
                                <div>
                                    <h5 className="text-[11px] font-semibold uppercase tracking-wider mb-2 text-outline flex items-center gap-1.5">
                                        <LinkIcon className="h-3 w-3" /> Links & Resources
                                    </h5>
                                    <div className="flex flex-col gap-2">
                                        {links.map((link, i) => (
                                            <a
                                                key={i}
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors p-2 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant"
                                            >
                                                {getLinkIcon(link.type)}
                                                <span className="truncate flex-1">{link.url}</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {topics.length > 0 && (
                                <div>
                                    <h5 className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 text-outline">
                                        Topics Covered
                                    </h5>
                                    <div className="flex flex-wrap gap-1.5">
                                        {topics.map((t, i) => (
                                            <span
                                                key={i}
                                                className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-surface-container text-muted-foreground border border-outline-variant"
                                            >
                                                {t}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {questions.length > 0 && (
                                <div>
                                    <h5 className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 text-outline">
                                        Questions Asked
                                    </h5>
                                    <ol className="space-y-2">
                                        {questions.map((q, qIdx) => (
                                            <li
                                                key={qIdx}
                                                className="p-3 rounded-xl bg-surface-container-high border border-outline-variant"
                                            >
                                                <p className="text-sm text-foreground font-medium">
                                                    <span className="text-primary mr-1.5 tabular-nums">Q{qIdx + 1}.</span>
                                                    {typeof q === 'string' ? q : q.question}
                                                </p>
                                                {typeof q !== 'string' && q.answerTip && (
                                                    <div className="mt-2 pl-3 border-l-2 border-primary/40 flex gap-1.5">
                                                        <Lightbulb className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                                                        <span className="text-sm text-muted-foreground italic">
                                                            {q.answerTip}
                                                        </span>
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            )}
                            {sources.length > 0 && (
                                <div>
                                    <h5 className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 text-outline">
                                        Study Sources
                                    </h5>
                                    <ul className="space-y-1">
                                        {sources.map((s, i) => (
                                            <li key={i} className="flex gap-1.5 text-sm text-muted-foreground">
                                                <BookOpen className="h-3.5 w-3.5 shrink-0 mt-0.5 text-outline" />
                                                {s}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {round.tips && (
                                <Block title="Tips" icon={Lightbulb} tone="warning">
                                    {round.tips}
                                </Block>
                            )}
                            {round.notes && (
                                <Block title="Notes" icon={Lightbulb} tone="warning">
                                    {round.notes}
                                </Block>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </li>
    );
}

export default function ExperienceModal({
    isOpen,
    onClose,
    company,
    role,
    ctc,
    studentName,
    courseBranch,
    batch,
    year,
    roleType,
    placementType,
    finalVerdict,
    minCGPA,
    historyOfBacklogs,
    standingBacklogs,
    resumeShortlisting,
    rounds = [],
    tags = [],
    overallExperience,
    tipsForJuniors,
    adminBanner,
    adminFooter,
}: ExperienceModalProps) {
    const [mounted, setMounted] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const titleId = useId();

    useEffect(() => setMounted(true), []);

    // Scroll lock
    useEffect(() => {
        if (!isOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [isOpen]);

    // ESC, focus trap, focus restore
    useEffect(() => {
        if (!isOpen) return;
        const opener = document.activeElement as HTMLElement | null;
        panelRef.current?.focus();

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
                return;
            }
            if (e.key !== 'Tab') return;
            const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
                'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
            );
            if (!focusables?.length) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };

        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('keydown', onKey);
            opener?.focus?.();
        };
    }, [isOpen, onClose]);

    if (!mounted) return null;

    const verdict =
        finalVerdict === 'selected'
            ? { label: 'Selected', Icon: CheckCircle2, cls: 'bg-success-container text-on-success-container' }
            : finalVerdict === 'rejected'
              ? { label: 'Not Selected', Icon: XCircle, cls: 'bg-error-container text-on-error-container' }
              : null;

    // minCGPA is coerced to 0 upstream, so 0 means "not specified" far more
    // often than it means a real zero requirement.
    const cgpaUnset = !minCGPA;

    const eligibility = [
        { label: 'Minimum CGPA', value: cgpaUnset ? 'Not specified' : String(minCGPA), hint: cgpaUnset },
        historyOfBacklogs && { label: 'History of Backlogs', value: historyOfBacklogs },
        standingBacklogs && { label: 'Standing Backlogs', value: standingBacklogs },
        { label: 'Resume Shortlisting', value: resumeShortlisting ? 'Yes' : 'Not mentioned' },
    ].filter(Boolean) as Array<{ label: string; value: string; hint?: boolean }>;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-stretch sm:items-center justify-center p-0 sm:p-4"
                    onClick={onClose}
                >
                    {/* Dim + blur: the backdrop was opaque, hiding the page entirely */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

                    <motion.div
                        ref={panelRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={titleId}
                        tabIndex={-1}
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full h-full sm:h-auto max-w-full sm:max-w-3xl max-h-full sm:max-h-[85dvh] flex flex-col rounded-none sm:rounded-2xl bg-card border-0 sm:border border-outline-variant shadow-2xl outline-none overflow-hidden"
                    >
                        {adminBanner}
                        {/* Header is a flex sibling, not absolute — it no longer scrolls away */}
                        <header className="shrink-0 border-b border-outline-variant bg-card">
                            <div className="p-5 sm:p-6 flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <h2
                                        id={titleId}
                                        className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2 min-w-0"
                                    >
                                        <Building2 className="h-5 w-5 text-primary shrink-0" />
                                        <span className="truncate">{company}</span>
                                    </h2>
                                    <p className="text-sm text-muted-foreground mt-1 ml-7 flex items-center gap-1.5 truncate">
                                        <Briefcase className="h-3.5 w-3.5 shrink-0" />
                                        {role}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2 mt-3 ml-7">
                                        {/* formatCompensation(0) returns "Prefer not to say" */}
                                        {ctc > 0 ? (
                                            <span className="flex items-center gap-0.5 text-success font-bold text-lg tabular-nums">
                                                <IndianRupee className="h-4 w-4" />
                                                {formatCompensation(ctc, roleType)}
                                            </span>
                                        ) : (
                                            <span className="text-sm text-outline italic">
                                                {formatCompensation(ctc, roleType)}
                                            </span>
                                        )}
                                        {verdict && (
                                            <span
                                                className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-full ${verdict.cls}`}
                                            >
                                                <verdict.Icon className="h-3.5 w-3.5" />
                                                {verdict.label}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    aria-label="Close experience details"
                                    className="shrink-0 p-2 rounded-full bg-surface-container hover:bg-surface-container-high border border-outline-variant text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </header>

                        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-6">
                            {/* Who */}
                            <div className="flex flex-wrap gap-2">
                                {[
                                    studentName,
                                    courseBranch,
                                    batch && `Batch ${batch}`,
                                    year && String(year),
                                    pretty(placementType),
                                    pretty(roleType),
                                ]
                                    .filter(Boolean)
                                    .map((v, i) => (
                                        <span
                                            key={i}
                                            className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-surface-container text-muted-foreground border border-outline-variant"
                                        >
                                            {v as string}
                                        </span>
                                    ))}
                            </div>

                            {/* Eligibility — the duplicate backlog pill row above this is gone */}
                            <section className="p-4 rounded-2xl bg-surface-container border border-outline-variant">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <GraduationCap className="h-4 w-4" />
                                    Eligibility Criteria
                                </h3>
                                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {eligibility.map((f) => (
                                        <div key={f.label} className="flex items-center gap-1.5">
                                            <dt className="text-xs text-outline">{f.label}:</dt>
                                            <dd
                                                className={`text-sm font-medium tabular-nums ${
                                                    f.value === 'Not Allowed'
                                                        ? 'text-destructive'
                                                        : f.value === 'Allowed'
                                                          ? 'text-success'
                                                          : 'text-foreground'
                                                }`}
                                            >
                                                {f.value}
                                            </dd>
                                            {f.hint && (
                                                <span
                                                    tabIndex={0}
                                                    role="note"
                                                    aria-label="Not specified means no minimum CGPA was given, or it was not mentioned"
                                                    title="No minimum CGPA was given, or it was not mentioned."
                                                    className="cursor-help rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                                >
                                                    <Info className="h-3.5 w-3.5 text-outline" />
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </dl>
                            </section>

                            {tags.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="px-3 py-1 text-xs font-medium rounded-full bg-primary-fixed text-primary"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Rounds as a timeline. There is no per-round outcome in the
                                schema, so the rail ends in the overall verdict. */}
                            {rounds.length > 0 && (
                                <section>
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                                        Interview Rounds ({rounds.length})
                                    </h3>
                                    <ol>
                                        {rounds.map((round, idx) => (
                                            <RoundNode
                                                key={idx}
                                                round={round}
                                                idx={idx}
                                                // The rail must reach the verdict node when there is one.
                                                isLast={idx === rounds.length - 1 && !verdict}
                                            />
                                        ))}
                                        {verdict && (
                                            <li className="relative pl-11 min-h-8">
                                                <span
                                                    className={`absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-card ${verdict.cls}`}
                                                >
                                                    <verdict.Icon className="h-4 w-4" />
                                                </span>
                                                <span className="text-sm font-semibold text-foreground leading-8">
                                                    {verdict.label}
                                                </span>
                                            </li>
                                        )}
                                    </ol>
                                </section>
                            )}

                            {overallExperience && (
                                <section className="p-4 rounded-2xl bg-surface-container border border-outline-variant">
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <Star className="h-4 w-4" />
                                        Overall Experience
                                    </h3>
                                    <ExpandableText text={overallExperience} />
                                </section>
                            )}

                            {/* The payload of the whole product — promoted from the
                                quietest block on the page to the loudest. */}
                            {tipsForJuniors && (
                                <section className="p-4 rounded-2xl bg-primary-fixed border border-primary/20">
                                    <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <Lightbulb className="h-4 w-4" />
                                        Tips for Juniors
                                    </h3>
                                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                                        {tipsForJuniors}
                                    </p>
                                </section>
                            )}
                        </div>
                        {adminFooter}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
