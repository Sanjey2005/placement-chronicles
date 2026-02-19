'use client';

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
import { AlertTriangle, CheckCircle2, XCircle, User, Building2, Calendar, FileText } from 'lucide-react';

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
    // Add other fields as needed for display
    rounds?: any[];
    tipsForJuniors?: string;
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
    if (!experience) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col bg-slate-900 text-white border-white/10">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Review Flagged Content
                    </DialogTitle>
                    <DialogDescription className="text-white/60">
                        This experience was flagged by AI. Please review the details below.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
                    {/* Moderation Reason Alert */}
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex gap-3 items-start">
                        <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-semibold text-red-400 text-sm">Flagged Reason</h4>
                            <p className="text-white/80 text-sm mt-1">{experience.moderationReason}</p>
                        </div>
                    </div>

                    <ScrollArea className="flex-1 rounded-lg border border-white/10 bg-black/20 p-4">
                        <div className="space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="text-xs font-semibold text-white/40 uppercase mb-1">Student</h4>
                                    <div className="flex items-center gap-2 text-sm">
                                        <User className="h-4 w-4 text-white/60" />
                                        {experience.studentName} ({experience.studentId})
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-xs font-semibold text-white/40 uppercase mb-1">Company & Role</h4>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Building2 className="h-4 w-4 text-white/60" />
                                        {experience.company} - {experience.role}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-xs font-semibold text-white/40 uppercase mb-1">Package / Stipend</h4>
                                    <div className="text-sm font-mono text-emerald-400">
                                        {experience.ctc}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-xs font-semibold text-white/40 uppercase mb-1">Date</h4>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Calendar className="h-4 w-4 text-white/60" />
                                        {new Date(experience.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>

                            {/* Full JSON Dump (for deep inspection) */}
                            <div>
                                <h4 className="text-xs font-semibold text-white/40 uppercase mb-2 flex items-center gap-2">
                                    <FileText className="h-3 w-3" />
                                    Raw Data
                                </h4>
                                <pre className="bg-black/40 p-4 rounded-lg text-xs font-mono text-white/70 overflow-x-auto whitespace-pre-wrap">
                                    {JSON.stringify(experience, null, 2)}
                                </pre>
                            </div>
                        </div>
                    </ScrollArea>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isLoading}
                        className="border-white/10 hover:bg-white/10 hover:text-white"
                    >
                        Cancel
                    </Button>
                    <div className="flex gap-2 w-full sm:w-auto justify-end">
                        <Button
                            variant="destructive"
                            onClick={() => onReject(experience._id)}
                            disabled={isLoading}
                            className="bg-rose-500 hover:bg-rose-600 gap-2"
                        >
                            <XCircle className="h-4 w-4" />
                            Reject / Delete
                        </Button>
                        <Button
                            onClick={() => onApprove(experience._id)}
                            disabled={isLoading}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
                        >
                            <CheckCircle2 className="h-4 w-4" />
                            Force Approve
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
