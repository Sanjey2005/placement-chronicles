'use client';

import { Mail, Linkedin, Github, Send, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function Footer() {
    const [feedback, setFeedback] = useState('');
    const [loading, setLoading] = useState(false);

    const handleFeedbackSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!feedback.trim()) return;

        setLoading(true);
        try {
            const response = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: feedback }),
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Thank you for your feedback!');
                setFeedback('');
            } else {
                toast.error(data.error || 'Failed to submit feedback');
            }
        } catch (error) {
            toast.error('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <footer className="relative z-10 border-t border-white/10 bg-slate-950/50 backdrop-blur-xl mt-20">
            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                    {/* Brand Section */}
                    <div className="space-y-4">
                        <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
                            Placement Chronicles
                        </h3>
                        <p className="text-white/60 text-sm leading-relaxed">
                            A community-driven platform to share and explore real interview experiences.
                            Help your juniors by sharing your journey.
                        </p>
                        <div className="flex gap-4 pt-2">
                            {/* Social Links */}
                            <a
                                href="mailto:sanjey8105@gmail.com"
                                className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 hover:text-blue-400 transition-all border border-white/10"
                                aria-label="Email"
                            >
                                <Mail className="h-4 w-4" />
                            </a>
                            <a
                                href="https://www.linkedin.com/in/shree-sanjey-404547285?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 hover:text-blue-600 transition-all border border-white/10"
                                aria-label="LinkedIn"
                            >
                                <Linkedin className="h-4 w-4" />
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="space-y-4">
                        <h4 className="font-semibold text-white">Quick Links</h4>
                        <ul className="space-y-2 text-sm text-white/60">
                            <li>
                                <a href="/" className="hover:text-white transition-colors">Home</a>
                            </li>
                            <li>
                                <a href="/share-experience" className="hover:text-white transition-colors">Share Experience</a>
                            </li>
                            <li>
                                <a href="/login" className="hover:text-white transition-colors">Admin Login</a>
                            </li>
                        </ul>
                    </div>

                    {/* Contact Info (Repeated for visibility or just general info) */}
                    <div className="space-y-4">
                        <h4 className="font-semibold text-white">Contact</h4>
                        <ul className="space-y-2 text-sm text-white/60">
                            <li className="flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                <a href="mailto:sanjey8105@gmail.com" className="hover:text-white transition-colors">
                                    sanjey8105@gmail.com
                                </a>
                            </li>
                            <li className="flex items-center gap-2">
                                <Linkedin className="h-4 w-4" />
                                <a
                                    href="https://www.linkedin.com/in/shree-sanjey-404547285?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-white transition-colors"
                                >
                                    Shree Sanjey
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Feedback Form */}
                    <div className="space-y-4">
                        <h4 className="font-semibold text-white flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Feedback / Report Bug
                        </h4>
                        <form onSubmit={handleFeedbackSubmit} className="space-y-2">
                            <textarea
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                placeholder="Tell us what you think or report an issue..."
                                className="w-full h-24 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                            />
                            <button
                                type="submit"
                                disabled={!feedback.trim() || loading}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send className={`h-3.5 w-3.5 ${loading ? 'animate-pulse' : ''}`} />
                                {loading ? 'Sending...' : 'Send Feedback'}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-white/5 text-center text-white/40 text-sm">
                    <p>© 2026 Placement Chronicles. Built with Next.js 15 + Framer Motion</p>
                </div>
            </div>
        </footer>
    );
}
