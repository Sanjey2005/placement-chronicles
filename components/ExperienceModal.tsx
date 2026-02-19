'use client';

import { useState } from 'react';
import { X, Building2, Briefcase, IndianRupee, GraduationCap, Clock, MessageSquare, Lightbulb, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCompensation } from '@/lib/utils';

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
    finalVerdict?: 'selected' | 'rejected';
    studentName?: string;
    minCGPA?: number;
    tipsForJuniors?: string;
    overallExperience?: string;
    placementType?: string;
    roleType?: string;
    historyOfBacklogs?: string;
    standingBacklogs?: string;
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

const ExpandableText = ({ text, limit = 150 }: { text: string; limit?: number }) => {
    const [expanded, setExpanded] = useState(false);

    if (!text) return null;

    if (text.length <= limit) {
        return <p className="text-sm text-white/70 leading-relaxed">{text}</p>;
    }

    return (
        <div className="relative">
            <p className={`text-sm text-white/70 leading-relaxed ${!expanded ? 'line-clamp-3' : ''}`}>
                {text}
            </p>
            {!expanded && (
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-slate-900/90 to-transparent pointer-events-none" />
            )}
            <button
                onClick={() => setExpanded(!expanded)}
                className="mt-1 text-xs text-violet-400 hover:text-violet-300 font-medium flex items-center gap-1 transition-colors"
            >
                {expanded ? 'Show Less' : 'Show More'}
            </button>
        </div>
    );
};

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
    minCGPA,
    tipsForJuniors,
    overallExperience,
    placementType,
    roleType,
    historyOfBacklogs,
    standingBacklogs,
}: ExperienceModalProps) {
    if (!isOpen) return null;

    const verdictConfig = {
        selected: { label: '✓ Selected', color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' },
        rejected: { label: '✗ Not Selected', color: 'text-red-400 bg-red-500/15 border-red-500/30' },
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
                                            {formatCompensation(ctc, roleType)}
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
                                    {placementType && (
                                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/25">
                                            🏢 {placementType.replace('_', ' ')}
                                        </span>
                                    )}
                                    {roleType && (
                                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-pink-500/15 text-pink-300 border border-pink-500/25">
                                            💼 {roleType.replace('_', ' ')}
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2 ml-10">
                                    {(historyOfBacklogs === 'Yes') && (
                                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-500/10 text-red-300 border border-red-500/20">
                                            History of Backlogs: {historyOfBacklogs}
                                        </span>
                                    )}
                                    {(standingBacklogs === 'Yes') && (
                                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-orange-500/10 text-orange-300 border border-orange-500/20">
                                            Standing Backlogs: {standingBacklogs}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* ── Eligibility ── */}
                            <div className="mb-6 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <GraduationCap className="h-4 w-4" />
                                    Eligibility Criteria
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {minCGPA !== undefined && (
                                        <div className="flex flex-col">
                                            <span className="text-xs text-white/40 uppercase">Minimum CGPA</span>
                                            <span className="text-white font-medium">{minCGPA}</span>
                                        </div>
                                    )}
                                    {historyOfBacklogs && (
                                        <div className="flex flex-col">
                                            <span className="text-xs text-white/40 uppercase">History of Backlogs</span>
                                            <span className={`font-medium ${historyOfBacklogs === 'Yes' ? 'text-red-400' : 'text-emerald-400'}`}>
                                                {historyOfBacklogs}
                                            </span>
                                        </div>
                                    )}
                                    {standingBacklogs && (
                                        <div className="flex flex-col">
                                            <span className="text-xs text-white/40 uppercase">Standing Backlogs</span>
                                            <span className={`font-medium ${standingBacklogs === 'Yes' ? 'text-red-400' : 'text-emerald-400'}`}>
                                                {standingBacklogs}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

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
                                                className="relative p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors"
                                            >
                                                {/* Round header */}
                                                <div className="flex items-center gap-3 mb-4">
                                                    <span className="text-2xl">{getRoundIcon(getRoundLabel(round))}</span>
                                                    <div>
                                                        <span className="text-xs font-bold text-violet-400 uppercase tracking-wider block mb-0.5">
                                                            Round {round.roundNumber || idx + 1}
                                                        </span>
                                                        <h4 className="text-white font-semibold text-base capitalize">
                                                            {getRoundLabel(round)}
                                                        </h4>
                                                    </div>
                                                    {round.duration && (
                                                        <span className="ml-auto text-xs text-white/40 flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md border border-white/5">
                                                            <Clock className="h-3 w-3" />
                                                            {round.duration}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="space-y-4 pl-1">
                                                    {/* Description */}
                                                    {round.description && (
                                                        <div>
                                                            <h5 className="text-xs font-semibold text-white/40 uppercase mb-1.5">Description</h5>
                                                            <ExpandableText text={round.description} />
                                                        </div>
                                                    )}

                                                    {/* Experience */}
                                                    {round.experience && (
                                                        <div>
                                                            <h5 className="text-xs font-semibold text-white/40 uppercase mb-1.5">Experience & Tasks</h5>
                                                            <ExpandableText text={round.experience} />
                                                        </div>
                                                    )}

                                                    {/* Problem Statement */}
                                                    {round.problemStatement && (
                                                        <div className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/10">
                                                            <h5 className="text-xs font-medium text-violet-300 mb-1">Problem Statement</h5>
                                                            <ExpandableText text={round.problemStatement} />
                                                        </div>
                                                    )}

                                                    {/* Strategy (New) */}
                                                    {round.strategy && (
                                                        <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                                                            <h5 className="text-xs font-medium text-emerald-300 mb-1 flex items-center gap-1">
                                                                <Lightbulb className="h-3 w-3" /> Strategy Used
                                                            </h5>
                                                            <ExpandableText text={round.strategy} />
                                                        </div>
                                                    )}

                                                    {/* Study Sources (New) */}
                                                    {round.studySources && round.studySources.length > 0 && (
                                                        <div>
                                                            <h5 className="text-xs font-semibold text-white/40 uppercase mb-2">Study Sources</h5>
                                                            <ul className="space-y-1">
                                                                {(Array.isArray(round.studySources) ? round.studySources : round.studySources.split(/[,;\n]+/).map((s: string) => s.trim()).filter(Boolean)).map((source: string, sIdx: number) => (
                                                                    <li key={sIdx} className="text-sm text-blue-400 hover:text-blue-300 underline underline-offset-2">
                                                                        <a href={source} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                                                                            🔗 {source}
                                                                        </a>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}

                                                    {/* Topics */}
                                                    {round.topics && (typeof round.topics === 'string' ? round.topics.length > 0 : round.topics.length > 0) && (
                                                        <div>
                                                            <h5 className="text-xs font-semibold text-white/40 uppercase mb-2">Topics Covered</h5>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {(Array.isArray(round.topics) ? round.topics : round.topics.split(/[,;]+/).map((s: string) => s.trim()).filter(Boolean)).map((topic: string, tIdx: number) => (
                                                                    <span key={tIdx} className="px-2.5 py-1 text-xs font-medium rounded-md bg-white/5 text-white/70 border border-white/10">
                                                                        {topic}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Questions */}
                                                    {round.questions && round.questions.length > 0 && (
                                                        <div>
                                                            <h5 className="text-xs font-semibold text-white/40 uppercase mb-2">Questions Asked</h5>
                                                            <div className="space-y-3">
                                                                {round.questions.map((q: any, qIdx: number) => (
                                                                    <div key={qIdx} className="bg-white/[0.02] p-3 rounded-lg border border-white/[0.04]">
                                                                        <p className="text-sm text-white/80 font-medium mb-1">
                                                                            <span className="text-violet-400 mr-2">Q{qIdx + 1}.</span>
                                                                            {typeof q === 'string' ? q : q.question}
                                                                        </p>
                                                                        {/* Answer/Tip for Question */}
                                                                        {typeof q !== 'string' && q.answerTip && (
                                                                            <div className="mt-2 pl-6 text-sm text-white/50 italic border-l-2 border-white/10">
                                                                                💡 {q.answerTip}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Round Notes/Tips (New) */}
                                                    {round.notes && (
                                                        <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/10">
                                                            <h5 className="text-xs font-medium text-orange-300 mb-1 flex items-center gap-1">
                                                                <Lightbulb className="h-3 w-3" /> Round Tips & Notes
                                                            </h5>
                                                            <ExpandableText text={round.notes} />
                                                        </div>
                                                    )}
                                                </div>
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
                                    <ExpandableText text={overallExperience} />
                                </div>
                            )}

                            {/* ── Tips ── */}
                            {tipsForJuniors && (
                                <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/[0.05] to-blue-500/[0.05] border border-violet-500/10">
                                    <h3 className="text-sm font-semibold text-violet-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <Lightbulb className="h-4 w-4" />
                                        Tips for Juniors
                                    </h3>
                                    <ExpandableText text={tipsForJuniors} />
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
