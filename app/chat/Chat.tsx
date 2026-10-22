'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiHistory, takeEvents, uniqueSources, type ChatSource, type ChatTurn } from '@/lib/chat';
import Answer from './Answer';
import ChatHeader from './ChatHeader';

// ponytail: picked from the companies with the most experiences today; derive them from the
// counts if this list starts pointing at companies the chat can't answer for.
const SUGGESTIONS = [
    { company: 'J.P. Morgan', label: 'rounds and eligibility', prompt: "How many rounds does J.P. Morgan's CIB R&A internship have, and what is the eligibility?" },
    { company: 'Thorogood', label: 'interview questions', prompt: 'What questions does Thorogood ask in the Data Analyst interview?' },
    { company: 'KLA', label: 'hackathon round', prompt: "What happens in KLA's hackathon round?" },
    { company: 'Goldman Sachs', label: 'DSA topics', prompt: "Which DSA topics came up in Goldman Sachs' online test?" },
];

// The dot grid fades to 12% under the reading column once there is something to read
const COLUMN_MASK = 'linear-gradient(90deg, #000, #000 calc(50% - 470px), rgb(0 0 0 / 0.12) calc(50% - 390px), rgb(0 0 0 / 0.12) calc(50% + 390px), #000 calc(50% + 470px))';
const BLUR_STEPS = [2, 4, 8, 16];

const finePointer = () => window.matchMedia('(pointer: fine)').matches;

/** Content dissolves under the header and the composer instead of meeting a hard edge. */
function ProgressiveBlur({ side }: { side: 'top' | 'bottom' }) {
    const toward = side === 'top' ? 'to top' : 'to bottom';
    return (
        <div aria-hidden className={cn('pointer-events-none absolute inset-x-0 z-10', side === 'top' ? 'top-0 h-20' : 'bottom-0 h-40')}>
            {BLUR_STEPS.map((px, i) => {
                // Inline, not CSS: the CSS build drops hand-written backdrop-filter (see .glass in globals.css)
                const mask = `linear-gradient(${toward}, transparent ${i * 25}%, #000 ${i * 25 + 25}%, #000 ${i * 25 + 50}%, transparent ${i * 25 + 75}%)`;
                return (
                    <div
                        key={px}
                        className="absolute inset-0"
                        style={{ backdropFilter: `blur(${px}px)`, WebkitBackdropFilter: `blur(${px}px)`, maskImage: mask, WebkitMaskImage: mask }}
                    />
                );
            })}
            <div className={cn('absolute inset-0 from-transparent to-background/85', side === 'top' ? 'bg-gradient-to-t' : 'bg-gradient-to-b')} />
        </div>
    );
}

export default function Chat({ stats }: { stats: { experiences: number; companies: number } | null }) {
    const [turns, setTurns] = useState<ChatTurn[]>([]);
    const [input, setInput] = useState('');
    const [limitUntil, setLimitUntil] = useState<number | null>(null);
    const [now, setNow] = useState(0);
    const [showJump, setShowJump] = useState(false);
    const nextId = useRef(0);
    const abortRef = useRef<AbortController | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const pinned = useRef(true);
    const lastTop = useRef(0);
    const smoothNext = useRef(false);

    const empty = turns.length === 0;
    const streaming = turns.at(-1)?.status === 'streaming';
    const waitSecs = limitUntil ? Math.max(0, Math.ceil((limitUntil - now) / 1000)) : 0;

    const patch = (id: number, changes: Partial<ChatTurn>) =>
        setTurns((ts) => ts.map((t) => (t.id === id ? { ...t, ...changes } : t)));

    const ask = async (history: ChatTurn[]) => {
        const id = nextId.current++;
        setTurns([...history, { id, role: 'assistant', content: '', status: 'streaming' }]);
        const controller = new AbortController();
        abortRef.current = controller;
        let text = '';
        let frame = 0;
        // One render per frame, not per token: Groq streams faster than markdown re-parses
        const flush = () => {
            frame = 0;
            patch(id, { content: text });
        };

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: apiHistory(history) }),
                signal: controller.signal,
            });
            if (!res.ok || !res.body) {
                const body = await res.json().catch(() => ({}));
                if (res.status === 429) {
                    setNow(Date.now());
                    setLimitUntil(typeof body.reset === 'number' ? body.reset : null);
                }
                const kind = res.status === 429 ? 'limit' : res.status === 401 ? 'auth' : 'server';
                patch(id, { status: 'error', error: { kind, limit: typeof body.limit === 'number' ? body.limit : undefined } });
                return;
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let sources: ChatSource[] | null = null;
            for (;;) {
                const { value, done } = await reader.read();
                if (done) break;
                const { events, rest } = takeEvents(buffer + decoder.decode(value, { stream: true }));
                buffer = rest;
                for (const event of events) {
                    if (event.text) {
                        text += event.text;
                        frame ||= requestAnimationFrame(flush);
                    }
                    if (event.done) sources = event.sources ?? [];
                }
            }
            cancelAnimationFrame(frame);
            // No closing event means the stream was cut short: keep what arrived and offer a retry
            patch(id, sources
                ? { content: text, status: 'done', sources: uniqueSources(sources) }
                : { content: text, status: 'error', error: { kind: 'server' } });
        } catch {
            cancelAnimationFrame(frame);
            patch(id, controller.signal.aborted
                ? { content: text, status: 'stopped' }
                : { content: text, status: 'error', error: { kind: 'server' } });
        } finally {
            if (abortRef.current === controller) abortRef.current = null;
        }
    };

    const send = (text: string) => {
        const question = text.trim();
        if (!question || streaming || waitSecs > 0) return;
        setInput('');
        pinned.current = true;
        smoothNext.current = true;
        void ask([...turns, { id: nextId.current++, role: 'user', content: question }]);
    };

    const retry = () => {
        const lastQuestion = turns.findLastIndex((t) => t.role === 'user');
        if (lastQuestion < 0 || streaming) return;
        pinned.current = true;
        void ask(turns.slice(0, lastQuestion + 1));
    };

    const newChat = () => {
        abortRef.current?.abort();
        setTurns([]);
        setInput('');
        setShowJump(false);
        pinned.current = true;
        if (finePointer()) inputRef.current?.focus();
    };

    const jumpToLatest = () => {
        const el = scrollRef.current;
        if (!el) return;
        pinned.current = true;
        setShowJump(false);
        el.scrollTo({ top: el.scrollHeight }); // smooth via the scroller's CSS, unless reduced motion
    };

    const onScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        // Only scrolling up unpins; a growing answer or our own smooth scroll never does
        if (el.scrollHeight - el.scrollTop - el.clientHeight < 64) pinned.current = true;
        else if (el.scrollTop < lastTop.current) pinned.current = false;
        lastTop.current = el.scrollTop;
        setShowJump(!pinned.current);
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
        if (window.matchMedia('(pointer: coarse)').matches) return; // phones: Return is a new line, the button sends
        e.preventDefault();
        send(input);
    };

    // Follow the answer while the reader is at the bottom; leave them be once they scroll up
    useLayoutEffect(() => {
        const el = scrollRef.current;
        if (!el || !pinned.current) return;
        el.scrollTo({ top: el.scrollHeight, behavior: smoothNext.current ? undefined : 'instant' });
        smoothNext.current = false;
    }, [turns]);

    // Auto-grow the composer up to 13 lines; a taller composer would cover the answer's last line
    useLayoutEffect(() => {
        const ta = inputRef.current;
        if (!ta) return;
        ta.style.height = 'auto';
        ta.style.height = `${Math.min(ta.scrollHeight, 208)}px`;
        const el = scrollRef.current;
        if (el && pinned.current) el.scrollTo({ top: el.scrollHeight, behavior: 'instant' });
    }, [input]);

    // Rate-limit countdown, ticking only while a limit is in force
    useEffect(() => {
        if (!limitUntil) return;
        const timer = setInterval(() => {
            const t = Date.now();
            setNow(t);
            if (t >= limitUntil) setLimitUntil(null);
        }, 1000);
        return () => clearInterval(timer);
    }, [limitUntil]);

    useEffect(() => {
        if (finePointer()) inputRef.current?.focus(); // not on phones: it would pop the keyboard
        const inflight = abortRef;
        return () => inflight.current?.abort(); // leaving the page stops the answer
    }, []);

    const hint = streaming
        ? 'Answering… you can type your next question'
        : waitSecs > 0
            ? 'Sending pauses until the limit resets'
            : null;

    return (
        <div className="relative h-dvh overflow-hidden bg-background text-foreground">
            {/* The app's dot grid, same tokens as GridBackground */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                    backgroundImage: 'radial-gradient(circle at 1px 1px, var(--dot-color) 1px, transparent 0)',
                    backgroundSize: '32px 32px',
                    opacity: 'var(--dot-opacity)',
                    maskImage: empty ? undefined : COLUMN_MASK,
                    WebkitMaskImage: empty ? undefined : COLUMN_MASK,
                }}
            />
            <ChatHeader onNewChat={empty ? undefined : newChat} />
            {!empty && <ProgressiveBlur side="top" />}

            <div ref={scrollRef} onScroll={onScroll} className="relative h-full overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-gutter:stable] motion-safe:scroll-smooth">
                <div className={cn('mx-auto flex min-h-full w-full max-w-[760px] flex-col px-4 sm:px-6', empty ? 'justify-center gap-[30px] pb-16 pt-24' : 'pt-20')}>
                    {empty ? (
                        <div className="flex flex-col items-center gap-3 text-center">
                            <h2 className="text-[32px] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[44px]">Which interview is next?</h2>
                            <p className="max-w-md text-base text-muted-foreground sm:max-w-none sm:text-[17px]">
                                {stats
                                    ? `Grounded in ${stats.experiences} experiences from ${stats.companies} companies, shared by PSG Tech students.`
                                    : 'Grounded in experiences shared by PSG Tech students.'}
                            </p>
                        </div>
                    ) : (
                        <div role="log" aria-label="Conversation" className="flex flex-col gap-6 pb-10">
                            {turns.map((t, i) => t.role === 'user' ? (
                                <div key={t.id} className={cn('flex justify-end', i > 0 && 'mt-6')}>
                                    <p className="glass max-w-[86%] whitespace-pre-wrap break-words rounded-[22px] rounded-br-[6px] bg-primary-fixed/70 px-[18px] py-3 text-base font-medium leading-[1.55] shadow-none before:opacity-50 sm:max-w-[min(80%,560px)]">
                                        {t.content}
                                    </p>
                                </div>
                            ) : (
                                <Answer key={t.id} turn={t} {...(i === turns.length - 1 && { waitSecs, onRetry: retry })} />
                            ))}
                        </div>
                    )}

                    {/* Same element in both layouts, so the textarea keeps focus when the first answer starts */}
                    <div className={cn(!empty && 'sticky bottom-0 z-20 mt-auto pb-[max(1rem,env(safe-area-inset-bottom))]')}>
                        {showJump && !empty && (
                            <button type="button" onClick={jumpToLatest} aria-label="Jump to latest" className="glass absolute -top-14 left-1/2 grid size-10 -translate-x-1/2 place-items-center rounded-full bg-card/80 text-foreground">
                                <ArrowDown className="size-[18px]" aria-hidden />
                            </button>
                        )}
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                send(input);
                            }}
                            className="glass rounded-2xl bg-card/80 focus-within:outline-2 focus-within:outline-primary/30 focus-within:before:opacity-100"
                        >
                            {/* Breathes while an answer streams in; the Stop button says the same thing without motion */}
                            {streaming && (
                                <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--primary)_30%,transparent),inset_0_0_32px_color-mix(in_srgb,var(--primary)_16%,transparent)] motion-safe:animate-pulse" />
                            )}
                            <textarea
                                ref={inputRef}
                                rows={1}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={onKeyDown}
                                aria-label="Ask about placement experiences"
                                placeholder={empty ? 'Ask about a company, a round or an interview question' : 'Ask a follow-up'}
                                className="relative block max-h-52 min-h-14 w-full resize-none overflow-y-auto bg-transparent px-5 pt-4 text-base font-medium leading-6 text-foreground outline-none placeholder:text-outline focus:ring-0!"
                            />
                            <div className="relative flex items-center justify-between gap-3 py-2 pl-5 pr-2">
                                <span className="truncate font-mono text-[11px] text-outline">
                                    {hint ?? (
                                        <>
                                            <span className="pointer-coarse:hidden">Enter to send · Shift + Enter for a new line</span>
                                            <span className="hidden pointer-coarse:inline">Return adds a new line</span>
                                        </>
                                    )}
                                </span>
                                {streaming ? (
                                    <button type="button" onClick={() => abortRef.current?.abort()} aria-label="Stop answering" className="grid size-11 shrink-0 place-items-center rounded-full bg-foreground text-background transition-opacity hover:opacity-90 sm:size-10">
                                        <Square className="size-3.5" fill="currentColor" aria-hidden />
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={!input.trim() || waitSecs > 0}
                                        aria-label={waitSecs > 0 ? `Sending is paused for ${waitSecs} seconds` : 'Send'}
                                        className={cn(
                                            'grid size-11 shrink-0 place-items-center rounded-full font-mono text-[13px] font-semibold transition-opacity sm:size-10',
                                            waitSecs > 0
                                                ? 'border border-hairline bg-surface-container text-outline'
                                                : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40'
                                        )}
                                    >
                                        {waitSecs > 0 ? waitSecs : <ArrowUp className="size-[18px]" strokeWidth={2.4} aria-hidden />}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {empty && (
                        <div className="flex flex-wrap justify-center gap-2">
                            {SUGGESTIONS.map((s) => (
                                <button
                                    key={s.company}
                                    type="button"
                                    onClick={() => send(s.prompt)}
                                    disabled={waitSecs > 0}
                                    className="glass inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-foreground transition-transform hover:-translate-y-0.5 hover:before:opacity-100 disabled:opacity-60 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                                >
                                    <span className="font-bold text-primary">{s.company}</span> {s.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {!empty && <ProgressiveBlur side="bottom" />}
        </div>
    );
}
