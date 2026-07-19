'use client';

import { motion } from 'framer-motion';
import { Briefcase, IndianRupee, ArrowUpRight, CheckCircle2, XCircle, Layers } from 'lucide-react';
import { formatCompensation, relativeTime } from '@/lib/utils';

interface ExperienceCardProps {
    role: string;
    ctc: number;
    studentName?: string;
    courseBranch?: string;
    batch?: string;
    year?: number;
    roleType?: string;
    placementType?: string;
    finalVerdict?: 'selected' | 'rejected';
    rounds?: unknown[];
    tags?: string[];
    createdAt?: string | Date;
    index: number;
    onOpen: () => void;
}

const VERDICT = {
    selected: { label: 'Selected', Icon: CheckCircle2, cls: 'bg-success-container text-on-success-container' },
    rejected: { label: 'Not Selected', Icon: XCircle, cls: 'bg-error-container text-on-error-container' },
} as const;

function Meta({ children }: { children: React.ReactNode }) {
    return (
        <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-surface-container text-muted-foreground border border-outline-variant">
            {children}
        </span>
    );
}

export default function ExperienceCard({
    role,
    ctc,
    studentName,
    courseBranch,
    batch,
    year,
    roleType,
    placementType,
    finalVerdict,
    rounds = [],
    tags = [],
    createdAt,
    index,
    onOpen,
}: ExperienceCardProps) {
    const verdict = finalVerdict ? VERDICT[finalVerdict] : null;
    const shared = relativeTime(createdAt);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.3 }}
            whileTap={{ scale: 0.98 }}
            role="button"
            tabIndex={0}
            aria-label={`${role}${studentName ? ` by ${studentName}` : ''} — view full experience`}
            onClick={onOpen}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpen();
                }
            }}
            className="cursor-pointer group h-full rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
            <article className="relative h-full flex flex-col rounded-2xl bg-card border border-outline-variant p-5 shadow-m3 transition-[box-shadow,border-color] duration-300 group-hover:border-primary/40 group-hover:shadow-xl">
                <ArrowUpRight className="absolute top-5 right-5 h-4 w-4 text-primary opacity-0 -translate-y-1 translate-x-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0" />

                {/* Role + author */}
                <div className="pr-6">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2 min-w-0">
                        <Briefcase className="h-4 w-4 text-primary shrink-0" />
                        <span className="truncate">{role}</span>
                    </h3>
                    {(studentName || courseBranch) && (
                        <p className="text-xs text-outline mt-1 ml-6 truncate">
                            {[studentName && `by ${studentName}`, courseBranch].filter(Boolean).join(' · ')}
                        </p>
                    )}
                </div>

                {/* CTC is the hero figure; verdict never signals by colour alone. */}
                <div className="flex items-center justify-between gap-3 mt-4">
                    {/* formatCompensation(0) is the words "Prefer not to say" — don't
                        give that the rupee glyph and hero-number treatment. */}
                    {ctc > 0 ? (
                        <span className="flex items-center gap-0.5 text-success font-bold text-xl tabular-nums">
                            <IndianRupee className="h-4 w-4 shrink-0" />
                            {formatCompensation(ctc, roleType)}
                        </span>
                    ) : (
                        <span className="text-sm text-outline italic">{formatCompensation(ctc, roleType)}</span>
                    )}
                    {verdict && (
                        <span
                            className={`shrink-0 flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${verdict.cls}`}
                        >
                            <verdict.Icon className="h-3.5 w-3.5" />
                            {verdict.label}
                        </span>
                    )}
                </div>

                {/* One meta row, not three */}
                <div className="flex flex-wrap items-center gap-1.5 mt-4">
                    {batch && <Meta>Batch {batch}</Meta>}
                    {roleType && <Meta>{roleType.replaceAll('_', ' ').toLowerCase()}</Meta>}
                    {placementType && <Meta>{placementType.replaceAll('_', ' ').toLowerCase()}</Meta>}
                    {year && <Meta>{year}</Meta>}
                </div>

                {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {tags.slice(0, 5).map((tag) => (
                            <span
                                key={tag}
                                className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-primary-fixed text-primary"
                            >
                                {tag}
                            </span>
                        ))}
                        {tags.length > 5 && (
                            <span className="px-2 py-0.5 text-xs text-outline">+{tags.length - 5} more</span>
                        )}
                    </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-4 mt-auto text-xs text-outline">
                    <span className="flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5" />
                        {rounds.length} round{rounds.length === 1 ? '' : 's'}
                    </span>
                    {shared && <span className="truncate">{shared}</span>}
                </div>
            </article>
        </motion.div>
    );
}
