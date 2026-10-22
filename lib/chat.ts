// Pure helpers for the /chat client: SSE parsing, history, source labels and the streaming
// caret. Type-only imports, so scripts/chat.test.mjs can load it straight into Node like lib/analytics.ts.
import type { Element, Root } from 'hast';

/** One source as /api/chat sends it: one per retrieved chunk, so a student can repeat. */
export interface ChatSource {
    company: string;
    role: string;
    student?: string;
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

/** One entry per student at a company, in the route's relevance order. */
export function uniqueSources(sources: ChatSource[]): ChatSource[] {
    const seen = new Set<string>();
    return sources.filter((s) => {
        const key = `${s.student ?? ''}|${s.company}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

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
