'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User as UserIcon, Sparkles, Target, FileText, TrendingUp, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    sources?: Array<{
        company: string;
        role: string;
        similarity: number;
    }>;
}

interface SuggestedPromptCardProps {
    icon: React.ReactNode;
    title: string;
    prompt: string;
    onClick: (prompt: string) => void;
}

function SuggestedPromptCard({ icon, title, prompt, onClick }: SuggestedPromptCardProps) {
    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onClick(prompt)}
            className="p-6 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 hover:border-purple-500/30 rounded-xl transition-all group"
        >
            <div className="flex flex-col items-center gap-3 text-center">
                <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg group-hover:from-purple-500/30 group-hover:to-pink-500/30 transition-all">
                    {icon}
                </div>
                <h4 className="text-lg font-semibold text-white">{title}</h4>
                <p className="text-sm text-white/60">{prompt}</p>
            </div>
        </motion.button>
    );
}

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (messageText: string) => {
        if (!messageText.trim() || loading) return;

        const userMessage: Message = {
            role: 'user',
            content: messageText,
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        // Add placeholder assistant message
        setMessages((prev) => [...prev, {
            role: 'assistant',
            content: '',
        }]);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: messageText }]
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to get response');
            }

            // Handle streaming response
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let accumulatedText = '';
            let sources: any[] = [];

            while (true) {
                const { done, value } = await reader!.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));

                            if (data.text) {
                                accumulatedText += data.text;
                                // Update message in real-time
                                setMessages((prev) => {
                                    const newMsgs = [...prev];
                                    newMsgs[newMsgs.length - 1] = {
                                        role: 'assistant',
                                        content: accumulatedText,
                                    };
                                    return newMsgs;
                                });
                            }

                            if (data.done && data.sources) {
                                sources = data.sources;
                                // Add sources to final message
                                setMessages((prev) => {
                                    const newMsgs = [...prev];
                                    newMsgs[newMsgs.length - 1] = {
                                        role: 'assistant',
                                        content: accumulatedText,
                                        sources: sources,
                                    };
                                    return newMsgs;
                                });
                            }
                        } catch (e) {
                            console.error('Error parsing SSE data:', e);
                        }
                    }
                }
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'An error occurred');
            setMessages((prev) => {
                const newMsgs = [...prev];
                newMsgs[newMsgs.length - 1] = {
                    role: 'assistant',
                    content: 'Sorry, I encountered an error. Please try again.',
                };
                return newMsgs;
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSuggestedPrompt = (prompt: string) => {
        handleSendMessage(prompt);
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(input);
        }
    };

    return (
        <>
            {/* Navbar */}
            <Navbar />

            {/* Global theme background matching share-experience page */}
            <div className="min-h-screen bg-black bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] text-white">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="h-[calc(100vh-80px)] flex items-center justify-center p-4 md:p-8 relative"
                >
                    {/* Back button */}
                    <div className="absolute top-6 left-6 z-10">
                        <Link href="/">
                            <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-lg text-white transition-all">
                                <ArrowLeft className="h-4 w-4" />
                                <span className="hidden sm:inline">Back</span>
                            </button>
                        </Link>
                    </div>

                    {/* Main Chat Container */}
                    <div className="w-full max-w-6xl h-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
                                    <Sparkles className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-white">AI Assistant</h1>
                                    <p className="text-sm text-white/60">Powered by Gemini Pro & RAG</p>
                                </div>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div
                            ref={scrollAreaRef}
                            className="flex-1 overflow-y-auto p-6 space-y-4"
                        >
                            {messages.length === 0 ? (
                                // Empty State
                                <div className="flex flex-col items-center justify-center h-full gap-8">
                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ delay: 0.2 }}
                                        className="text-center"
                                    >
                                        <h2 className="text-3xl font-bold text-white mb-2">Start a conversation</h2>
                                        <p className="text-white/60">Ask me anything about placement experiences</p>
                                    </motion.div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl w-full">
                                        <SuggestedPromptCard
                                            icon={<Target className="h-6 w-6 text-purple-400" />}
                                            title="Mock Interview"
                                            prompt="Can you give me common interview questions for Google SDE role?"
                                            onClick={handleSuggestedPrompt}
                                        />
                                        <SuggestedPromptCard
                                            icon={<FileText className="h-6 w-6 text-pink-400" />}
                                            title="Resume Tips"
                                            prompt="What skills are most valued by top tech companies?"
                                            onClick={handleSuggestedPrompt}
                                        />
                                        <SuggestedPromptCard
                                            icon={<TrendingUp className="h-6 w-6 text-blue-400" />}
                                            title="Market Trends"
                                            prompt="Which companies hired the most this year?"
                                            onClick={handleSuggestedPrompt}
                                        />
                                    </div>
                                </div>
                            ) : (
                                // Messages
                                <>
                                    {messages.map((message, idx) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            {message.role === 'assistant' && (
                                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                                                    <Bot className="h-6 w-6 text-white" />
                                                </div>
                                            )}

                                            <div
                                                className={`max-w-[70%] p-4 ${message.role === 'user'
                                                    ? 'bg-purple-600/20 text-purple-100 border border-purple-500/30 rounded-tl-xl rounded-br-xl'
                                                    : 'bg-zinc-800/50 text-zinc-100 rounded-tr-xl rounded-bl-xl'
                                                    }`}
                                            >
                                                <p className="whitespace-pre-wrap leading-relaxed">
                                                    {message.content || (
                                                        <span className="flex gap-1">
                                                            <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                            <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                            <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                        </span>
                                                    )}
                                                </p>

                                                {message.sources && message.sources.length > 0 && (
                                                    <div className="mt-3 pt-3 border-t border-white/20">
                                                        <p className="text-xs text-white/60 mb-2">📚 Sources:</p>
                                                        <div className="space-y-1">
                                                            {message.sources.map((source, sIdx) => (
                                                                <div key={sIdx} className="text-xs text-white/80">
                                                                    • {source.company} - {source.role} ({Math.round(source.similarity * 100)}% match)
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {message.role === 'user' && (
                                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                                    <UserIcon className="h-6 w-6 text-white" />
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </>
                            )}
                        </div>

                        {/* Input Area - Fixed at Bottom */}
                        <div className="p-4 border-t border-white/10 bg-black/20">
                            <div className="flex gap-3 items-end max-w-4xl mx-auto">
                                <div className="flex-1 relative">
                                    <textarea
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={handleKeyPress}
                                        placeholder="Ask about placement experiences..."
                                        className="w-full px-4 py-3 bg-white/5 backdrop-blur-md border border-white/10 focus:border-purple-500/50 rounded-xl text-white placeholder:text-white/40 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
                                        rows={2}
                                        disabled={loading}
                                    />
                                </div>
                                <button
                                    onClick={() => handleSendMessage(input)}
                                    disabled={loading || !input.trim()}
                                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl hover:shadow-purple-500/50 flex items-center gap-2"
                                >
                                    <Send className="h-5 w-5" />
                                    <span className="hidden sm:inline">Send</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </>
    );
}
