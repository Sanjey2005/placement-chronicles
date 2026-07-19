'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
    ArrowUp,
    Copy,
    Check,
    Paperclip
} from 'lucide-react';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    sources?: Array<{
        company: string;
        role: string;
        student?: string;
        similarity: number;
    }>;
}

const GREETINGS = [
    "What would you like to know before your next interview?",
    "Which company's interview process are you preparing for?",
    "Ask me about DSA questions, HR rounds, or student CTCs.",
    "How can I help you prepare for your upcoming placement?",
    "Search through verified student placement experiences.",
    "Looking for interview tips? Ask away."
];

interface AutoResizeProps {
    minHeight: number;
    maxHeight?: number;
}

function useAutoResizeTextarea({ minHeight, maxHeight }: AutoResizeProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = useCallback(
        (reset?: boolean) => {
            const textarea = textareaRef.current;
            if (!textarea) return;

            if (reset) {
                textarea.style.height = `${minHeight}px`;
                return;
            }

            textarea.style.height = `${minHeight}px`; // reset first
            const newHeight = Math.max(
                minHeight,
                Math.min(textarea.scrollHeight, maxHeight ?? Infinity)
            );
            textarea.style.height = `${newHeight}px`;
        },
        [minHeight, maxHeight]
    );

    useEffect(() => {
        if (textareaRef.current) textareaRef.current.style.height = `${minHeight}px`;
    }, [minHeight]);

    return { textareaRef, adjustHeight };
}

interface ComposerProps {
    input: string;
    onInputChange: (value: string) => void;
    onSend: () => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    loading: boolean;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    adjustHeight: (reset?: boolean) => void;
}

function Composer({ input, onInputChange, onSend, onKeyDown, loading, textareaRef, adjustHeight }: ComposerProps) {
    return (
        <div className="relative w-full bg-card border border-outline-variant rounded-xl shadow-m3 transition-all">
            <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                    onInputChange(e.target.value);
                    adjustHeight();
                }}
                onKeyDown={onKeyDown}
                placeholder="Ask about placement experiences..."
                className="w-full px-4 py-3 resize-none bg-transparent text-foreground text-sm placeholder:text-outline/75 min-h-[48px] !border-0 !ring-0 !outline-none !shadow-none focus:!border-0 focus:!ring-0 focus:!outline-none focus:!shadow-none"
                style={{ overflow: "hidden", border: "none", boxShadow: "none", outline: "none" }}
                disabled={loading}
            />

            {/* Footer Buttons */}
            <div className="flex items-center justify-end px-3 pb-3 pt-1">
                <div className="flex items-center gap-2">
                    <Button
                        onClick={onSend}
                        disabled={loading || !input.trim()}
                        size="icon"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                    >
                        <ArrowUp className="w-4 h-4" />
                        <span className="sr-only">Send</span>
                    </Button>
                </div>
            </div>
        </div>
    );
}

const ASSISTANT_PROSE =
    'prose prose-sm max-w-none ' +
    'prose-headings:text-foreground prose-headings:font-semibold ' +
    'prose-h1:text-lg prose-h1:mt-5 prose-h1:mb-2 ' +
    'prose-h2:text-base prose-h2:mt-5 prose-h2:mb-2 ' +
    'prose-h3:text-sm prose-h3:tracking-wide prose-h3:mt-5 prose-h3:mb-2 prose-h3:pb-1.5 prose-h3:border-b prose-h3:border-outline-variant first:prose-h3:mt-0 ' +
    'prose-p:text-foreground/90 prose-p:leading-relaxed ' +
    'prose-li:text-foreground/90 prose-li:my-0.5 marker:text-muted-foreground ' +
    'prose-strong:text-foreground prose-strong:font-semibold ' +
    'prose-code:text-primary prose-code:bg-surface-container prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none ' +
    'prose-pre:bg-surface-container prose-pre:border prose-pre:border-outline-variant prose-pre:rounded-xl ' +
    'prose-a:text-primary prose-a:underline hover:prose-a:text-primary/80 ' +
    'prose-blockquote:border-primary prose-blockquote:text-muted-foreground prose-blockquote:not-italic ' +
    'prose-table:text-xs prose-th:text-foreground prose-td:text-foreground/90 prose-tr:border-outline-variant prose-thead:border-outline-variant';

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
    const [greeting, setGreeting] = useState('');
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { textareaRef, adjustHeight } = useAutoResizeTextarea({
        minHeight: 48,
        maxHeight: 150,
    });

    // Select dynamic greeting on client mount to avoid hydration mismatch
    useEffect(() => {
        const randomIndex = Math.floor(Math.random() * GREETINGS.length);
        setGreeting(GREETINGS[randomIndex]);
    }, []);

    // Auto-scroll to bottom of message thread
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Keyboard shortcut for starting a new chat (CMD/CTRL + N)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
                e.preventDefault();
                handleNewChat();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleNewChat = () => {
        setMessages([]);
        setInput('');
        adjustHeight(true);
    };

    const handleCopy = async (idx: number, content: string) => {
        try {
            await navigator.clipboard.writeText(content);
            setCopiedIdx(idx);
            setTimeout(() => setCopiedIdx((current) => (current === idx ? null : current)), 1500);
        } catch {
            toast.error('Could not copy to clipboard');
        }
    };

    const handleSendMessage = async (messageText: string) => {
        if (!messageText.trim() || loading) return;

        const userMessage: Message = {
            role: 'user',
            content: messageText,
        };

        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInput('');
        adjustHeight(true);
        setLoading(true);

        const assistantPlaceholder: Message = {
            role: 'assistant',
            content: '',
        };
        setMessages([...updatedMessages, assistantPlaceholder]);

        try {
            const historyToSend = updatedMessages
                .slice(-10)
                .map(m => ({ role: m.role, content: m.content }));

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: historyToSend
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to get response');
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let accumulatedText = '';
            let sources: Message['sources'] = [];

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

    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(input);
        }
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground">
            <Navbar />
            
            <div className="flex-1 flex overflow-hidden relative">
                {/* Main Chat Content View */}
                <div className="flex-1 flex flex-col min-w-0 h-full relative">
                    
                    {/* Messages Scroll Area */}
                    <div className="flex-1 overflow-y-auto bg-background">
                        {messages.length === 0 ? (
                            /* Empty State layout */
                            <div className="min-h-full flex flex-col justify-center px-4 py-8 max-w-2xl mx-auto w-full">
                                <div className="flex flex-col items-center justify-center gap-8 -mt-16">
                                    <h2 className="text-lg sm:text-xl md:text-2xl font-medium text-foreground text-center tracking-tight leading-normal px-4">
                                        {greeting}
                                    </h2>
                                    
                                    <div className="w-full">
                                        <Composer
                                            input={input}
                                            onInputChange={setInput}
                                            onSend={() => handleSendMessage(input)}
                                            onKeyDown={handleKeyPress}
                                            loading={loading}
                                            textareaRef={textareaRef}
                                            adjustHeight={adjustHeight}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Message List (Thread format) */
                            <div className="p-6 space-y-6">
                                <div className="max-w-3xl mx-auto space-y-6">
                                    {messages.map((message, idx) => (
                                        <div
                                            key={idx}
                                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            {message.role === 'user' ? (
                                                /* User bubble */
                                                <div className="bg-surface-container text-foreground rounded-2xl px-5 py-3.5 max-w-[80%] shadow-xs whitespace-pre-wrap leading-relaxed text-sm">
                                                    {message.content}
                                                </div>
                                            ) : (
                                                /* Assistant response */
                                                <div className="flex gap-4 items-start w-full min-w-0">
                                                    <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-outline-variant bg-card flex items-center justify-center shadow-xs">
                                                        <img src="/logo.png" alt="AI Avatar" className="w-5.5 h-5.5 object-contain" />
                                                    </div>
                                                    
                                                    <div className="flex-1 min-w-0 space-y-2">
                                                        <div className="text-[10px] font-bold uppercase tracking-wider text-outline select-none">
                                                            Assistant
                                                        </div>
                                                        
                                                        <div className="text-foreground">
                                                            {message.content ? (
                                                                <div className={ASSISTANT_PROSE}>
                                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                                        {message.content}
                                                                    </ReactMarkdown>
                                                                </div>
                                                            ) : (
                                                                <span className="flex gap-1.5 py-2">
                                                                    <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                                    <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                                    <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                                </span>
                                                            )}
                                                        </div>

                                                        {message.content && (
                                                            <div className="pt-2 flex flex-col gap-3">
                                                                {/* Source citation cards */}
                                                                {message.sources && message.sources.length > 0 && (
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {message.sources.map((source, sIdx) => (
                                                                            <div
                                                                                key={sIdx}
                                                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface-container-high border border-outline-variant rounded-full text-xs text-muted-foreground hover:text-foreground cursor-default transition-all"
                                                                                title={`${source.company} - ${source.role}`}
                                                                            >
                                                                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                                                                <span>{source.company}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                
                                                                {/* Copy action */}
                                                                <div className="flex items-center">
                                                                    <button
                                                                        onClick={() => handleCopy(idx, message.content)}
                                                                        className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-surface-container rounded-lg transition-all"
                                                                    >
                                                                        {copiedIdx === idx ? (
                                                                            <>
                                                                                <Check className="h-3.5 w-3.5 text-success" />
                                                                                <span>Copied</span>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Copy className="h-3.5 w-3.5" />
                                                                                <span>Copy</span>
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bottom Composer Input Bar */}
                    {messages.length > 0 && (
                        <div className="p-4 border-t border-outline-variant bg-background shrink-0">
                            <div className="max-w-3xl mx-auto">
                                <Composer
                                    input={input}
                                    onInputChange={setInput}
                                    onSend={() => handleSendMessage(input)}
                                    onKeyDown={handleKeyPress}
                                    loading={loading}
                                    textareaRef={textareaRef}
                                    adjustHeight={adjustHeight}
                                />
                                <p className="text-center text-[10px] text-outline/60 mt-2 select-none">
                                    Press Enter to send • Shift + Enter for a new line
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
