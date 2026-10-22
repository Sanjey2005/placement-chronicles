'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import GlassCard from '@/components/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { login } from '@/actions/auth';
import { toast } from 'sonner';
import { Lock, User, CheckCircle2, ArrowRight } from 'lucide-react';

// Shader canvas uses @react-three/fiber, which touches `window` on import —
// keep it client-only and off the initial bundle.
const CanvasRevealEffect = dynamic(
    () => import('@/components/ui/canvas-reveal-effect').then((m) => m.CanvasRevealEffect),
    { ssr: false }
);

// Brand violet, light + dark tonal steps (matches --primary / --primary-fixed-dim in globals.css)
const DOT_COLORS = [
    [211, 187, 255], // #d3bbff
    [83, 0, 183], // #5300b7
];

export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const router = useRouter();
    const prefersReducedMotion = useReducedMotion();

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        const formData = new FormData(e.currentTarget);
        setLoading(true);

        try {
            const result = await login(formData);

            if (result.success) {
                const isAdmin = result.role === 'ADMIN';
                toast.success(isAdmin ? 'Admin login successful! Redirecting...' : 'Login successful! Redirecting...');

                // Show the success tick, then hand off to the existing redirect.
                setSuccess(true);
                // The session cookie just changed: re-render the root layout so
                // the navbar has the new auth state before we navigate.
                router.refresh();
                setTimeout(() => {
                    router.push(isAdmin ? '/admin?disclaimer=1' : '/?disclaimer=1');
                }, 1100);
            } else {
                toast.error(result.error || 'Login failed');
                setLoading(false);
            }
        } catch {
            toast.error('An unexpected error occurred');
            setLoading(false);
        }
    }

    return (
        <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#0a0710] p-4">
            {/* Shader background — static gradient when motion is reduced, animated dot reveal otherwise */}
            <div className="absolute inset-0 z-0">
                {prefersReducedMotion ? (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#2b1650_0%,_#0a0710_70%)]" />
                ) : (
                    <CanvasRevealEffect
                        animationSpeed={3}
                        containerClassName="bg-[#0a0710]"
                        colors={DOT_COLORS}
                        dotSize={5}
                        reverse={success}
                    />
                )}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#0a0710_100%)]" />
                <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-[#0a0710] to-transparent" />
            </div>

            {/* Content */}
            <div className="relative z-10 w-full max-w-md">
                <AnimatePresence mode="wait">
                    {success ? (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center gap-4 text-center"
                        >
                            <motion.div
                                initial={{ rotate: -180, scale: 0 }}
                                animate={{ rotate: 0, scale: 1 }}
                                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                                className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10"
                            >
                                <CheckCircle2 className="h-14 w-14 text-emerald-400" strokeWidth={1.5} />
                            </motion.div>
                            <div className="space-y-1">
                                <h2 className="text-2xl font-bold text-white tracking-tight">You&apos;re in!</h2>
                                <p className="text-white/60">Redirecting...</p>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="form"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                        >
                            <div className="mb-8 text-center space-y-2">
                                <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                                    Placement Chronicles
                                </h1>
                                <p className="text-white/50">
                                    Sign in to access PSG Tech placement experiences
                                </p>
                            </div>

                            <GlassCard className="w-full bg-white/5 backdrop-blur-xl border-white/10 p-8 space-y-6">
                                <div className="text-center space-y-1">
                                    <h2 className="text-xl font-bold text-white tracking-tight">Welcome Back</h2>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <label htmlFor="username" className="text-sm font-medium text-white/60">
                                            Roll Number
                                        </label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                                            <Input
                                                id="username"
                                                name="username"
                                                type="text"
                                                placeholder="Enter your roll number"
                                                required
                                                className="pl-10 bg-white/5 border-white/15 text-white placeholder:text-white/30 focus:border-[#d3bbff] focus:ring-[#d3bbff]/30 transition-all"
                                                disabled={loading}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="password" className="text-sm font-medium text-white/60">
                                            Password
                                        </label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                                            <Input
                                                id="password"
                                                name="password"
                                                type="password"
                                                placeholder="Enter your password"
                                                required
                                                className="pl-10 bg-white/5 border-white/15 text-white placeholder:text-white/30 focus:border-[#d3bbff] focus:ring-[#d3bbff]/30 transition-all"
                                                disabled={loading}
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full bg-[#d3bbff] hover:bg-[#d3bbff]/90 text-[#21005d] rounded-full font-semibold py-6 group"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            'Signing in...'
                                        ) : (
                                            <span className="inline-flex items-center gap-2">
                                                Sign In
                                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                            </span>
                                        )}
                                    </Button>
                                </form>

                                <div className="text-center">
                                    <p className="text-sm text-white/40">
                                        <span className="font-semibold text-white/60">Note:</span> Use your eCampus credentials
                                    </p>
                                </div>
                            </GlassCard>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
