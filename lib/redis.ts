import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';

if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
    console.warn(
        'Warning: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are not set. Rate limiting will be disabled.'
    );
}

// Initialize Redis client
export const redis = UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: UPSTASH_REDIS_REST_URL,
        token: UPSTASH_REDIS_REST_TOKEN,
    })
    : null;

// Create rate limiter: 5 requests per minute
export const chatRateLimiter = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '1 m'),
        analytics: true,
        prefix: '@upstash/ratelimit/chat',
    })
    : null;

export default redis;
