'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/GlassCard';

export default function DisclaimerModal() {
    const searchParams = useSearchParams();
    const router = useRouter();
    // Show disclaimer whenever the URL arrives at ?disclaimer=1 (the login page
    // sets this param after a successful login). Opens on the rising edge of the
    // param (React's adjust-state-on-change form, keyed on the boolean, not on
    // the searchParams object, whose identity can change mid-navigation while the
    // param is still present); once open it stays open until acknowledged, even
    // if the URL changes underneath.
    const wantsOpen = searchParams.get('disclaimer') === '1';
    const [isOpen, setIsOpen] = useState(wantsOpen);
    const [prevWantsOpen, setPrevWantsOpen] = useState(wantsOpen);
    if (wantsOpen !== prevWantsOpen) {
        setPrevWantsOpen(wantsOpen);
        if (wantsOpen) setIsOpen(true);
    }

    const handleAcknowledge = () => {
        setIsOpen(false);
        // Remove the ?disclaimer=1 param from the URL without a page reload
        const url = new URL(window.location.href);
        url.searchParams.delete('disclaimer');
        router.replace(url.pathname + (url.search || ''));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-container/90 backdrop-blur-sm"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 12 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className="max-w-lg w-full"
                    >
                        <GlassCard className="flex flex-col max-h-[calc(100vh-2rem)] p-5 sm:p-6 border border-outline-variant shadow-2xl relative overflow-hidden">

                <div className="flex items-start gap-4 shrink-0 mb-4 sm:mb-5">
                    <div className="p-2 sm:p-3 bg-primary-fixed rounded-xl shrink-0">
                        <ShieldAlert className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">Important Notice</h2>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                            Before you proceed, please read and acknowledge the following:
                        </p>
                    </div>
                </div>

                <div className="bg-surface-container rounded-lg p-3 sm:p-4 space-y-4 border border-outline-variant overflow-y-auto min-h-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-surface-container [&::-webkit-scrollbar-track]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-surface-container [&::-webkit-scrollbar-thumb]:rounded-full pr-1 sm:pr-2">
                    {/* ─── FIRST & most important: sharing warning ─── */}
                    <div className="flex gap-2 sm:gap-3 p-3 rounded-lg bg-error-container border border-transparent">
                        <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-on-error-container shrink-0 mt-0.5" />
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            <strong className="text-on-error-container">Do NOT Share Outside the Department:</strong>{' '}
                            Sharing this website or its link with anyone outside this department is strictly not entertained and{' '}
                            <strong className="text-on-error-container">may result in the entire website being taken down.</strong>{' '}
                            Keep this platform within the department only.
                        </p>
                    </div>

                    <div className="flex gap-2 sm:gap-3">
                        <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0 mt-0.5" />
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            <strong className="text-foreground">AI-Generated Content:</strong> Our platform uses AI to extract and format information from documents. Please{' '}
                            <strong className="text-primary">double-check anything the AI generates</strong> as it can occasionally make mistakes.
                        </p>
                    </div>
                    <div className="flex gap-2 sm:gap-3">
                        <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0 mt-0.5" />
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            <strong className="text-foreground">Personal Experiences:</strong> The interview experiences shared are personal and subjective. They represent individual journeys and do not guarantee similar outcomes.
                        </p>
                    </div>
                    <div className="flex gap-2 sm:gap-3">
                        <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-400 shrink-0 mt-0.5" />
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            <strong className="text-foreground">Confidentiality:</strong> Be mindful of company policies when viewing or sharing experiences. Do not share proprietary code or details covered by NDAs.
                        </p>
                    </div>
                </div>

                <div className="shrink-0 mt-4 sm:mt-5">
                    <Button
                        onClick={handleAcknowledge}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-full font-semibold py-4 sm:py-6 shadow-m3 border-0 transition-all hover:scale-[1.02]"
                    >
                        I Acknowledge
                    </Button>
                </div>
                        </GlassCard>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
