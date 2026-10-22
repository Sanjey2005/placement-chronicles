'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MessageSquare, LogOut, Home, Shield, Menu, X } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { useSession } from '@/components/Providers';
import { logout } from '@/actions/auth';

export default function Navbar() {
    const { isAuthenticated, isAdmin } = useSession();
    const mobileNavRef = useRef<HTMLElement>(null);
    const router = useRouter();
    const pathname = usePathname();
    // The drawer remembers the path it was opened on, so a navigation closes it
    // without an effect.
    const [menuPath, setMenuPath] = useState<string | null>(null);
    const isMobileMenuOpen = menuPath === pathname;

    // Off-canvas drawer: focus the first link and let Esc close it, same as
    // the mobile filter sheet in FeedGrid.
    useEffect(() => {
        if (!isMobileMenuOpen) return;
        mobileNavRef.current?.querySelector<HTMLElement>('a, button')?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMenuPath(null);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isMobileMenuOpen]);

    const handleLogout = async () => {
        await logout(); // server action: the session cookie is httpOnly
        router.push('/login');
        router.refresh(); // re-render the root layout so the navbar drops its auth state
    };

    return (
        <>
            <header className="sticky top-0 z-50 border-b border-outline-variant bg-background/90 backdrop-blur">
                <div className="max-w-7xl mx-auto px-6 py-4 relative">
                    <div className="flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-3 group">
                            <Image
                                src="/logo.png"
                                alt="Placement Chronicles - PSG placement experiences"
                                width={36}
                                height={36}
                                className="rounded-lg"
                            />
                            <h1 className="text-2xl sm:text-3xl font-bold text-foreground group-hover:text-primary transition-colors">
                                Placement Chronicles
                            </h1>
                        </Link>
                        <div className="flex items-center gap-2">
                            {/* Desktop Navigation — one quiet ghost treatment for all wayfinding
                                links, so the only fill left is the single Share CTA. */}
                            <nav className="hidden sm:flex items-center gap-1">
                                {/* Home button - only show if not on home page */}
                                {pathname !== '/' && (
                                    <Link href="/">
                                        <button className="flex items-center gap-2 px-4 py-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-container-high text-sm font-medium transition-all">
                                            <Home className="h-4 w-4" />
                                            <span>Home</span>
                                        </button>
                                    </Link>
                                )}

                                {/* Admin button - only show for admins */}
                                {isAdmin && pathname !== '/admin' && (
                                    <Link href="/admin">
                                        <button className="flex items-center gap-2 px-4 py-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-container-high text-sm font-medium transition-all">
                                            <Shield className="h-4 w-4" />
                                            <span>Admin</span>
                                        </button>
                                    </Link>
                                )}

                                {/* Chat button - only show if authenticated */}
                                {isAuthenticated && (
                                    <Link href="/chat">
                                        <button className="flex items-center gap-2 px-4 py-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-container-high text-sm font-medium transition-all">
                                            <MessageSquare className="h-4 w-4" />
                                            <span>Chat</span>
                                        </button>
                                    </Link>
                                )}
                            </nav>

                            {isAuthenticated && <div className="hidden sm:block h-6 w-px bg-outline-variant mx-1" />}

                            {/* Share Experience — the one filled, on-brand action in the bar */}
                            <Link href="/share-experience">
                                <button className="flex items-center justify-center px-4 sm:px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-full transition-all shadow-m3">
                                    <span>Share</span>
                                </button>
                            </Link>

                            {/* Sign Out - quiet by default, only reads as destructive on hover */}
                            {isAuthenticated && (
                                <button
                                    onClick={handleLogout}
                                    aria-label="Sign out"
                                    title="Sign out"
                                    className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-container-high text-sm font-medium transition-all"
                                >
                                    <LogOut className="h-4 w-4" />
                                </button>
                            )}

                            <ThemeToggle />

                            {/* Mobile Menu Toggle */}
                            <button
                                onClick={() => setMenuPath(isMobileMenuOpen ? null : pathname)}
                                aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                                aria-expanded={isMobileMenuOpen}
                                aria-controls="mobile-nav"
                                className="sm:hidden p-2 bg-surface-container hover:bg-surface-container-high rounded-full text-foreground transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                            >
                                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile Navigation — off-canvas drawer, not an inline expand:
                the old version pushed page content down instead of
                overlaying it. Same hierarchy as desktop: ghost links,
                one filled CTA, quiet sign-out. */}
            <AnimatePresence>
            {isMobileMenuOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="sm:hidden fixed inset-0 z-[60] bg-black/40"
                    onClick={() => setMenuPath(null)}
                >
                <motion.nav
                    ref={mobileNavRef}
                    id="mobile-nav"
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-0 right-0 h-full w-[85%] max-w-xs bg-card border-l border-outline-variant p-6 flex flex-col gap-2 shadow-2xl overflow-y-auto"
                >
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-lg font-bold text-foreground">Menu</span>
                        <button
                            onClick={() => setMenuPath(null)}
                            aria-label="Close menu"
                            className="p-2 rounded-full bg-surface-container hover:bg-surface-container-high text-foreground transition-colors cursor-pointer"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    {pathname !== '/' && (
                        <Link href="/" className="w-full">
                            <button className="w-full justify-center flex items-center gap-2 px-4 py-3 rounded-full text-foreground hover:bg-surface-container-high font-medium transition-all">
                                <Home className="h-4 w-4" />
                                <span>Home</span>
                            </button>
                        </Link>
                    )}

                    {isAdmin && pathname !== '/admin' && (
                        <Link href="/admin" className="w-full">
                            <button className="w-full justify-center flex items-center gap-2 px-4 py-3 rounded-full text-foreground hover:bg-surface-container-high font-medium transition-all">
                                <Shield className="h-4 w-4" />
                                <span>Admin Dashboard</span>
                            </button>
                        </Link>
                    )}

                    {isAuthenticated && (
                        <Link href="/chat" className="w-full">
                            <button className="w-full justify-center flex items-center gap-2 px-4 py-3 rounded-full text-foreground hover:bg-surface-container-high font-medium transition-all">
                                <MessageSquare className="h-4 w-4" />
                                <span>AI Assistant Guide</span>
                            </button>
                        </Link>
                    )}

                    <Link href="/share-experience" className="w-full">
                        <button className="w-full justify-center flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-full transition-all shadow-m3">
                            <Plus className="h-5 w-5" />
                            <span>Share Experience</span>
                        </button>
                    </Link>

                    {isAuthenticated && (
                        <button
                            onClick={handleLogout}
                            className="w-full justify-center flex items-center gap-2 px-4 py-3 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-container-high font-medium transition-all"
                        >
                            <LogOut className="h-4 w-4" />
                            <span>Sign Out</span>
                        </button>
                    )}
                </motion.nav>
                </motion.div>
            )}
            </AnimatePresence>
        </>
    );
}

