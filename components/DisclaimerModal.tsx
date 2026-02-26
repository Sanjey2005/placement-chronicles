'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/GlassCard';

export default function DisclaimerModal() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Show disclaimer whenever the URL contains ?disclaimer=1
        // The login page sets this param after a successful login
        if (searchParams.get('disclaimer') === '1') {
            setIsOpen(true);
        }
    }, [searchParams]);

    const handleAcknowledge = () => {
        setIsOpen(false);
        // Remove the ?disclaimer=1 param from the URL without a page reload
        const url = new URL(window.location.href);
        url.searchParams.delete('disclaimer');
        router.replace(url.pathname + (url.search || ''));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <GlassCard className="max-w-lg w-full p-6 space-y-5 border border-purple-500/30 shadow-2xl shadow-purple-500/10 relative overflow-hidden">
                {/* Decorative background glow */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-start gap-4">
                    <div className="p-3 bg-purple-500/20 rounded-xl shrink-0">
                        <ShieldAlert className="h-6 w-6 text-purple-400" />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-xl font-bold text-white tracking-tight">Important Notice</h2>
                        <p className="text-sm text-zinc-300 leading-relaxed">
                            Before you proceed, please read and acknowledge the following:
                        </p>
                    </div>
                </div>

                <div className="bg-black/40 rounded-lg p-4 space-y-4 border border-white/5">
                    {/* ─── FIRST & most important: sharing warning ─── */}
                    <div className="flex gap-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/25">
                        <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                        <p className="text-sm text-zinc-200">
                            <strong className="text-rose-300">Do NOT Share Outside the Department:</strong>{' '}
                            Sharing this website or its link with anyone outside this department is strictly not entertained and{' '}
                            <strong className="text-rose-300">may result in the entire website being taken down.</strong>{' '}
                            Keep this platform within the department only.
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <CheckCircle2 className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                        <p className="text-sm text-zinc-300">
                            <strong className="text-white">AI-Generated Content:</strong> Our platform uses AI to extract and format information from documents. Please{' '}
                            <strong className="text-purple-300">double-check anything the AI generates</strong> as it can occasionally make mistakes.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <CheckCircle2 className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
                        <p className="text-sm text-zinc-300">
                            <strong className="text-white">Personal Experiences:</strong> The interview experiences shared are personal and subjective. They represent individual journeys and do not guarantee similar outcomes.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
                        <p className="text-sm text-zinc-300">
                            <strong className="text-white">Confidentiality:</strong> Be mindful of company policies when viewing or sharing experiences. Do not share proprietary code or details covered by NDAs.
                        </p>
                    </div>
                </div>

                <Button
                    onClick={handleAcknowledge}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-6 shadow-lg shadow-purple-500/20 border-0 transition-all hover:scale-[1.02]"
                >
                    I Acknowledge
                </Button>
            </GlassCard>
        </div>
    );
}
