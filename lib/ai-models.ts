/**
 * Centralized Groq Model Configuration
 *
 * FAST: Used for low-latency tasks such as text extraction, query intent classification,
 *       content moderation, normalization, and fuzzy deduplication.
 * VERSATILE: Used for high-reasoning tasks such as RAG chat answer generation and
 *            company metadata backfilling.
 */
export const GROQ_MODELS = {
    FAST: 'openai/gpt-oss-20b',
    VERSATILE: 'openai/gpt-oss-120b',
} as const;

export type GroqModelType = (typeof GROQ_MODELS)[keyof typeof GROQ_MODELS];
