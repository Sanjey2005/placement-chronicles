import { NextRequest } from 'next/server';

/**
 * Checks if the current request possesses a valid Admin authentication cookie.
 * @returns true if the user is an admin, false otherwise.
 */
export function requireAdmin(request: NextRequest): boolean {
    const rawToken = request.cookies.get('auth-token')?.value;

    if (!rawToken) {
        return false;
    }

    // Token format is 'role|expiryStamp'
    const parts = rawToken.split('|');
    const role = parts[0];

    return role === 'admin';
}
