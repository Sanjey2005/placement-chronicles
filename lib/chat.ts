// Pure helpers for the /chat client: SSE parsing, history, source labels and the streaming
// caret. Type-only imports, so scripts/chat.test.mjs can load it straight into Node like lib/analytics.ts.
import type { Element, Root } from 'hast';

/** One source as /api/chat sends it: one per retrieved chunk, so a student can repeat. */
export interface ChatSource {
    company: string;
    role: string;
    student?: string;
    /** The experience's _id; answers from before it was sent have none. */
    experienceId?: string;
    similarity: number;
}

/** A `data:` payload from /api/chat: text deltas, then `{ sources, done: true }`. */
export interface ChatEvent {
    text?: string;
    sources?: ChatSource[];
    done?: boolean;
}

export interface ChatTurn {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    status?: 'streaming' | 'done' | 'stopped' | 'error';
    sources?: ChatSource[];
    /** `limit` is the per-window question budget the 429 reported, when it said. */
    error?: { kind: 'limit' | 'auth' | 'server'; limit?: number };
}

/** Splits the complete events off an SSE buffer; `rest` is the unfinished tail to keep. */
export function takeEvents(buffer: string): { events: ChatEvent[]; rest: string } {
    const parts = buffer.split('\n\n');
    const rest = parts.pop() ?? '';
    const events: ChatEvent[] = [];
    for (const part of parts) {
        if (!part.startsWith('data: ')) continue;
        try {
            events.push(JSON.parse(part.slice(6)));
        } catch {
            // ponytail: a malformed event is skipped; the rest of the answer still renders
        }
    }
    return { events, rest };
}

/** The last 10 turns worth sending back: questions, and answers that actually arrived. */
export function apiHistory(turns: ChatTurn[]): Array<{ role: ChatTurn['role']; content: string }> {
    return turns
        .filter((t) => t.role === 'user' || ((t.status === 'done' || t.status === 'stopped') && t.content))
        .slice(-10)
        .map((t) => ({ role: t.role, content: t.content }));
}

/** One entry per experience (or student at a company, without an id), in the route's relevance order. */
export function uniqueSources(sources: ChatSource[]): ChatSource[] {
    const seen = new Set<string>();
    return sources.filter((s) => {
        const key = s.experienceId ?? `${s.student ?? ''}|${s.company}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

/** The company page's reader, opened on this experience. */
export const experienceHref = (s: ChatSource) =>
    s.experienceId ? `/?${new URLSearchParams({ company: s.company, view: 'all', exp: s.experienceId })}` : null;

// The conversation lives in this browser only, for 5 hours after the last activity, tagged
// with a hash of the signed-in user so a shared lab computer never shows one student another's chat.
const SAVED_CHAT_KEY = 'placement-chronicles:chat';
export const SAVED_CHAT_TTL_MS = 5 * 60 * 60 * 1000;

/** The saved turns if they belong to `owner` and are fresh; an answer cut off mid-stream comes back stopped. */
export function readSavedChat(raw: string | null, owner: string, now: number): ChatTurn[] | null {
    try {
        const saved = raw ? JSON.parse(raw) : null;
        if (saved?.owner !== owner || !(now - saved.savedAt < SAVED_CHAT_TTL_MS) || !Array.isArray(saved.turns)) return null;
        return (saved.turns as ChatTurn[]).map((t) => (t.status === 'streaming' ? { ...t, status: 'stopped' } : t));
    } catch {
        return null;
    }
}

export const savedChatJson = (turns: ChatTurn[], owner: string, now: number) => JSON.stringify({ owner, savedAt: now, turns });

// Storage can throw (private mode, blocked site data); a lost save only costs the restore.
export function loadChat(owner: string): ChatTurn[] | null {
    try {
        return readSavedChat(localStorage.getItem(SAVED_CHAT_KEY), owner, Date.now());
    } catch {
        return null;
    }
}

export function saveChat(turns: ChatTurn[], owner: string) {
    try {
        if (turns.length) localStorage.setItem(SAVED_CHAT_KEY, savedChatJson(turns, owner, Date.now()));
        else localStorage.removeItem(SAVED_CHAT_KEY);
    } catch {
        // not saved; the chat still works
    }
}

export const clearSavedChat = () => saveChat([], '');

/** "4 J.P. Morgan experiences"; the company is left out when the sources span several. */
export function sourcesLabel(sources: ChatSource[]): string {
    const n = sources.length;
    const company = new Set(sources.map((s) => s.company)).size === 1 ? `${sources[0].company} ` : '';
    return `${n} ${company}experience${n === 1 ? '' : 's'}`;
}

/** "Sree Varshni S" -> "SV", "L. Shambhavi" -> "LS", "Aparna" -> "A". */
export function initials(name: string | undefined): string {
    const words = (name ?? '').replace(/[^\p{L}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean);
    return words.slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
}

const VOID = new Set(['br', 'hr', 'img', 'input']);

/**
 * Rehype plugin for the streaming caret: a `<span>` inside the deepest last element, so it
 * trails the last word. Empty elements count (a table cell still being written), void ones don't.
 */
export function rehypeCaret({ className }: { className: string }) {
    return (tree: Root) => {
        let node: Root | Element = tree;
        for (;;) {
            const kids: Root['children'] = node.children;
            const last = kids.findLast((c) => c.type === 'element' || (c.type === 'text' && c.value.trim() !== ''));
            if (last?.type !== 'element' || VOID.has(last.tagName)) break;
            node = last;
        }
        node.children.push({ type: 'element', tagName: 'span', properties: { className: className.split(' ') }, children: [] });
    };
}

const ROLE_LABELS: Record<string, string> = {
    FULL_TIME: 'Full-time',
    INTERNSHIP: 'Internship',
    SUMMER_INTERNSHIP: 'Summer internship',
};

export const roleLabel = (role: string | undefined) => (role ? ROLE_LABELS[role] ?? role : '');
