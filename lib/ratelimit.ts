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

// 3. Login brute force: 5 attempts per roll number per 15 minutes.
//    Stops online guessing of one account's eCampus (or admin) password.
export const loginRateLimit = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '15 m'),
        analytics: true,
        prefix: '@upstash/ratelimit/login_roll',
    })
    : null;

// 4. Login spraying: 100 attempts per client IP per 15 minutes.
//    Stops one caller walking many roll numbers with one password. Much
//    looser than the per-roll budget because actions/auth.ts reaches this
//    route via a server-side fetch, so on Vercel every legitimate login
//    shares the function's egress IP: this counter is effectively campus-wide,
//    and failed attempts (including eCampus outages) would otherwise lock
//    everyone out. The route clears both counters on success.
export const loginIpRateLimit = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, '15 m'),
        analytics: true,
        prefix: '@upstash/ratelimit/login_ip',
    })
    : null;

// 5. Submissions: 5 per student per hour. Each one is stored and spends the shared Groq
//    budget above, so one account can't fill the database or starve everyone else's posts.
export const submitRateLimit = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '1 h'),
        analytics: true,
        prefix: '@upstash/ratelimit/submit',
    })
    : null;

type Limiter = Pick<Ratelimit, 'limit'> | null;

/**
 * Consume one attempt from every limiter and return the seconds the caller
 * must wait, or 0 if all are still under budget. A null limiter (no Redis
 * configured) or a Redis error fails open, matching middleware.ts.
 */
export async function retryAfterSeconds(...checks: Array<[Limiter, string]>): Promise<number> {
    try {
        const results = await Promise.all(
            checks.map(([limiter, id]) => limiter?.limit(id) ?? { success: true, reset: 0 })
        );
        const blocked = results.filter((r) => !r.success);
        if (blocked.length === 0) return 0;
        const reset = Math.max(...blocked.map((r) => r.reset));
        return Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    } catch {
        return 0; // fail open if Redis is unreachable
    }
}
