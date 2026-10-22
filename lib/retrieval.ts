// Pure retrieval helpers for /api/chat: keyword ranking for when embeddings are unavailable, and
// spreading a broad question's context across companies. No imports, so scripts/chat.test.mjs
// can load it straight into Node like lib/analytics.ts.

const STOP_WORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'if', 'so', 'as', 'at', 'by', 'for', 'from', 'in', 'into', 'of', 'on', 'to', 'with',
    'is', 'are', 'was', 'were', 'be', 'been', 'do', 'does', 'did', 'has', 'have', 'had', 'can', 'could', 'should', 'would', 'will',
    'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'his', 'her', 'it', 'its', 'they', 'them', 'their', 'there',
    'this', 'that', 'these', 'those', 'what', 'which', 'when', 'where', 'who', 'why', 'how', 'about', 'any', 'all', 'every',
    'some', 'more', 'most', 'many', 'much', 'also', 'very', 'just', 'only', 'other', 'others', 'than', 'then', 'not', 'no',
    'tell', 'give', 'need', 'want', 'know', 'like', 'get', 'generally', 'general', 'usually', 'common', 'commonly',
    'interview', 'interviews', 'experience', 'experiences', 'placement', 'placements', 'company', 'companies',
    'student', 'students', 'people', 'hired', 'recruit', 'process', 'topic', 'topics', 'round', 'rounds',
    'prepare', 'preparing', 'preparation',
]);

/** Lowercased word tokens without stop words; a trailing plural "s" is dropped ("questions" -> "question"). */
export function terms(text: string): string[] {
    return text
        .toLowerCase()
        .split(/[^a-z0-9+#]+/)
        .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
        .map((w) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w));
}

/** BM25 score of each doc for the query terms; 0 when a doc shares none of them. */
export function keywordScores(query: string[], docs: string[]): number[] {
    const unique = [...new Set(query)];
    const tokenized = docs.map(terms);
    const avgLength = tokenized.reduce((n, d) => n + d.length, 0) / Math.max(1, tokenized.length);
    const docFreq = new Map(unique.map((t) => [t, tokenized.filter((d) => d.includes(t)).length]));
    return tokenized.map((doc) => {
        const freq = new Map<string, number>();
        for (const t of doc) freq.set(t, (freq.get(t) ?? 0) + 1);
        let score = 0;
        for (const t of unique) {
            const f = freq.get(t) ?? 0;
            if (!f) continue;
            const df = docFreq.get(t) ?? 0;
            const idf = Math.log(1 + (docs.length - df + 0.5) / (df + 0.5));
            score += (idf * f * 2.2) / (f + 1.2 * (0.25 + (0.75 * doc.length) / avgLength));
        }
        return score;
    });
}

/**
 * Context for a question that spans companies: at most `perExperience` excerpts from each write-up,
 * taken round-robin across companies in order of their best match, so the companies with the most
 * write-ups can't crowd out the rest. With one company it is just the ranked list, capped per
 * experience. `ranked` is best-first.
 */
export function spreadAcross<T>(
    ranked: T[],
    limit: number,
    keyOf: (item: T) => { company: string; experience: string },
    perExperience = 1
): T[] {
    const byCompany = new Map<string, T[]>();
    const taken = new Map<string, number>();
    for (const item of ranked) {
        const { company, experience } = keyOf(item);
        const count = taken.get(experience) ?? 0;
        if (count >= perExperience) continue;
        taken.set(experience, count + 1);
        byCompany.set(company, [...(byCompany.get(company) ?? []), item]);
    }
    const picked: T[] = [];
    for (let round = 0; picked.length < limit; round++) {
        const before = picked.length;
        for (const items of byCompany.values()) {
            if (round < items.length && picked.length < limit) picked.push(items[round]);
        }
        if (picked.length === before) break;
    }
    return picked;
}
