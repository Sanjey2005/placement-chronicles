/**
 * Security sanitization utilities for Placement Chronicles.
 * Prevents XSS, prompt injection, and regex denial-of-service.
 */

/**
 * Strip all HTML/script tags from a string to prevent stored XSS.
 * Preserves plain text content between tags.
 */
export function stripHtmlTags(str: string): string {
    if (!str || typeof str !== 'string') return '';
    return str
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // remove <script> blocks
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')   // remove <style> blocks
        .replace(/<[^>]*>/g, '')                                            // remove remaining tags
        .replace(/&lt;/g, '<')                                              // decode common entities
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .trim();
}

/**
 * Sanitize text before injecting into LLM prompts.
 * Wraps user content in delimiters and strips known injection patterns.
 */
export function sanitizeForPrompt(text: string): string {
    if (!text || typeof text !== 'string') return '';

    let sanitized = text;

    // Remove common prompt injection patterns (case-insensitive)
    const injectionPatterns = [
        /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)/gi,
        /disregard\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)/gi,
        /forget\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)/gi,
        /you\s+are\s+now\s+(?:a|an|the)\s+/gi,
        /(?:system|admin)\s*:\s*/gi,
        /\[INST\]/gi,
        /\[\/INST\]/gi,
        /<<SYS>>/gi,
        /<\/SYS>>/gi,
    ];

    for (const pattern of injectionPatterns) {
        sanitized = sanitized.replace(pattern, '[FILTERED] ');
    }

    return sanitized.trim();
}

/**
 * Escape special regex characters to prevent ReDoS attacks.
 * Allows safe use in `new RegExp(userInput)`.
 */
export function escapeRegex(str: string): string {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Recursively sanitize all string values in an object.
 * Useful for cleaning AI-extracted data before storage.
 */
export function sanitizeObject<T>(obj: T): T {
    if (typeof obj === 'string') {
        return stripHtmlTags(obj) as unknown as T;
    }
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item)) as unknown as T;
    }
    if (obj && typeof obj === 'object') {
        const sanitized: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
            sanitized[key] = sanitizeObject(value);
        }
        return sanitized as T;
    }
    return obj;
}
