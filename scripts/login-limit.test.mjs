/**
 * Self-check for retryAfterSeconds in lib/ratelimit.ts. Run: node scripts/login-limit.test.mjs
 *
 * The login route trusts this helper to (a) consume one attempt from every
 * limiter, (b) report the longest wait when any of them blocks, and (c) fail
 * open when Redis is missing or down — a limiter outage must never lock
 * students out. Fake limiters stand in for Upstash so no Redis is needed.
 */
import assert from 'node:assert/strict';

// Redis.fromEnv() only warns without these, but keep the output clean.
process.env.UPSTASH_REDIS_REST_URL ??= 'https://example.invalid';
process.env.UPSTASH_REDIS_REST_TOKEN ??= 'test';

// Node 24 strips TS types natively, so lib/ratelimit.ts imports as-is.
const { retryAfterSeconds } = await import('../lib/ratelimit.ts');

const calls = [];
const fake = (success, resetInMs = 0) => ({
    limit: async (id) => {
        calls.push(id);
        return { success, reset: Date.now() + resetInMs };
    },
});
const throwing = { limit: async () => { throw new Error('redis down'); } };

// Everyone under budget → no wait.
assert.equal(await retryAfterSeconds([fake(true), 'roll'], [fake(true), 'ip']), 0);

// One limiter blocks → wait is its reset, rounded up to whole seconds.
const wait = await retryAfterSeconds([fake(false, 90_500), '22PW01'], [fake(true), '1.2.3.4']);
assert.ok(wait === 91 || wait === 92, `expected ~91s, got ${wait}`);

// Both block → the longer wait wins.
assert.ok((await retryAfterSeconds([fake(false, 10_000), 'a'], [fake(false, 600_000), 'b'])) >= 599);

// A reset already in the past still yields a usable Retry-After.
assert.equal(await retryAfterSeconds([fake(false, -5_000), 'stale']), 1);

// Every limiter is consumed even when the first one blocks.
calls.length = 0;
await retryAfterSeconds([fake(false, 1000), 'roll'], [fake(true), 'ip']);
assert.deepEqual(calls, ['roll', 'ip']);

// Fail open: no Redis configured, or Redis throwing.
assert.equal(await retryAfterSeconds([null, 'roll'], [null, 'ip']), 0);
assert.equal(await retryAfterSeconds([throwing, 'roll'], [fake(true), 'ip']), 0);

console.log('login-limit.test.mjs: all assertions passed');
