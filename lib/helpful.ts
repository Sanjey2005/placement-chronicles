import { createHash } from 'node:crypto';

/**
 * Stable, one-way voter code for "helpful" votes: the same student always maps
 * to the same code (so votes dedupe), but the roll number itself is never stored.
 * Server-only; null when SESSION_SECRET is missing.
 */
export function helpfulVoterId(sub: string): string | null {
    const secret = process.env.SESSION_SECRET;
    if (!secret) return null;
    return createHash('sha256').update(`${secret}|helpful|${sub}`).digest('hex').slice(0, 24);
}
