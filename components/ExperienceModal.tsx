'use client';

import { X, Building2, Briefcase, IndianRupee, GraduationCap, Clock, MessageSquare, Lightbulb, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ExperienceModalProps {
    isOpen: boolean;
    onClose: () => void;
    company: string;
    role: string;
    ctc: number;
    rounds?: any[];
    tags?: string[];
    year?: number;
    batch?: string;
    finalVerdict?: 'selected' | 'rejected' | 'waitlisted' | 'ongoing';
    studentName?: string;
    eligibilityCriteria?: string;
    tipsForJuniors?: string;
    overallExperience?: string;
}

function getRoundIcon(type: string) {
    switch (type?.toLowerCase()) {
        case 'test':
        case 'online assessment':
        case 'online test':
            return '📝';
        case 'technical':
        case 'interview':
            return '💻';
        case 'hr':
            return '🤝';
        case 'managerial':
            return '👔';
        case 'hackathon':
            return '🏆';
        case 'group discussion':
            return '💬';
        default:
            return '📋';
    }
}

function getRoundLabel(round: any): string {
    return round.roundType || round.interviewType || round.type || 'Round';
}

export default function ExperienceModal({
    isOpen,
    onClose,
    company,
    role,
    ctc,
    rounds = [],
    tags = [],
    year,
    batch,
    finalVerdict,
    studentName,
    eligibilityCriteria,
    tipsForJuniors,
    overallExperience,
}: ExperienceModalProps) {
    if (!isOpen) return null;

    const verdictConfig = {
        selected: { label: '✓ Selected', color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' },
        rejected: { label: '✗ Not Selected', color: 'text-red-400 bg-red-500/15 border-red-500/30' },
        waitlisted: { label: '⏳ Waitlisted', color: 'text-amber-400 bg-amber-500/15 border-amber-500/30' },
        ongoing: { label: '🔄 Ongoing', color: 'text-sky-400 bg-sky-500/15 border-sky-500/30' },
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl bg-slate-950/95 border border-white/10 shadow-2xl shadow-purple-500/10"
                    >
                        {/* Top gradient accent */}
                        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r from-blue-500 via-violet-500 to-purple-500" />

                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <div className="p-8">
                            {/* ── Header ── */}
                            <div className="mb-6">
                                <div className="flex items-start justify-between gap-4 pr-10">
                                    <div>
                                        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                                            <Building2 className="h-7 w-7 text-blue-400 shrink-0" />
                                            {company}
                                        </h2>
                                        <p className="text-lg text-white/70 mt-1 flex items-center gap-2 ml-10">
                                            <Briefcase className="h-4 w-4" />
                                            {role}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="flex items-center gap-1 text-emerald-400 font-bold text-2xl">
                                            <IndianRupee className="h-6 w-6" />
                                            {ctc} LPA
                                        </div>
                                    </div>
                                </div>

                                {/* Meta pills */}
                                <div className="flex flex-wrap gap-2 mt-4 ml-10">
                                    {studentName && (
                                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/25">
                                            👤 {studentName}
                                        </span>
                                    )}
                                    {batch && (
                                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/25">
                                            🎓 Batch {batch}
                                        </span>
                                    )}
                                    {year && (
                                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-white/5 text-white/60 border border-white/10">
                                            📅 {year}
                                        </span>
                                    )}
                                    {finalVerdict && (
                                        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${verdictConfig[finalVerdict].color}`}>
                                            {verdictConfig[finalVerdict].label}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* ── Eligibility ── */}
                            {eligibilityCriteria && (
                                <div className="mb-6 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                    <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <GraduationCap className="h-4 w-4" />
                                        Eligibility Criteria
                                    </h3>
                                    <p className="text-white/80 text-sm">{eligibilityCriteria}</p>
                                </div>
                            )}

                            {/* ── Tags ── */}
                            {tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {tags.map((tag, idx) => (
                                        <span
                                            key={idx}
                                            className="px-3 py-1 text-xs font-medium rounded-full bg-white/[0.06] text-white/80 border border-white/10"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* ── Interview Rounds ── */}
                            {rounds.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <MessageSquare className="h-4 w-4" />
                                        Interview Rounds ({rounds.length})
                                    </h3>
                                    <div className="space-y-3">
                                        {rounds.map((round, idx) => (
                                            <div
                                                key={idx}
                                                className="relative p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors"
                                            >
                                                {/* Round header */}
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="text-lg">{getRoundIcon(getRoundLabel(round))}</span>
                                                    <div>
                                                        <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">
                                                            Round {round.roundNumber || idx + 1}
                                                        </span>
                                                        <h4 className="text-white font-semibold text-sm capitalize">
                                                            {getRoundLabel(round)}
                                                        </h4>
                                                    </div>
                                                    {round.duration && (
                                                        <span className="ml-auto text-xs text-white/40 flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            {round.duration}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Description */}
                                                {round.description && (
                                                    <p className="text-sm text-white/60 leading-relaxed mb-2 ml-9">
                                                        {round.description}
                                                    </p>
                                                )}

                                                {/* Experience (hackathon) */}
                                                {round.experience && (
                                                    <p className="text-sm text-white/60 leading-relaxed mb-2 ml-9">
                                                        {round.experience}
                                                    </p>
                                                )}

                                                {/* Problem Statement (hackathon) */}
                                                {round.problemStatement && (
                                                    <div className="ml-9 mb-2 p-3 rounded-lg bg-violet-500/5 border border-violet-500/10">
                                                        <p className="text-xs text-violet-300 font-medium mb-1">Problem Statement</p>
                                                        <p className="text-sm text-white/70">{round.problemStatement}</p>
                                                    </div>
                                                )}

                                                {/* Topics (online test) */}
                                                {round.topics && round.topics.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5 ml-9 mb-2">
                                                        {round.topics.map((topic: string, tIdx: number) => (
                                                            <span key={tIdx} className="px-2 py-0.5 text-xs rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                                                                {topic}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Questions */}
                                                {round.questions && round.questions.length > 0 && (
                                                    <ul className="space-y-1.5 ml-9">
                                                        {round.questions.map((q: any, qIdx: number) => (
                                                            <li key={qIdx} className="text-sm text-white/70 flex items-start gap-2">
                                                                <span className="text-violet-400 mt-0.5 shrink-0">▸</span>
                                                                <span>{typeof q === 'string' ? q : q.question}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── Overall Experience ── */}
                            {overallExperience && (
                                <div className="mb-6 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                    <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <Star className="h-4 w-4" />
                                        Overall Experience
                                    </h3>
                                    <p className="text-sm text-white/70 leading-relaxed">{overallExperience}</p>
                                </div>
                            )}

                            {/* ── Tips ── */}
                            {tipsForJuniors && (
                                <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/[0.05] to-blue-500/[0.05] border border-violet-500/10">
                                    <h3 className="text-sm font-semibold text-violet-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <Lightbulb className="h-4 w-4" />
                                        Tips for Juniors
                                    </h3>
                                    <p className="text-sm text-white/70 leading-relaxed">{tipsForJuniors}</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
