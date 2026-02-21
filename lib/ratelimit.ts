import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Use Upstash's native environment loader which works flawlessly in Vercel Edge
const redis = Redis.fromEnv();

// 1. Edge API Limiter: 60 requests per 1 minute (Per IP)
export const globalApiRateLimit = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(60, '1 m'),
        analytics: true,
        prefix: '@upstash/ratelimit/global_api',
    })
    : null;

// 2. Groq Model Throttling: 45 requests per 1 minute (Global)
export const groqApiRateLimit = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(45, '1 m'),
        analytics: true,
        prefix: '@upstash/ratelimit/groq_api',
    })
    : null;
