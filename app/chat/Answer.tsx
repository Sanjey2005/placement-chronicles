'use client';

import { memo, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import Markdown, { type Components, type Options } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, ChevronDown, Clock, Copy, Lock, RotateCcw, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { experienceHref, initials, rehypeCaret, roleLabel, sourcesLabel, type ChatTurn } from '@/lib/chat';

// Answer markdown on the typography plugin. Its colours point at the theme tokens, so one set
// works in light and dark; ### section headings read as small violet labels and numbered lists
// get mono 01, 02 markers, like the rounds on the company page.
const PROSE = [
    'prose max-w-none text-base font-medium leading-[1.7] sm:text-[17px] [&>:first-child]:mt-0 [&>:last-child]:mb-0',
    '[--tw-prose-body:var(--foreground)] [--tw-prose-headings:var(--foreground)] [--tw-prose-bold:var(--foreground)]',
    '[--tw-prose-links:var(--primary)] [--tw-prose-counters:var(--primary)] [--tw-prose-bullets:var(--outline)]',
    '[--tw-prose-code:var(--foreground)] [--tw-prose-pre-code:var(--foreground)] [--tw-prose-pre-bg:var(--surface-container)]',
    '[--tw-prose-quotes:var(--muted-foreground)] [--tw-prose-quote-borders:var(--outline-variant)]',
    '[--tw-prose-hr:var(--hairline)] [--tw-prose-th-borders:var(--hairline)] [--tw-prose-td-borders:var(--hairline)]',
    'prose-p:my-3 prose-li:my-1 prose-h1:text-lg prose-h2:text-base',
    'prose-h3:mt-7 prose-h3:mb-1.5 prose-h3:text-[13px] prose-h3:font-bold prose-h3:text-primary',
    'prose-ol:[list-style-type:decimal-leading-zero] prose-li:marker:font-mono prose-li:marker:text-[0.75em]',
    'prose-code:rounded-md prose-code:bg-surface-container prose-code:px-1.5 prose-code:py-0.5 prose-code:font-normal prose-code:before:content-none prose-code:after:content-none',
    'prose-pre:rounded-xl prose-pre:border prose-pre:border-hairline',
    'prose-th:text-xs prose-th:text-outline prose-td:whitespace-nowrap',
].join(' ');

const CARET = 'ml-0.5 inline-block h-[1.1em] w-[0.55em] rounded-[3px] bg-primary/85 align-[-0.18em] motion-safe:animate-pulse';

const REMARK = [remarkGfm];
const STREAMING: Options['rehypePlugins'] = [[rehypeCaret, { className: CARET }]];

const COMPONENTS: Components = {
    // Wide tables scroll inside their own box instead of widening the page on phones
    table: ({ children }) => (
        <div className="overflow-x-auto">
            <table>{children}</table>
        </div>
    ),
};

const ACTION = 'inline-flex h-11 items-center gap-1.5 rounded-xl px-2.5 text-[13px] font-semibold text-outline transition-colors hover:bg-surface-container hover:text-foreground sm:h-9';
const BUTTON = 'inline-flex h-9 items-center gap-2 rounded-full border border-hairline px-3.5 text-sm font-bold text-foreground transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-60';

function Avatar({ name, className }: { name?: string; className?: string }) {
    return (
        <span aria-hidden className={cn('grid size-[26px] shrink-0 place-items-center rounded-full bg-primary-fixed font-mono text-[10px] font-semibold text-primary', className)}>
            {initials(name)}
        </span>
    );
}

interface AnswerProps {
    turn: ChatTurn;
    /** Seconds until a rate-limited question can go again; 0 when it can go now. */
    waitSecs?: number;
    /** Only the latest answer can be retried. */
    onRetry?: () => void;
}

function Answer({ turn, waitSecs = 0, onRetry }: AnswerProps) {
    const [copied, setCopied] = useState(false);
    const [showSources, setShowSources] = useState(false);
    const listId = useId();
    const listRef = useRef<HTMLUListElement>(null);
    const { content, status, error, sources = [] } = turn;

    // On the latest answer the list opens under the composer; bring it into view above it
    useEffect(() => {
        if (showSources) listRef.current?.scrollIntoView({ block: 'nearest' });
    }, [showSources]);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            toast.error('Could not copy to clipboard');
        }
    };

    const wait = `${Math.floor(waitSecs / 60)}:${String(waitSecs % 60).padStart(2, '0')}`;
    const retry = onRetry && (
        <button type="button" onClick={onRetry} disabled={waitSecs > 0} className={BUTTON}>
            <RotateCcw className="size-4" aria-hidden />
            {error?.kind !== 'limit' ? 'Retry' : waitSecs > 0 ? `Try again in ${wait}` : 'Try again'}
        </button>
    );

    const notice = error && {
        limit: {
            icon: <Clock className="text-warning" />,
            // "a minute" is chatRateLimiter's window in lib/redis.ts; the global API limiter sends no count
            title: error.limit ? `That's ${error.limit} questions in a minute, the limit for now.` : 'Too many requests right now.',
            body: waitSecs > 0
                ? <>Your question is kept. It can go through in <span className="font-mono text-foreground">{wait}</span>.</>
                : 'Your question is kept. You can send it again now.',
            action: retry,
        },
        auth: {
            icon: <Lock className="text-primary" />,
            title: 'Your session has expired.',
            body: "Sessions last an hour. Sign in again to keep asking; this chat isn't saved.",
            action: <Link href="/login" className={cn(BUTTON, 'border-transparent bg-primary-fixed text-primary hover:bg-primary-fixed-dim')}>Sign in again</Link>,
        },
        server: {
            icon: <TriangleAlert className="text-destructive" />,
            title: 'Something went wrong while answering.',
            body: 'Nothing on your side. Try again, or ask it a different way.',
            action: retry,
        },
    }[error.kind];

    return (
        <article aria-busy={status === 'streaming'} className="flex flex-col gap-3">
            {content ? (
                <div className={PROSE}>
                    <Markdown remarkPlugins={REMARK} rehypePlugins={status === 'streaming' ? STREAMING : undefined} components={COMPONENTS}>
                        {content}
                    </Markdown>
                </div>
            ) : status === 'streaming' && (
                <p className="flex items-center gap-3 text-[15px] font-semibold text-outline">
                    <span aria-hidden className={CARET} />
                    <span className="motion-safe:animate-pulse">Searching experiences…</span>
                </p>
            )}

            {status === 'error' && notice && (
                <div role={error?.kind === 'limit' ? 'status' : 'alert'} className="flex items-start gap-3 rounded-2xl border border-hairline bg-surface-container/60 px-4 py-3.5 [&>svg]:mt-0.5 [&>svg]:size-5 [&>svg]:shrink-0">
                    {notice.icon}
                    <div className="flex min-w-0 flex-col gap-3">
                        <div>
                            <p className="text-[15px] font-bold leading-snug">{notice.title}</p>
                            <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{notice.body}</p>
                        </div>
                        {notice.action && <div>{notice.action}</div>}
                    </div>
                </div>
            )}

            {(status === 'done' || status === 'stopped') && (
                <div className="flex flex-wrap items-center gap-2">
                    {status === 'stopped' && (
                        <span className="inline-flex h-6 items-center rounded-full bg-surface-container px-2.5 text-xs font-bold text-outline">Stopped</span>
                    )}
                    {status === 'stopped' && onRetry && (
                        <button type="button" onClick={onRetry} className={ACTION}>
                            <RotateCcw className="size-4" aria-hidden />
                            Retry
                        </button>
                    )}
                    {sources.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setShowSources((open) => !open)}
                            aria-expanded={showSources}
                            aria-controls={listId}
                            className="inline-flex h-11 items-center gap-2.5 rounded-full border border-hairline pl-1.5 pr-3 text-[13px] font-semibold transition-colors hover:bg-surface-container sm:h-9"
                        >
                            <span className="flex">
                                {sources.slice(0, 3).map((s, i) => (
                                    <Avatar key={i} name={s.student} className={cn('size-6 border-2 border-background text-[9px]', i > 0 && '-ml-2')} />
                                ))}
                            </span>
                            <span><span className="hidden sm:inline">Based on </span>{sourcesLabel(sources)}</span>
                            <ChevronDown className={cn('size-4 text-outline transition-transform motion-reduce:transition-none', showSources && 'rotate-180')} aria-hidden />
                        </button>
                    )}
                    {content && (
                        <button type="button" onClick={copy} aria-label={copied ? 'Copied' : 'Copy answer'} title="Copy answer" className={cn(ACTION, copied && 'text-success hover:text-success')}>
                            {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                        </button>
                    )}
                    {showSources && (
                        <ul ref={listRef} id={listId} className="w-full max-w-[520px] basis-full scroll-mb-40 overflow-hidden rounded-2xl border border-hairline">
                            {sources.map((s) => {
                                const href = experienceHref(s);
                                const row = (
                                    <>
                                        <Avatar name={s.student} />
                                        <span className="truncate font-bold">{s.student || 'A student'}</span>
                                        <span className="text-xs text-outline">{[s.company, roleLabel(s.role)].filter(Boolean).join(' · ')}</span>
                                    </>
                                );
                                const grid = 'grid min-h-11 grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-3 px-3.5 py-2.5 text-sm';
                                return (
                                    <li key={s.experienceId ?? `${s.student}|${s.company}`} className="border-t border-hairline first:border-t-0">
                                        {/* A real link, so middle-click and "open in new tab" work */}
                                        {href ? (
                                            <Link href={href} className={cn(grid, 'transition-colors hover:bg-surface-container focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary')}>
                                                {row}
                                            </Link>
                                        ) : (
                                            <div className={grid}>{row}</div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}
        </article>
    );
}

// Finished answers keep their props, so a streaming reply doesn't re-parse the whole thread
export default memo(Answer);
