'use server';

import { cookies } from 'next/headers';
import { createSession, SESSION_COOKIE, SESSION_TTL_MS } from '@/lib/session';

interface LoginResponse {
    success: boolean;
    cookies?: string[];
    dashboardUrl?: string;
    message?: string;
    error?: string;
    role?: 'ADMIN' | 'USER';
}

/**
 * Server action to authenticate user via direct HTTP login to PSG eCampus.
 * Calls the internal /api/auth/login route which performs HTTP-level auth
 * (no Selenium, no external scraper).
 */
export async function login(formData: FormData): Promise<LoginResponse> {
    try {
        const rawUsername = formData.get('username') as string;
        const password = formData.get('password') as string;
        const username = rawUsername?.trim().toUpperCase();

        if (!username || !password) {
            return {
                success: false,
                error: 'Username and password are required',
            };
        }

        let baseUrl = 'http://localhost:3000';
        if (process.env.NEXT_PUBLIC_BASE_URL) {
            baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
        } else if (process.env.VERCEL_URL) {
            baseUrl = `https://${process.env.VERCEL_URL}`;
        }

        const response = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rollno: username, password }),
        });

        const data = await response.json();

        if (data.success) {
            // Signed, httpOnly session set server-side. The UI gets its auth
            // state from the root layout (see Providers), not from this cookie.
            const cookieStore = await cookies();
            const isAdmin = data.role === 'ADMIN';
            const token = await createSession(isAdmin ? 'admin' : 'user', isAdmin ? 'admin' : username);

            cookieStore.set(SESSION_COOKIE, token, {
                maxAge: SESSION_TTL_MS / 1000,
                path: '/',
                sameSite: 'lax',
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
            });
            // Legacy plaintext cookie from the old scheme; identity now lives in the session
            cookieStore.delete('user-id');

            return {
                success: true,
                message: 'Login successful',
                role: data.role || 'USER',
            };
        } else {
            return {
                success: false,
                error: data.error || 'Login failed',
            };
        }
    } catch (error) {
        return { success: false, error: 'An internal server error occurred during login' };
    }
}

/**
 * Alternative login function that accepts credentials directly
 */
export async function loginWithCredentials(
    username: string,
    password: string
): Promise<LoginResponse> {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    return login(formData);
}

/**
 * Clears the session. A server action because the cookie is httpOnly and
 * cannot be cleared from the browser.
 */
export async function logout(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);
    cookieStore.delete('user-id');
}
