'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    AlertTriangle,
    CheckCircle2,
    XCircle,
    User,
    Building2,
    Calendar,
    FileText,
    Briefcase,
    IndianRupee,
    GraduationCap,
    Clock,
    MessageSquare,
    Lightbulb,
    Star,
    ChevronDown,
    ChevronUp,
    Info
} from 'lucide-react';
import { formatCompensation } from '@/lib/utils';

interface Experience {
    _id: string;
    studentName?: string;
    studentId: string;
    company: string;
    role: string;
    ctc: number;
    batch?: string;
    status: string;
    moderationReason?: string;
    createdAt: string;
    rounds?: any[];
    tipsForJuniors?: string;
    overallExperience?: string;
    placementType?: string;
    roleType?: string;
    historyOfBacklogs?: string;
    standingBacklogs?: string;
    minCGPA?: number;
    resumeShortlisting?: boolean;
    tags?: string[];
    year?: number;
    finalVerdict?: 'selected' | 'rejected';
}

interface ReviewModalProps {
    experience: Experience | null;
    isOpen: boolean;
    onClose: () => void;
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
    isLoading: boolean;
}

function getRoundIcon(type: string) {
    switch (type?.toLowerCase()) {
        case 'test':
        case 'online assessment':
        case 'online test': return '📝';
        case 'technical':
        case 'interview': return '💻';
        case 'hr': return '🤝';
        case 'managerial': return '👔';
        case 'hackathon': return '🏆';
        case 'group discussion': return '💬';
        default: return '📋';
    }
}

function getRoundLabel(round: any): string {
    return round.roundType || round.interviewType || round.type || 'Round';
}

const ExpandableText = ({ text, limit = 150 }: { text: string; limit?: number }) => {
    const [expanded, setExpanded] = useState(false);
    if (!text) return null;
    if (text.length <= limit) return <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{text}</p>;
    return (
        <div className="relative">
            <p className={`text-sm text-white/70 leading-relaxed whitespace-pre-wrap ${!expanded ? 'line-clamp-3' : ''}`}>{text}</p>
            {!expanded && <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-900/40 to-transparent pointer-events-none" />}
            <button
                onClick={() => setExpanded(!expanded)}
                className="mt-1 text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 transition-colors"
            >
                {expanded ? 'Show Less' : 'Show More'}
            </button>
        </div>
    );
};

export function ReviewModal({ experience, isOpen, onClose, onApprove, onReject, isLoading }: ReviewModalProps) {
    const [showRaw, setShowRaw] = useState(false);

    if (!experience) return null;

    const verdictConfig = {
        selected: { label: '✓ Selected', color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' },
        rejected: { label: '✗ Not Selected', color: 'text-red-400 bg-red-500/15 border-red-500/30' },
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="!max-w-[75vw] w-[75vw] h-[90vh] flex flex-col bg-slate-950 text-white border-white/10 p-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b border-white/10 bg-slate-900 shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <ShieldAlertIcon status={experience.status} />
                        Review Experience
                    </DialogTitle>
                    <DialogDescription className="text-white/60">
                        {experience.status === 'FLAGGED' ? 'This experience has been flagged by AI for review.' : 'Reviewing experience details.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                    {/* Moderation Alert (Fixed at top if flagged) */}
                    {experience.moderationReason && (
                        <div className="px-6 py-4 bg-red-500/10 border-b border-red-500/10 flex gap-3 items-start shrink-0">
                            <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h4 className="font-semibold text-red-400 text-sm">Flagged Reason</h4>
                                <p className="text-white/90 text-sm mt-1 whitespace-pre-wrap">{experience.moderationReason}</p>
                            </div>
                        </div>
                    )}

                    <ScrollArea className="flex-1 h-full w-full">
                        <div className="p-6 space-y-8 pb-20">
                            {/* ── Header Info ── */}
                            <div className="flex flex-col md:flex-row gap-6 justify-between items-start">
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                        <Building2 className="h-6 w-6 text-blue-400" />
                                        {experience.company}
                                    </h2>
                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/70">
                                        <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4" /> {experience.role}</span>
                                        <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> Batch {experience.batch || 'N/A'}</span>
                                        <span className="flex items-center gap-1.5 text-emerald-400 font-medium"><IndianRupee className="h-4 w-4" /> {formatCompensation(experience.ctc, experience.roleType)}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-xs pt-1">
                                        <span className="px-2 py-1 bg-white/5 rounded border border-white/10 text-white/60 flex items-center gap-1">
                                            <User className="h-3 w-3" /> {experience.studentName || 'Anonymous'} ({experience.studentId})
                                        </span>
                                        {experience.finalVerdict && (
                                            <span className={`px-2 py-1 rounded border ${verdictConfig[experience.finalVerdict]?.color || 'border-white/10'}`}>
                                                {verdictConfig[experience.finalVerdict]?.label || experience.finalVerdict}
                                            </span>
                                        )}
                                        {experience.placementType && (
                                            <span className="px-2 py-1 bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded">
                                                {experience.placementType.replace('_', ' ')}
                                            </span>
                                        )}
                                        {experience.roleType && (
                                            <span className="px-2 py-1 bg-pink-500/10 text-pink-300 border border-pink-500/20 rounded">
                                                {experience.roleType.replace('_', ' ')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ── Eligibility & Tags ── */}
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                                    <h3 className="text-xs font-semibold text-white/40 uppercase flex items-center gap-2"><GraduationCap className="h-3.5 w-3.5" /> Eligibility</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-white/50 block text-xs">Min CGPA</span>
                                            <span className="text-white font-medium flex items-center gap-1.5">
                                                {experience.minCGPA ?? '—'}
                                                {experience.minCGPA === 0 && (
                                                    <div className="group relative pr-4">
                                                        <Info className="h-3.5 w-3.5 text-white/40 hover:text-white/80 cursor-help transition-colors" />
                                                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 bg-slate-800 text-xs text-white rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-xl border border-white/10 z-50 text-center pointer-events-none">
                                                            0 usually means there was no minimum CGPA requirement or it was not mentioned.
                                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                                                        </div>
                                                    </div>
                                                )}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-white/40 uppercase">History of Backlogs</span>
                                            <span className={experience.historyOfBacklogs === 'Not Allowed' ? 'text-red-400' : 'text-white/80'}>{experience.historyOfBacklogs || '—'}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-white/40 uppercase">Standing Backlogs</span>
                                            <span className={experience.standingBacklogs === 'Not Allowed' ? 'text-red-400' : 'text-white/80'}>{experience.standingBacklogs || '—'}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-white/40 uppercase">Resume Shortlisting</span>
                                            <span className="text-white/80 block">{experience.resumeShortlisting ? 'Yes' : 'No / Not Mentioned'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                                    <h3 className="text-xs font-semibold text-white/40 uppercase flex items-center gap-2"><FileText className="h-3.5 w-3.5" /> Tags</h3>
                                    <div className="flex flex-wrap gap-1.5">
                                        {experience.tags?.length ? experience.tags.map((t, i) => (
                                            <span key={i} className="px-2 py-0.5 text-xs bg-white/5 border border-white/10 rounded text-white/70">{t}</span>
                                        )) : <span className="text-white/30 text-xs text-sm">No tags</span>}
                                    </div>
                                </div>
                            </div>

                            {/* ── Rounds ── */}
                            {experience.rounds && experience.rounds.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-white/50 uppercase mb-3 flex items-center gap-2">
                                        <MessageSquare className="h-4 w-4" /> Rounds ({experience.rounds.length})
                                    </h3>
                                    <div className="space-y-3">
                                        {experience.rounds.map((round, idx) => (
                                            <div key={idx} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="text-xl">{getRoundIcon(getRoundLabel(round))}</span>
                                                    <div>
                                                        <h4 className="text-white font-medium text-base capitalize">{getRoundLabel(round)}</h4>
                                                        <span className="text-xs text-white/40 block">Round {round.roundNumber || idx + 1} • {round.duration || 'Duration N/A'}</span>
                                                    </div>
                                                </div>
                                                <div className="pl-1 pt-2 space-y-2">
                                                    {round.description && <div className="text-sm border-l-2 border-white/10 pl-3"><h5 className="text-xs text-white/40 uppercase mb-0.5">Description</h5><ExpandableText text={round.description} /></div>}
                                                    {round.experience && <div className="text-sm border-l-2 border-white/10 pl-3"><h5 className="text-xs text-white/40 uppercase mb-0.5">Experience & Tasks</h5><ExpandableText text={round.experience} /></div>}
                                                    {round.problemStatement && <div className="text-sm border-l-2 border-white/10 pl-3"><h5 className="text-xs text-white/40 uppercase mb-0.5">Problem Statement</h5><ExpandableText text={round.problemStatement} /></div>}
                                                    {round.strategy && <div className="text-sm border-l-2 border-white/10 pl-3"><h5 className="text-xs text-white/40 uppercase mb-0.5">Strategy Used</h5><ExpandableText text={round.strategy} /></div>}
                                                    {round.topics && <div className="text-sm border-l-2 border-white/10 pl-3"><h5 className="text-xs text-white/40 uppercase mb-0.5">Topics</h5><ExpandableText text={typeof round.topics === 'string' ? round.topics : round.topics.join(', ')} /></div>}
                                                    {round.tips && <div className="text-sm border-l-2 border-white/10 pl-3"><h5 className="text-xs text-white/40 uppercase mb-0.5">Tips</h5><ExpandableText text={round.tips} /></div>}
                                                    {round.studySources && <div className="text-sm border-l-2 border-white/10 pl-3"><h5 className="text-xs text-white/40 uppercase mb-0.5">Study Sources</h5><ExpandableText text={typeof round.studySources === 'string' ? round.studySources : round.studySources.join(', ')} /></div>}
                                                    {round.notes && <div className="text-sm border-l-2 border-white/10 pl-3"><h5 className="text-xs text-white/40 uppercase mb-0.5">Notes</h5><ExpandableText text={round.notes} /></div>}
                                                    {round.questions && round.questions.length > 0 && (
                                                        <div className="mt-2">
                                                            <h5 className="text-xs text-white/40 uppercase mb-1.5">Questions</h5>
                                                            <ul className="list-disc list-inside space-y-1 text-sm text-white/80">
                                                                {round.questions.map((q: any, i: number) => (
                                                                    <li key={i} className="text-white/70">
                                                                        {typeof q === 'string' ? q : <>
                                                                            <span className="text-white/90">{q.question}</span>
                                                                            {q.answerTip && <span className="block text-xs text-white/50 ml-4 italic">💡 {q.answerTip}</span>}
                                                                        </>}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── Conclusion ── */}
                            <div className="space-y-4">
                                {experience.overallExperience && (
                                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                        <h3 className="text-sm font-semibold text-white/50 uppercase mb-2 flex items-center gap-2"><Star className="h-4 w-4" /> Overall Experience</h3>
                                        <ExpandableText text={experience.overallExperience} />
                                    </div>
                                )}
                                {experience.tipsForJuniors && (
                                    <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/10">
                                        <h3 className="text-sm font-semibold text-violet-300 uppercase mb-2 flex items-center gap-2"><Lightbulb className="h-4 w-4" /> Tips for Juniors</h3>
                                        <ExpandableText text={experience.tipsForJuniors} />
                                    </div>
                                )}
                            </div>

                            {/* ── Raw Data Toggle ── */}
                            <div className="pt-4 border-t border-white/10">
                                <button
                                    onClick={() => setShowRaw(!showRaw)}
                                    className="flex items-center gap-2 text-xs font-mono text-white/40 hover:text-white/60 transition-colors"
                                >
                                    {showRaw ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                    {showRaw ? 'Hide Raw Data' : 'Show Raw Data (Debug)'}
                                </button>
                                {showRaw && (
                                    <pre className="mt-2 p-4 rounded-lg bg-black/50 text-[10px] text-white/60 font-mono overflow-x-auto border border-white/10">
                                        {JSON.stringify(experience, null, 2)}
                                    </pre>
                                )}
                            </div>
                        </div>
                    </ScrollArea>
                </div>

                <DialogFooter className="px-6 py-4 border-t border-white/10 bg-slate-900 shrink-0">
                    <div className="flex w-full items-center justify-between">
                        <Button variant="outline" onClick={onClose} disabled={isLoading} className="border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                            Cancel
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="destructive" onClick={() => onReject(experience._id)} disabled={isLoading} className="bg-rose-500 hover:bg-rose-600 gap-2">
                                <XCircle className="h-4 w-4" /> Reject / Delete
                            </Button>
                            <Button onClick={() => onApprove(experience._id)} disabled={isLoading} className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2">
                                <CheckCircle2 className="h-4 w-4" /> Approve Experience
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ShieldAlertIcon({ status }: { status: string }) {
    if (status === 'FLAGGED') return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    return <CheckCircle2 className="h-5 w-5 text-blue-500" />;
}
