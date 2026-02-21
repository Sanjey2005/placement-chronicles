'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Building2, Briefcase, IndianRupee, GraduationCap, Clock, MessageSquare, Lightbulb, Star, AlertTriangle, CheckCircle2 } from 'lucide-react'; // Added CheckCircle2
import { motion, AnimatePresence } from 'framer-motion';
import { formatCompensation } from '@/lib/utils';
import { ExperienceFormData } from '@/lib/schemas/experience-schema';

interface DisclaimerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    data: ExperienceFormData;
    isSubmitting?: boolean;
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
    if (round.type === 'test') return 'Online Test';
    if (round.type === 'hackathon') return 'Hackathon';
    if (round.type === 'interview') return round.interviewType || 'Interview';
    return 'Round';
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
                type="button"
                className="mt-1 text-xs text-violet-400 hover:text-violet-300 font-medium flex items-center gap-1 transition-colors"
            >
                {expanded ? 'Show Less' : 'Show More'}
            </button>
        </div>
    );
};

export default function DisclaimerModal({
    isOpen,
    onClose,
    onConfirm,
    data,
    isSubmitting = false
}: DisclaimerModalProps) {
    // Checkbox state
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Handle ESC key press
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Reset confirmation when modal opens
    useEffect(() => {
        if (isOpen) setIsConfirmed(false);
    }, [isOpen]);

    const verdictConfig = {
        selected: { label: '✓ Selected', color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' },
        rejected: { label: '✗ Not Selected', color: 'text-red-400 bg-red-500/15 border-red-500/30' },
    };

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-4xl h-[90vh] flex flex-col rounded-2xl bg-slate-950 border border-white/10 shadow-2xl shadow-purple-500/10 overflow-hidden"
                    >
                        {/* Top gradient accent */}
                        <div className="absolute top-0 left-0 right-0 h-1 z-20 bg-gradient-to-r from-blue-500 via-violet-500 to-purple-500" />

                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-8 pb-32">
                            {/* Warning Banner */}
                            <div className="mb-8 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex gap-4 items-start">
                                <div className="p-2 bg-orange-500/20 rounded-full shrink-0">
                                    <AlertTriangle className="h-6 w-6 text-orange-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-orange-100">Review Your Submission</h3>
                                    <p className="text-orange-200/70 text-sm mt-1">
                                        Please carefully review the information below. Once submitted, you cannot edit this experience.
                                    </p>
                                </div>
                            </div>

                            {/* ── Header ── */}
                            <div className="mb-6">
                                <div className="flex items-start justify-between gap-4 pr-10">
                                    <div>
                                        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                                            <Building2 className="h-7 w-7 text-blue-400 shrink-0" />
                                            {data.company}
                                        </h2>
                                        <p className="text-lg text-white/70 mt-1 flex items-center gap-2 ml-10">
                                            <Briefcase className="h-4 w-4" />
                                            {data.role}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="flex items-center gap-1 text-emerald-400 font-bold text-2xl">
                                            <IndianRupee className="h-6 w-6" />
                                            {/* Fix: safely handle potential missing values during draft */}
                                            {formatCompensation(data.ctc, data.roleType)}
                                        </div>
                                    </div>
                                </div>

                                {/* Meta pills */}
                                <div className="flex flex-wrap gap-2 mt-4 ml-10">
                                    {data.studentName && (
                                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/25">
                                            👤 {data.studentName}
                                        </span>
                                    )}
                                    {data.batch && (
                                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/25">
                                            🎓 Batch {data.batch}
                                        </span>
                                    )}
                                    {data.year && (
                                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-white/5 text-white/60 border border-white/10">
                                            📅 {data.year}
                                        </span>
                                    )}
                                    {data.finalVerdict && (
                                        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${verdictConfig[data.finalVerdict].color}`}>
                                            {verdictConfig[data.finalVerdict].label}
                                        </span>
                                    )}
                                    {data.placementType && (
                                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/25">
                                            🏢 {data.placementType.replace('_', ' ')}
                                        </span>
                                    )}
                                    {data.roleType && (
                                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-pink-500/15 text-pink-300 border border-pink-500/25">
                                            💼 {data.roleType.replace('_', ' ')}
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2 ml-10">
                                    {(data.historyOfBacklogs === 'Yes') && (
                                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-500/10 text-red-300 border border-red-500/20">
                                            History of Backlogs: {data.historyOfBacklogs}
                                        </span>
                                    )}
                                    {(data.standingBacklogs === 'Yes') && (
                                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-orange-500/10 text-orange-300 border border-orange-500/20">
                                            Standing Backlogs: {data.standingBacklogs}
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
                                    {data.minCGPA !== undefined && (
                                        <div className="flex flex-col">
                                            <span className="text-xs text-white/40 uppercase">Minimum CGPA</span>
                                            <span className="text-white font-medium">{data.minCGPA}</span>
                                        </div>
                                    )}
                                    {data.historyOfBacklogs && (
                                        <div className="flex flex-col">
                                            <span className="text-xs text-white/40 uppercase">History of Backlogs</span>
                                            <span className={`font-medium ${data.historyOfBacklogs === 'Yes' ? 'text-red-400' : 'text-emerald-400'}`}>
                                                {data.historyOfBacklogs}
                                            </span>
                                        </div>
                                    )}
                                    {data.standingBacklogs && (
                                        <div className="flex flex-col">
                                            <span className="text-xs text-white/40 uppercase">Standing Backlogs</span>
                                            <span className={`font-medium ${data.standingBacklogs === 'Yes' ? 'text-red-400' : 'text-emerald-400'}`}>
                                                {data.standingBacklogs}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ── Tags ── */}
                            {data.tags && data.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {data.tags.map((tag, idx) => (
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
                            {data.rounds && data.rounds.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <MessageSquare className="h-4 w-4" />
                                        Interview Rounds ({data.rounds.length})
                                    </h3>
                                    <div className="space-y-3">
                                        {data.rounds.map((round, idx) => (
                                            <div
                                                key={idx}
                                                className="relative p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors"
                                            >
                                                {/* Round header */}
                                                <div className="flex items-center gap-3 mb-4">
                                                    <span className="text-2xl">{getRoundIcon(round.type)}</span>
                                                    <div>
                                                        <span className="text-xs font-bold text-violet-400 uppercase tracking-wider block mb-0.5">
                                                            Round {round.roundNumber || idx + 1}
                                                        </span>
                                                        <h4 className="text-white font-semibold text-base capitalize">
                                                            {getRoundLabel(round)}
                                                        </h4>
                                                    </div>
                                                </div>

                                                <div className="space-y-4 pl-1">

                                                    {/* Hackathon Specific */}
                                                    {round.type === 'hackathon' && (
                                                        <>
                                                            <div className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/10">
                                                                <h5 className="text-xs font-medium text-violet-300 mb-1">Problem Statement</h5>
                                                                <ExpandableText text={round.problemStatement} />
                                                            </div>
                                                            <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                                                                <h5 className="text-xs font-medium text-emerald-300 mb-1 flex items-center gap-1">
                                                                    <Lightbulb className="h-3 w-3" /> Strategy Used
                                                                </h5>
                                                                <ExpandableText text={round.strategy} />
                                                            </div>
                                                        </>
                                                    )}

                                                    {/* Online Test Specific */}
                                                    {round.type === 'test' && (
                                                        <>
                                                            {round.topics && (
                                                                <div>
                                                                    <h5 className="text-xs font-semibold text-white/40 uppercase mb-2">Topics Covered</h5>
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {round.topics.split(/[,;]+/).map((s) => s.trim()).filter(Boolean).map((topic, tIdx) => (
                                                                            <span key={tIdx} className="px-2.5 py-1 text-xs font-medium rounded-md bg-white/5 text-white/70 border border-white/10">
                                                                                {topic}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {round.studySources && (
                                                                <div>
                                                                    <h5 className="text-xs font-semibold text-white/40 uppercase mb-2">Study Sources</h5>
                                                                    <p className="text-sm text-white/70">{round.studySources}</p>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}


                                                    {/* Interview Specific */}
                                                    {round.type === 'interview' && (
                                                        <>
                                                            {round.questions && round.questions.length > 0 && (
                                                                <div>
                                                                    <h5 className="text-xs font-semibold text-white/40 uppercase mb-2">Questions Asked</h5>
                                                                    <div className="space-y-3">
                                                                        {round.questions.map((q, qIdx) => (
                                                                            <div key={qIdx} className="bg-white/[0.02] p-3 rounded-lg border border-white/[0.04]">
                                                                                <p className="text-sm text-white/80 font-medium mb-1">
                                                                                    <span className="text-violet-400 mr-2">Q{qIdx + 1}.</span>
                                                                                    {q.question}
                                                                                </p>
                                                                                {/* Answer/Tip for Question */}
                                                                                {q.answerTip && (
                                                                                    <div className="mt-2 pl-6 text-sm text-white/50 italic border-l-2 border-white/10">
                                                                                        💡 {q.answerTip}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {round.notes && (
                                                                <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/10">
                                                                    <h5 className="text-xs font-medium text-orange-300 mb-1 flex items-center gap-1">
                                                                        <Lightbulb className="h-3 w-3" /> Round Tips & Notes
                                                                    </h5>
                                                                    <ExpandableText text={round.notes} />
                                                                </div>
                                                            )}
                                                            {round.duration && (
                                                                <div className="flex items-center gap-2 text-xs text-white/40">
                                                                    <Clock className="h-3 w-3" /> Duration: {round.duration}
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── Overall Experience ── */}
                            {data.overallExperience && (
                                <div className="mb-6 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                    <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <Star className="h-4 w-4" />
                                        Overall Experience
                                    </h3>
                                    <ExpandableText text={data.overallExperience} />
                                </div>
                            )}

                            {/* ── Tips ── */}
                            {data.tipsForJuniors && (
                                <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/[0.05] to-blue-500/[0.05] border border-violet-500/10">
                                    <h3 className="text-sm font-semibold text-violet-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <Lightbulb className="h-4 w-4" />
                                        Tips for Juniors
                                    </h3>
                                    <ExpandableText text={data.tipsForJuniors} />
                                </div>
                            )}
                        </div>

                        {/* Sticky Bottom Actions */}
                        <div className="absolute bottom-0 left-0 right-0 bg-slate-950/80 backdrop-blur-xl border-t border-white/10 p-4 sm:p-6 z-30">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6 w-full">
                                <label className="flex items-start gap-3 cursor-pointer group flex-1 min-w-0">
                                    <div className="relative flex items-center pt-1 shrink-0">
                                        <input
                                            type="checkbox"
                                            checked={isConfirmed}
                                            onChange={(e) => setIsConfirmed(e.target.checked)}
                                            className="peer h-5 w-5 rounded border-white/30 bg-white/5 text-violet-500 focus:ring-violet-500 focus:ring-offset-0 cursor-pointer transition-all shrink-0"
                                        />
                                    </div>
                                    <span className="text-sm text-white/60 group-hover:text-white/80 transition-colors select-none leading-relaxed">
                                        I confirm that all the information entered above is correct. I understand that I cannot edit this experience once submitted.
                                    </span>
                                </label>

                                <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-end mt-2 md:mt-0 border-t border-white/5 md:border-t-0 pt-4 md:pt-0">
                                    <button
                                        onClick={onClose}
                                        className="flex-1 md:flex-none px-6 py-3 rounded-xl font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all"
                                    >
                                        Back to Edit
                                    </button>
                                    <button
                                        onClick={onConfirm}
                                        disabled={!isConfirmed || isSubmitting}
                                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold transition-all duration-300 ${isConfirmed && !isSubmitting
                                            ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] hover:bg-zinc-100 transform hover:scale-[1.02]'
                                            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                            }`}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-zinc-500 border-t-zinc-300 rounded-full animate-spin" />
                                                Submitting...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="h-5 w-5" />
                                                Confirm & Submit
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    if (!mounted) return null;

    return createPortal(modalContent, document.body);
}
