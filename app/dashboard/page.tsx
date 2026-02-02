'use client';

import { useState } from 'react';
import StarField from '@/components/StarField';
import GlassCard from '@/components/GlassCard';
import UploadTab from '@/components/dashboard/UploadTab';
import ChatTab from '@/components/dashboard/ChatTab';
import { Upload, MessageSquare, Home, LogOut } from 'lucide-react';
import Link from 'next/link';

type Tab = 'upload' | 'chat';

export default function DashboardPage() {
    const [activeTab, setActiveTab] = useState<Tab>('upload');

    return (
        <div className="min-h-screen">
            <StarField />

            <div className="flex h-screen">
                {/* Sidebar */}
                <GlassCard className="w-64 m-4 p-6 flex flex-col">
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-white mb-1">Placement</h1>
                        <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
                            Chronicles
                        </h2>
                    </div>

                    <nav className="flex-1 space-y-2">
                        <Link href="/">
                            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-all">
                                <Home className="h-5 w-5" />
                                <span>Home</span>
                            </button>
                        </Link>

                        <button
                            onClick={() => setActiveTab('upload')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'upload'
                                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            <Upload className="h-5 w-5" />
                            <span>Upload Experience</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('chat')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'chat'
                                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            <MessageSquare className="h-5 w-5" />
                            <span>AI Assistant</span>
                        </button>
                    </nav>

                    <Link href="/login">
                        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-all">
                            <LogOut className="h-5 w-5" />
                            <span>Sign Out</span>
                        </button>
                    </Link>
                </GlassCard>

                {/* Main Content */}
                <div className="flex-1 p-4 overflow-auto">
                    <div className="max-w-5xl mx-auto">
                        {activeTab === 'upload' && <UploadTab />}
                        {activeTab === 'chat' && <ChatTab />}
                    </div>
                </div>
            </div>
        </div>
    );
}
