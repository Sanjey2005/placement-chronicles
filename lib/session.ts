/**
 * Signed session cookie.
 *
 * token = base64url("role|sub|exp") + "." + base64url(HMAC-SHA256(payload))
 *
 * WebCrypto only, so the same code verifies in the Edge middleware and in Node
 * route handlers / server actions. Anything that fails to verify, is malformed,
 * or is past `exp` is treated as "not logged in" (fail closed).
 */

export const SESSION_COOKIE = 'auth-token';
export const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour, same as before

export type SessionRole = 'admin' | 'user';
export interface Session {
    role: SessionRole;
    sub: string; // roll number for students, 'admin' for the admin
    exp: number; // unix ms
}

const enc = new TextEncoder();
const dec = new TextDecoder();

function toB64url(bytes: Uint8Array): string {
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s: string): Uint8Array<ArrayBuffer> {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
}

async function hmacKey(): Promise<CryptoKey> {
    const secret = process.env.SESSION_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error('SESSION_SECRET must be set to a random string of at least 32 characters');
    }
    return crypto.subtle.importKey(
        'raw',
        enc.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
    );
}

export async function createSession(role: SessionRole, sub: string, ttlMs = SESSION_TTL_MS): Promise<string> {
    if (sub.includes('|')) throw new Error('session subject cannot contain "|"');
    const payload = enc.encode(`${role}|${sub}|${Date.now() + ttlMs}`);
    const sig = await crypto.subtle.sign('HMAC', await hmacKey(), payload);
    return `${toB64url(payload)}.${toB64url(new Uint8Array(sig))}`;
}

export async function verifySession(token: string | undefined | null): Promise<Session | null> {
    if (!token) return null;
    const dot = token.indexOf('.');
    if (dot <= 0) return null;
    try {
        const payload = fromB64url(token.slice(0, dot));
        const sig = fromB64url(token.slice(dot + 1));
        const ok = await crypto.subtle.verify('HMAC', await hmacKey(), sig, payload);
        if (!ok) return null;

        const parts = dec.decode(payload).split('|');
        if (parts.length !== 3) return null;
        const [role, sub, expStr] = parts;
        const exp = Number(expStr);
        if ((role !== 'admin' && role !== 'user') || !sub || !Number.isFinite(exp) || Date.now() > exp) {
            return null;
        }
        return { role, sub, exp };
    } catch {
        return null; // bad base64, missing secret, etc. all mean "not logged in"
    }
}
