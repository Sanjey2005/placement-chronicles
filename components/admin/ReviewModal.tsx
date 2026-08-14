'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import ExperienceModal from '@/components/ExperienceModal';

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

export function ReviewModal({ experience, isOpen, onClose, onApprove, onReject, isLoading }: ReviewModalProps) {
    const [showRaw, setShowRaw] = useState(false);

    if (!experience) return null;

    const adminBanner = experience.moderationReason ? (
        <div className="px-5 sm:px-6 py-4 bg-error-container border-b border-error-container/20 flex gap-3 items-start shrink-0">
            <AlertTriangle className="h-5 w-5 text-on-error-container shrink-0 mt-0.5" />
            <div className="flex-1">
                <h4 className="font-semibold text-on-error-container text-sm">Flagged Reason</h4>
                <p className="text-on-error-container/80 text-sm mt-1 whitespace-pre-wrap">{experience.moderationReason}</p>
            </div>
        </div>
    ) : null;

    const adminFooter = (
        <div className="shrink-0 border-t border-outline-variant bg-surface-container-low flex flex-col">
            {/* Raw Data Toggle inside Footer area so it doesn't break ExperienceModal's body spacing */}
            <div className="px-5 sm:px-6 py-3 border-b border-outline-variant/50 bg-card">
                <button
                    onClick={() => setShowRaw(!showRaw)}
                    className="flex items-center gap-2 text-xs font-mono text-outline hover:text-foreground transition-colors"
                >
                    {showRaw ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {showRaw ? 'Hide Raw Data' : 'Show Raw Data (Debug)'}
                </button>
                {showRaw && (
                    <pre className="mt-3 p-4 rounded-lg bg-surface-container-highest text-[10px] text-muted-foreground font-mono overflow-x-auto max-h-48 border border-outline-variant">
                        {JSON.stringify(experience, null, 2)}
                    </pre>
                )}
            </div>

            <div className="px-5 sm:px-6 py-4 flex w-full flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <Button variant="outline" onClick={onClose} disabled={isLoading} className="border-outline-variant bg-surface-container hover:bg-surface-container-high w-full sm:w-auto order-last sm:order-first">
                    Cancel
                </Button>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <Button variant="destructive" onClick={() => onReject(experience._id)} disabled={isLoading} className="bg-rose-500 hover:bg-rose-600 gap-2 w-full sm:w-auto">
                        <XCircle className="h-4 w-4" /> Reject / Delete
                    </Button>
                    <Button onClick={() => onApprove(experience._id)} disabled={isLoading} className="bg-emerald-500 hover:bg-emerald-600 text-foreground gap-2 w-full sm:w-auto">
                        <CheckCircle2 className="h-4 w-4" /> Approve Experience
                    </Button>
                </div>
            </div>
        </div>
    );

    return (
        <ExperienceModal
            isOpen={isOpen}
            onClose={onClose}
            company={experience.company}
            role={experience.role}
            ctc={experience.ctc}
            studentName={experience.studentName}
            courseBranch={`Student ID: ${experience.studentId}`} // Mapping studentId since there's no courseBranch in experience
            batch={experience.batch}
            year={experience.year}
            roleType={experience.roleType}
            placementType={experience.placementType}
            finalVerdict={experience.finalVerdict}
            minCGPA={experience.minCGPA}
            historyOfBacklogs={experience.historyOfBacklogs}
            standingBacklogs={experience.standingBacklogs}
            resumeShortlisting={experience.resumeShortlisting}
            rounds={experience.rounds}
            tags={experience.tags}
            overallExperience={experience.overallExperience}
            tipsForJuniors={experience.tipsForJuniors}
            adminBanner={adminBanner}
            adminFooter={adminFooter}
        />
    );
}
