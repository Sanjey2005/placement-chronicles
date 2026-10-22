/**
 * Self-check for lib/session.ts. Run: node scripts/session.test.mjs
 *
 * Fails loudly if a forged, tampered, expired or unsigned cookie ever verifies.
 * (The previous cookie was the literal string "admin|<expiry>".)
 */
import assert from 'node:assert/strict';

process.env.SESSION_SECRET = 'test-secret-test-secret-test-secret-123456';
const { createSession, verifySession } = await import('../lib/session.ts');

// Round trip
const token = await createSession('user', '23PW01');
const s = await verifySession(token);
assert.equal(s?.role, 'user');
assert.equal(s?.sub, '23PW01');
assert.ok(s.exp > Date.now());
assert.equal((await verifySession(await createSession('admin', 'admin')))?.role, 'admin');

// The old plaintext scheme must never verify
assert.equal(await verifySession('admin|9999999999999'), null);
assert.equal(await verifySession('admin'), null);
assert.equal(await verifySession(''), null);
assert.equal(await verifySession(undefined), null);

// Tampered payload (user -> admin, signature kept) must fail
const [payload, sig] = token.split('.');
const forged = Buffer.from(
    Buffer.from(payload, 'base64url').toString().replace('user|', 'admin|')
).toString('base64url');
assert.equal(await verifySession(`${forged}.${sig}`), null);

// Tampered or missing signature must fail
assert.equal(await verifySession(`${payload}.${sig.slice(0, -2)}AA`), null);
assert.equal(await verifySession(`${payload}.`), null);
assert.equal(await verifySession(`.${sig}`), null);

// Expired must fail
assert.equal(await verifySession(await createSession('user', '23PW01', -1000)), null);

// Signed under a different secret must fail
process.env.SESSION_SECRET = 'another-secret-another-secret-another-secret';
assert.equal(await verifySession(token), null);

// Missing secret: verify -> null (fail closed), create -> throws
process.env.SESSION_SECRET = '';
assert.equal(await verifySession(token), null);
await assert.rejects(() => createSession('user', '23PW01'));

console.log('session.test.mjs: all assertions passed');
