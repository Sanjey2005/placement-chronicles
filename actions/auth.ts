'use server';

import { cookies } from 'next/headers';

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
        const username = formData.get('username') as string;
        const password = formData.get('password') as string;

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
            // Set cookies strictly on the server side to survive mobile navigation
            const cookieStore = await cookies();
            const isAdmin = data.role === 'ADMIN';
            const roleValue = isAdmin ? 'admin' : 'authenticated';
            const expiryTime = Date.now() + 60 * 60 * 1000;
            const cookieValue = `${roleValue}|${expiryTime}`;

            // Set the primary auth token (30 min expiry)
            cookieStore.set('auth-token', cookieValue, {
                maxAge: 60 * 60,
                path: '/',
                sameSite: 'lax',
                httpOnly: false, // Required false so Navbar.tsx can read it
                secure: process.env.NODE_ENV === 'production',
            });

            // Set the user ID cookie for feedback if not admin
            if (!isAdmin && username) {
                cookieStore.set('user-id', username, {
                    maxAge: 60 * 60,
                    path: '/',
                    sameSite: 'lax',
                    httpOnly: false,
                    secure: process.env.NODE_ENV === 'production',
                });
            }

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
