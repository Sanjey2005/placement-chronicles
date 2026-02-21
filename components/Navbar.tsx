'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { Plus, MessageSquare, LogOut, Home, Shield } from 'lucide-react';

export default function Navbar() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    // Check authentication only on client side to avoid hydration mismatch
    // Run whenever the pathname changes so we catch logins/logouts via router.push
    useEffect(() => {
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
            const [role, expiry] = token.split('|');
            if (expiry && Date.now() > parseInt(expiry, 10)) {
                setIsAuthenticated(false);
                setIsAdmin(false);
                // Optionally clear cookie if expired
                document.cookie = 'auth-token=; path=/; max-age=0';
            } else {
                setIsAuthenticated(true);
                setIsAdmin(role === 'admin');
            }
        } else {
            setIsAuthenticated(false);
            setIsAdmin(false);
        }
    }, [pathname]);

    const handleLogout = () => {
        // Clear auth cookie and user-id
        document.cookie = 'auth-token=; path=/; max-age=0';
        document.cookie = 'user-id=; path=/; max-age=0';
        // Redirect to login
        router.push('/login');
    };

    return (
        <header className="relative z-10 border-b border-white/10 bg-black/20 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3 group">
                        <Image
                            src="/logo.png"
                            alt="Placement Chronicles - PSG placement experiences"
                            width={36}
                            height={36}
                            className="rounded-lg"
                            style={{ mixBlendMode: 'screen' }}
                        />
                        <h1 className="text-2xl sm:text-3xl font-bold text-white group-hover:text-white/90 transition-colors">
                            Placement Chronicles
                        </h1>
                    </Link>
                    <nav className="flex items-center gap-3">
                        {/* Home button - only show if not on home page */}
                        {pathname !== '/' && (
                            <Link href="/">
                                <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-lg text-white transition-all">
                                    <Home className="h-4 w-4" />
                                    <span className="hidden sm:inline">Home</span>
                                </button>
                            </Link>
                        )}

                        {/* Admin button - only show for admins */}
                        {isAdmin && pathname !== '/admin' && (
                            <Link href="/admin">
                                <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 backdrop-blur-md border border-amber-500/30 rounded-lg text-amber-200 font-semibold transition-all">
                                    <Shield className="h-4 w-4" />
                                    <span className="hidden sm:inline">Admin</span>
                                </button>
                            </Link>
                        )}

                        {/* Chat button - only show if authenticated - PRIMARY ACTION */}
                        {isAuthenticated && (
                            <Link href="/chat">
                                <button className="flex items-center gap-2 px-4 sm:px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl hover:shadow-purple-500/50">
                                    <MessageSquare className="h-5 w-5" />
                                    <span className="hidden sm:inline">Chat</span>
                                </button>
                            </Link>
                        )}

                        {/* Share Experience button - PRIMARY ACTION */}
                        <Link href="/share-experience">
                            <button className="flex items-center gap-2 px-4 sm:px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl hover:shadow-blue-500/50">
                                <Plus className="h-5 w-5" />
                                <span className="hidden sm:inline">Share</span>
                            </button>
                        </Link>

                        {/* Sign Out button - only show if authenticated */}
                        {isAuthenticated && (
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 backdrop-blur-md border border-red-500/30 hover:border-red-500/50 rounded-lg text-red-300 hover:text-red-200 transition-all"
                            >
                                <LogOut className="h-4 w-4" />
                                <span className="hidden sm:inline">Sign Out</span>
                            </button>
                        )}
                    </nav>
                </div>
            </div>
        </header>
    );
}

