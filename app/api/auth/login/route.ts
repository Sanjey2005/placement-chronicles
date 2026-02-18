import { NextRequest, NextResponse } from 'next/server';

const ECAMPUS_LOGIN_URL = 'https://ecampus.psgtech.ac.in/studzone/Login/StudLogin';
const ECAMPUS_POST_URL = 'https://ecampus.psgtech.ac.in/studzone';

/**
 * Direct HTTP login to PSG eCampus Student Zone.
 * 
 * Flow:
 *  1. GET login page → extract __RequestVerificationToken + cookies
 *  2. POST credentials with the token
 *  3. Success = 302 redirect to /studzone/Home/Menu
 */
export async function POST(request: NextRequest) {
    try {
        const { rollno, password } = await request.json();

        if (!rollno || !password) {
            return NextResponse.json(
                { success: false, error: 'Roll number and password are required' },
                { status: 400 }
            );
        }

        // ── Admin Bypass: Hardcoded admin credentials ───────────────
        if (rollno === 'sanjey$12' && password === 'password') {
            return NextResponse.json({
                success: true,
                message: 'Admin login successful',
                role: 'ADMIN',
            });
        }

        // ── Step 1: GET the login page ──────────────────────────────
        const loginPageRes = await fetch(ECAMPUS_LOGIN_URL, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            redirect: 'follow',
            signal: AbortSignal.timeout(15000),
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

        // Collect cookies from the GET response
        const setCookieHeaders = loginPageRes.headers.getSetCookie?.() ?? [];
        const cookieString = setCookieHeaders
            .map((c: string) => c.split(';')[0])
            .join('; ');

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
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Referer': ECAMPUS_LOGIN_URL,
                'Origin': 'https://ecampus.psgtech.ac.in',
                'Cookie': cookieString,
            },
            body: formBody.toString(),
            redirect: 'manual',
            signal: AbortSignal.timeout(15000),
        });

        // ── Step 3: Detect success ──────────────────────────────────
        const status = loginRes.status;
        const location = loginRes.headers.get('location') || '';

        if (status === 302 && location.includes('/studzone/Home/Menu')) {
            return NextResponse.json({
                success: true,
                message: 'Login successful',
                role: 'USER',
            });
        }

        // If 200 — page re-rendered with a validation error
        if (status === 200) {
            const body = await loginRes.text();
            const errorMatch = body.match(/class="text-danger[^"]*"[^>]*>([^<]+)</i)
                || body.match(/class="validation-summary-errors"[^>]*>[\s\S]*?<li>([^<]+)</i);
            const errorMsg = errorMatch?.[1]?.trim() || 'Invalid roll number or password';
            return NextResponse.json({ success: false, error: errorMsg });
        }

        return NextResponse.json({
            success: false,
            error: 'Invalid roll number or password',
        });

    } catch (error: any) {
        if (error.name === 'TimeoutError' || error.name === 'AbortError') {
            return NextResponse.json(
                { success: false, error: 'eCampus server timed out — try again later' },
                { status: 504 }
            );
        }

        return NextResponse.json(
            { success: false, error: 'An unexpected error occurred during login' },
            { status: 500 }
        );
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
