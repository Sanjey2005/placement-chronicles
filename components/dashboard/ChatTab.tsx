'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User as UserIcon, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import GlassCard from '@/components/GlassCard';
import { toast } from 'sonner';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    sources?: Array<{
        company: string;
        role: string;
        similarity: number;
    }>;
}

export default function ChatTab() {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: 'Hi! I\'m your placement assistant. Ask me anything about interview experiences, companies, or preparation tips!',
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMessage: Message = {
            role: 'user',
            content: input,
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: input }),
            });

            if (!response.ok) {
                throw new Error('Failed to get response');
            }

            const result = await response.json();

            if (result.success) {
                const assistantMessage: Message = {
                    role: 'assistant',
                    content: result.answer,
                    sources: result.sources,
                };
                setMessages((prev) => [...prev, assistantMessage]);
            } else {
                throw new Error(result.error || 'Failed to get response');
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'An error occurred');
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: 'Sorry, I encountered an error. Please try again.',
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Sparkles className="h-6 w-6" />
                AI Chat Assistant
            </h2>

            {/* Messages Area */}
            <GlassCard className="flex-1 flex flex-col overflow-hidden">
                <ScrollArea className="flex-1 p-6" ref={scrollRef}>
                    <div className="space-y-4">
                        {messages.map((message, idx) => (
                            <div
                                key={idx}
                                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'
                                    }`}
                            >
                                {message.role === 'assistant' && (
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                        <Bot className="h-5 w-5 text-white" />
                                    </div>
                                )}

                                <div
                                    className={`max-w-[70%] rounded-lg p-4 ${message.role === 'user'
                                            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                                            : 'bg-white/10 text-white border border-white/20'
                                        }`}
                                >
                                    <p className="whitespace-pre-wrap">{message.content}</p>

                                    {message.sources && message.sources.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-white/20">
                                            <p className="text-xs text-white/60 mb-2">Sources:</p>
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
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                        <UserIcon className="h-5 w-5 text-white" />
                                    </div>
                                )}
                            </div>
                        ))}

                        {loading && (
                            <div className="flex gap-3 justify-start">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                    <Bot className="h-5 w-5 text-white" />
                                </div>
                                <div className="bg-white/10 text-white border border-white/20 rounded-lg p-4">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="p-4 border-t border-white/20">
                    <div className="flex gap-2">
                        <Textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Ask about placement experiences..."
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/40 resize-none"
                            rows={2}
                            disabled={loading}
                        />
                        <Button
                            onClick={handleSend}
                            disabled={loading || !input.trim()}
                            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-6"
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
}
