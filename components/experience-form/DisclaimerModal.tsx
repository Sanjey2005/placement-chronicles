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
        return <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>;
    }

    return (
        <div className="relative">
            <p className={`text-sm text-muted-foreground leading-relaxed ${!expanded ? 'line-clamp-3' : ''}`}>
                {text}
            </p>
            {!expanded && (
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent pointer-events-none" />
            )}
            <button
                onClick={() => setExpanded(!expanded)}
                type="button"
                className="mt-1 text-xs text-primary hover:text-primary font-medium flex items-center gap-1 transition-colors"
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
        selected: { label: '✓ Selected', color: 'text-emerald-700 bg-emerald-100 border-emerald-200' },
        rejected: { label: '✗ Not Selected', color: 'text-on-error-container bg-error-container border-transparent' },
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
                    <div className="absolute inset-0 bg-surface-container" onClick={onClose} />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-4xl h-[90vh] flex flex-col rounded-2xl bg-card border border-outline-variant shadow-2xl overflow-hidden"
                    >
                        {/* Top gradient accent */}
                        <div className="absolute top-0 left-0 right-0 h-1 z-20 bg-primary" />

                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-surface-container hover:bg-surface-container-high border border-outline-variant text-muted-foreground hover:text-foreground transition-all"
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
                                        <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
                                            <Building2 className="h-7 w-7 text-primary shrink-0" />
                                            {data.company}
                                        </h2>
                                        <p className="text-lg text-muted-foreground mt-1 flex items-center gap-2 ml-10">
                                            <Briefcase className="h-4 w-4" />
                                            {data.role}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="flex items-center gap-1 text-emerald-700 font-bold text-2xl">
                                            <IndianRupee className="h-6 w-6" />
                                            {/* Fix: safely handle potential missing values during draft */}
                                            {formatCompensation(data.ctc, data.roleType)}
                                        </div>
                                    </div>
                                </div>

                                {/* Meta pills */}
                                <div className="flex flex-wrap gap-2 mt-4 ml-10">
                                    {data.studentName && (
                                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-primary-fixed text-primary border border-outline-variant">
                                            👤 {data.studentName}
                                        </span>
                                    )}
                                    {data.batch && (
                                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-primary-fixed text-primary border border-transparent">
                                            🎓 Batch {data.batch}
                                        </span>
                                    )}
                                    {data.year && (
                                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-surface-container text-muted-foreground border border-outline-variant">
                                            📅 {data.year}
                                        </span>
                                    )}
                                    {data.finalVerdict && (
                                        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${verdictConfig[data.finalVerdict].color}`}>
                                            {verdictConfig[data.finalVerdict].label}
                                        </span>
                                    )}
                                    {data.placementType && (
                                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-primary-fixed text-primary border border-outline-variant">
                                            🏢 {data.placementType.replace('_', ' ')}
                                        </span>
                                    )}
                                    {data.roleType && (
                                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-secondary-fixed text-on-secondary-container">
                                            💼 {data.roleType.replace('_', ' ')}
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2 ml-10">
                                    {(data.historyOfBacklogs === 'Allowed') && (
                                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                                            History of Backlogs: Allowed
                                        </span>
                                    )}
                                    {(data.standingBacklogs === 'Allowed') && (
                                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                                            Standing Backlogs: Allowed
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* ── Eligibility ── */}
                            <div className="mb-6 p-4 rounded-xl bg-surface-container border border-outline-variant">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <GraduationCap className="h-4 w-4" />
                                    Eligibility Criteria
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {data.minCGPA !== undefined && (
                                        <div className="flex flex-col">
                                            <span className="text-xs text-outline uppercase">Minimum CGPA</span>
                                            <span className="text-foreground font-medium">{data.minCGPA}</span>
                                        </div>
                                    )}
                                    {data.historyOfBacklogs && (
                                        <div className="flex flex-col">
                                            <span className="text-xs text-outline uppercase">History of Backlogs</span>
                                            <span className={`font-medium ${data.historyOfBacklogs === 'Not Allowed' ? 'text-on-error-container' : 'text-emerald-700'}`}>
                                                {data.historyOfBacklogs}
                                            </span>
                                        </div>
                                    )}
                                    {data.standingBacklogs && (
                                        <div className="flex flex-col">
                                            <span className="text-xs text-outline uppercase">Standing Backlogs</span>
                                            <span className={`font-medium ${data.standingBacklogs === 'Not Allowed' ? 'text-on-error-container' : 'text-emerald-700'}`}>
                                                {data.standingBacklogs}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex flex-col">
                                        <span className="text-xs text-outline uppercase">Resume Shortlisting</span>
                                        <span className="font-medium text-foreground">
                                            {data.resumeShortlisting ? 'Yes' : 'No / Not Mentioned'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* ── Tags ── */}
                            {data.tags && data.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {data.tags.map((tag, idx) => (
                                        <span
                                            key={idx}
                                            className="px-3 py-1 text-xs font-medium rounded-full bg-surface-container text-muted-foreground border border-outline-variant"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* ── Interview Rounds ── */}
                            {data.rounds && data.rounds.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <MessageSquare className="h-4 w-4" />
                                        Interview Rounds ({data.rounds.length})
                                    </h3>
                                    <div className="space-y-3">
                                        {data.rounds.map((round, idx) => (
                                            <div
                                                key={idx}
                                                className="relative p-5 rounded-xl bg-surface-container border border-outline-variant hover:bg-surface-container-high transition-colors"
                                            >
                                                {/* Round header */}
                                                <div className="flex items-center gap-3 mb-4">
                                                    <span className="text-2xl">{getRoundIcon(round.type)}</span>
                                                    <div>
                                                        <span className="text-xs font-bold text-primary uppercase tracking-wider block mb-0.5">
                                                            Round {round.roundNumber || idx + 1}
                                                        </span>
                                                        <h4 className="text-foreground font-semibold text-base capitalize">
                                                            {getRoundLabel(round)}
                                                        </h4>
                                                    </div>
                                                </div>

                                                <div className="space-y-4 pl-1">

                                                    {/* Hackathon Specific */}
                                                    {round.type === 'hackathon' && (
                                                        <>
                                                            <div className="p-3 rounded-lg bg-primary-fixed border border-outline-variant">
                                                                <h5 className="text-xs font-medium text-primary mb-1">Problem Statement</h5>
                                                                <ExpandableText text={round.problemStatement} />
                                                            </div>
                                                            <div className="p-3 rounded-lg bg-emerald-100 border border-emerald-200">
                                                                <h5 className="text-xs font-medium text-emerald-700 mb-1 flex items-center gap-1">
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
                                                                    <h5 className="text-xs font-semibold text-outline uppercase mb-2">Topics Covered</h5>
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {round.topics.split(/[,;]+/).map((s) => s.trim()).filter(Boolean).map((topic, tIdx) => (
                                                                            <span key={tIdx} className="px-2.5 py-1 text-xs font-medium rounded-md bg-surface-container text-muted-foreground border border-outline-variant">
                                                                                {topic}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {round.studySources && (
                                                                <div>
                                                                    <h5 className="text-xs font-semibold text-outline uppercase mb-2">Study Sources</h5>
                                                                    <p className="text-sm text-muted-foreground">{round.studySources}</p>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}


                                                    {/* Interview Specific */}
                                                    {round.type === 'interview' && (
                                                        <>
                                                            {round.questions && round.questions.length > 0 && (
                                                                <div>
                                                                    <h5 className="text-xs font-semibold text-outline uppercase mb-2">Questions Asked</h5>
                                                                    <div className="space-y-3">
                                                                        {round.questions.map((q, qIdx) => (
                                                                            <div key={qIdx} className="bg-surface-container p-3 rounded-lg border border-outline-variant">
                                                                                <p className="text-sm text-muted-foreground font-medium mb-1">
                                                                                    <span className="text-primary mr-2">Q{qIdx + 1}.</span>
                                                                                    {q.question}
                                                                                </p>
                                                                                {/* Answer/Tip for Question */}
                                                                                {q.answerTip && (
                                                                                    <div className="mt-2 pl-6 text-sm text-muted-foreground italic border-l-2 border-outline-variant">
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
                                                                <div className="flex items-center gap-2 text-xs text-outline">
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
                                <div className="mb-6 p-4 rounded-xl bg-surface-container border border-outline-variant">
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <Star className="h-4 w-4" />
                                        Overall Experience
                                    </h3>
                                    <ExpandableText text={data.overallExperience} />
                                </div>
                            )}

                            {/* ── Tips ── */}
                            {data.tipsForJuniors && (
                                <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant">
                                    <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <Lightbulb className="h-4 w-4" />
                                        Tips for Juniors
                                    </h3>
                                    <ExpandableText text={data.tipsForJuniors} />
                                </div>
                            )}
                        </div>

                        {/* Sticky Bottom Actions */}
                        <div className="absolute bottom-0 left-0 right-0 bg-card border-t border-outline-variant p-4 sm:p-6 z-30">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6 w-full">
                                <label className="flex items-start gap-3 cursor-pointer group flex-1 min-w-0">
                                    <div className="relative flex items-center pt-1 shrink-0">
                                        <input
                                            type="checkbox"
                                            checked={isConfirmed}
                                            onChange={(e) => setIsConfirmed(e.target.checked)}
                                            className="peer h-5 w-5 rounded border-outline-variant bg-surface-container text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer transition-all shrink-0"
                                        />
                                    </div>
                                    <span className="text-sm text-muted-foreground group-hover:text-muted-foreground transition-colors select-none leading-relaxed">
                                        I confirm that all the information entered above is correct. I understand that I cannot edit this experience once submitted.
                                    </span>
                                </label>

                                <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-end mt-2 md:mt-0 border-t border-outline-variant md:border-t-0 pt-4 md:pt-0">
                                    <button
                                        onClick={onClose}
                                        className="flex-1 md:flex-none px-6 py-3 rounded-xl font-medium text-muted-foreground hover:text-foreground hover:bg-surface-container-high transition-all"
                                    >
                                        Back to Edit
                                    </button>
                                    <button
                                        onClick={onConfirm}
                                        disabled={!isConfirmed || isSubmitting}
                                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold transition-all duration-300 ${isConfirmed && !isSubmitting
                                            ? 'bg-primary text-primary-foreground shadow-m3 hover:shadow-lg hover:bg-primary/90 transform hover:scale-[1.02]'
                                            : 'bg-surface-container-highest text-outline cursor-not-allowed'
                                            }`}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-outline-variant border-t-primary rounded-full animate-spin" />
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
