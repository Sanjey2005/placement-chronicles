import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { loginIpRateLimit, loginRateLimit, retryAfterSeconds } from '@/lib/ratelimit';

const ECAMPUS_ORIGIN = 'https://ecampus.psgtech.ac.in';
const ECAMPUS_LOGIN_URL = `${ECAMPUS_ORIGIN}/studzone/Login/StudLogin`;
const ECAMPUS_POST_URL = `${ECAMPUS_ORIGIN}/studzone`;
const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

/** Constant-time string compare; a length mismatch is simply false. */
function safeEqual(a: string, b: string): boolean {
    const x = Buffer.from(a);
    const y = Buffer.from(b);
    return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Every credential failure (unknown roll number, wrong password, admin
 * mismatch, eCampus re-rendering its form with a validation message) returns
 * exactly this, so the endpoint cannot be used to tell outcomes apart.
 */
function invalidCredentials() {
    return NextResponse.json(
        { success: false, error: 'Invalid roll number or password' },
        { status: 401 }
    );
}

/**
 * Direct HTTP login to PSG eCampus Student Zone.
 *
 * Flow:
 *  0. Rate limit per roll number and per client IP (fails open without Redis)
 *  1. GET login page → extract __RequestVerificationToken + cookies
 *  2. POST credentials with the token
 *  3. 302 redirect into /studzone/Home or /studzone/Default means eCampus accepted them
 *  4. GET that target with the session cookies; only a 200 that doesn't bounce to the
 *     login form counts as a real student (the 302 alone was easy to mistake)
 *
 * Manual check: six rapid wrong-password POSTs to
 * http://localhost:3000/api/auth/login with the same rollno — the sixth is 429.
 */
export async function POST(request: NextRequest) {
    try {
        const { rollno: rawRollno, password } = await request.json();
        const rollno = typeof rawRollno === 'string' ? rawRollno.trim().toUpperCase() : '';

        if (!rollno || typeof password !== 'string' || !password) {
            return NextResponse.json(
                { success: false, error: 'Roll number and password are required' },
                { status: 400 }
            );
        }

        // ── Step 0: Brute-force guard, before the admin check or any eCampus call ──
        const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1';
        const wait = await retryAfterSeconds([loginRateLimit, rollno], [loginIpRateLimit, ip]);
        if (wait > 0) {
            return NextResponse.json(
                { success: false, error: 'Too many login attempts. Please try again later.' },
                { status: 429, headers: { 'Retry-After': String(wait) } }
            );
        }
        // A successful login clears both counters so a legitimate user's typos
        // (and the shared egress IP, see lib/ratelimit.ts) don't accumulate.
        const clearAttempts = () => Promise.all([
            loginRateLimit?.resetUsedTokens(rollno),
            loginIpRateLimit?.resetUsedTokens(ip),
        ]).catch(() => {});

        // ── Admin Bypass: Environment variables ───────────────
        const adminUser = process.env.ADMIN_USERNAME;
        const adminPass = process.env.ADMIN_PASSWORD;

        if (adminUser && adminPass && safeEqual(rollno, adminUser.toUpperCase()) && safeEqual(password, adminPass)) {
            await clearAttempts();
            return NextResponse.json({
                success: true,
                message: 'Admin login successful',
                role: 'ADMIN',
            });
        }

        const ROLL_REGEX = /^\d{2}(pw|pd|pc|pt)\d{2}$/i;
        if (!ROLL_REGEX.test(rollno)) {
            return invalidCredentials();
        }

        // ── Step 1: GET the login page ──────────────────────────────
        const loginPageRes = await fetch(ECAMPUS_LOGIN_URL, {
            method: 'GET',
            headers: BROWSER_HEADERS,
            cache: 'no-store',
            redirect: 'follow',
            signal: AbortSignal.timeout(20000), // Increased to 20s
        });

        if (!loginPageRes.ok) {
            return NextResponse.json(
                { success: false, error: 'Unable to reach eCampus login page' },
                { status: 502 }
            );
        }

        const html = await loginPageRes.text();

        // Extract __RequestVerificationToken from hidden input
        const tokenMatch = html.match(
            /name="__RequestVerificationToken"[^>]*value="([^"]+)"/
        ) || html.match(
            /value="([^"]+)"[^>]*name="__RequestVerificationToken"/
        );

        if (!tokenMatch) {
            return NextResponse.json(
                { success: false, error: 'Login page structure changed — token not found' },
                { status: 502 }
            );
        }

        const verificationToken = tokenMatch[1];

        // Cookie jar across the three eCampus requests; a later Set-Cookie wins by name.
        const cookieJar = new Map<string, string>();
        const storeCookies = (headers: Headers) => {
            for (const c of headers.getSetCookie?.() ?? []) {
                const pair = c.split(';')[0];
                const eq = pair.indexOf('=');
                cookieJar.set(eq === -1 ? pair : pair.slice(0, eq), pair);
            }
        };
        const cookieHeader = () => [...cookieJar.values()].join('; ');
        storeCookies(loginPageRes.headers);

        // ── Step 2: POST credentials ────────────────────────────────
        const formBody = new URLSearchParams({
            rollno,
            password,
            chkterms: 'on',
            __RequestVerificationToken: verificationToken,
        });

        const loginRes = await fetch(ECAMPUS_POST_URL, {
            method: 'POST',
            headers: {
                ...BROWSER_HEADERS,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Referer': ECAMPUS_LOGIN_URL,
                'Origin': ECAMPUS_ORIGIN,
                'Cookie': cookieHeader(),
            },
            body: formBody.toString(),
            redirect: 'manual',
            signal: AbortSignal.timeout(20000), // Increased to 20s
        });

        // ── Step 3: Did eCampus accept the credentials? ─────────────
        const status = loginRes.status;
        const location = loginRes.headers.get('location') || '';

        // Successful login usually redirects to /studzone/Home/Menu
        // But we allow anything starting with /studzone/ as a success if it's a 302
        if (status !== 302 || !(location.includes('/studzone/Home') || location.includes('/studzone/Default'))) {
            // Redirect back to the login form, a 200 re-render with eCampus's own
            // validation text, a forced password change — all reported identically.
            // Never echo eCampus's error text: it told callers whether the roll
            // number existed.
            return invalidCredentials();
        }

        // ── Step 4: Confirm the session actually opens the student zone ──
        storeCookies(loginRes.headers);
        const target = new URL(location, ECAMPUS_ORIGIN);
        if (target.origin !== ECAMPUS_ORIGIN) {
            return invalidCredentials(); // never send the session cookies elsewhere
        }

        const homeRes = await fetch(target, {
            method: 'GET',
            headers: { ...BROWSER_HEADERS, 'Cookie': cookieHeader() },
            cache: 'no-store',
            redirect: 'manual',
            signal: AbortSignal.timeout(20000),
        });
        const homeLocation = homeRes.headers.get('location') || '';

        if (homeRes.status !== 200 || homeLocation.includes('Login/StudLogin')) {
            return invalidCredentials();
        }

        await clearAttempts();
        return NextResponse.json({
            success: true,
            message: 'Login successful',
            role: 'USER',
        });

    } catch (error) {
        const name = error instanceof Error ? error.name : '';
        if (name === 'TimeoutError' || name === 'AbortError') {
            return NextResponse.json(
                { success: false, error: 'eCampus server timed out — try again later' },
                { status: 504 }
            );
        }

        return NextResponse.json(
            { success: false, error: 'An internal server error occurred during login' },
            { status: 500 }
        );
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
