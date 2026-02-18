'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { Plus, MessageSquare, LogOut, Home } from 'lucide-react';

export default function Navbar() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    // Check authentication only on client side to avoid hydration mismatch
    useEffect(() => {
        setIsAuthenticated(document.cookie.includes('auth-token'));
    }, []);

    const handleLogout = () => {
        // Clear auth cookie
        document.cookie = 'auth-token=; path=/; max-age=0';
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
                            alt="Placement Chronicles"
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
