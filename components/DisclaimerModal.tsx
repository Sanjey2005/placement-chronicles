'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/GlassCard';

export default function DisclaimerModal() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Check if we already showed it this session
        const hasSeenDisclaimer = sessionStorage.getItem('disclaimerShown');
        if (hasSeenDisclaimer === 'true') {
            return;
        }

        // Check if user is logged in
        const getCookie = (name: string) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) {
                const encodedCookie = parts.pop()?.split(';').shift();
                return encodedCookie ? decodeURIComponent(encodedCookie) : undefined;
            }
        };

        const token = getCookie('auth-token');
        if (token) {
            const parts = token.split('|');
            const expiry = parts.length > 1 ? parts[1] : undefined;
            if (!expiry || Date.now() <= parseInt(expiry, 10)) {
                // Token is valid, show disclaimer
                setIsOpen(true);
            }
        }
    }, []);

    const handleAcknowledge = () => {
        sessionStorage.setItem('disclaimerShown', 'true');
        setIsOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <GlassCard className="max-w-md w-full p-6 space-y-6 border border-purple-500/30 shadow-2xl shadow-purple-500/10 relative overflow-hidden">
                {/* Decorative background glow */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-start gap-4">
                    <div className="p-3 bg-purple-500/20 rounded-xl shrink-0">
                        <ShieldAlert className="h-6 w-6 text-purple-400" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold text-white tracking-tight">Important Notice</h2>
                        <p className="text-sm text-zinc-300 leading-relaxed">
                            Welcome! Before you proceed, please keep the following in mind:
                        </p>
                    </div>
                </div>

                <div className="bg-black/40 rounded-lg p-4 space-y-4 border border-white/5">
                    <div className="flex gap-3">
                        <CheckCircle2 className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                        <p className="text-sm text-zinc-300">
                            <strong className="text-white">AI-Generated Content:</strong> Our platform uses AI to extract and format information from documents. Please <strong className="text-purple-300">double-check anything the AI generates</strong> as it can occasionally make mistakes.
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
                    <div className="flex gap-3">
                        <CheckCircle2 className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                        <p className="text-sm text-zinc-300">
                            <strong className="text-white">Rate Limits:</strong> To ensure fair usage for everyone, some actions like generating experiences or uploading PDFs might be subject to rate limits.
                        </p>
                    </div>
                </div>

                <Button
                    onClick={handleAcknowledge}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-6 shadow-lg shadow-purple-500/20 border-0 transition-all hover:scale-[1.02]"
                >
                    I Understand and Agree
                </Button>
            </GlassCard>
        </div>
    );
}
