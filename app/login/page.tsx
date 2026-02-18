'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import StarField from '@/components/StarField';
import GlassCard from '@/components/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { login } from '@/actions/auth';
import { toast } from 'sonner';
import { Lock, User } from 'lucide-react';

export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);

        try {
            const formData = new FormData(e.currentTarget);
            const result = await login(formData);

            if (result.success) {
                // Set session cookie with role info
                const isAdmin = result.role === 'ADMIN';
                const cookieValue = isAdmin ? 'admin' : 'authenticated';
                document.cookie = `auth-token=${cookieValue}; path=/; SameSite=Lax`;

                toast.success(isAdmin ? 'Admin login successful! Redirecting...' : 'Login successful! Redirecting...');
                router.push(isAdmin ? '/admin' : '/');
            } else {
                toast.error(result.error || 'Login failed');
            }
        } catch (error) {
            toast.error('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <StarField />

            <GlassCard className="w-full max-w-md p-8 space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-white tracking-tight">Welcome Back</h1>
                    <p className="text-zinc-400">Sign in to Placement Chronicles</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="username" className="text-sm font-medium text-zinc-300">
                            Roll Number
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                            <Input
                                id="username"
                                name="username"
                                type="text"
                                placeholder="Enter your roll number"
                                required
                                className="pl-10 bg-black/50 border-white/10 text-white placeholder:text-zinc-600 focus:border-purple-500/50 focus:ring-purple-500/20 transition-all"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="password" className="text-sm font-medium text-zinc-300">
                            Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="Enter your password"
                                required
                                className="pl-10 bg-black/50 border-white/10 text-white placeholder:text-zinc-600 focus:border-purple-500/50 focus:ring-purple-500/20 transition-all"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-6 shadow-lg shadow-purple-500/20"
                        disabled={loading}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </Button>
                </form>

                <div className="text-center">
                    <p className="text-sm text-zinc-500">
                        <span className="font-semibold text-zinc-400">Note:</span> Use your eCampus credentials
                    </p>
                </div>
            </GlassCard>
        </div>
    );
}
