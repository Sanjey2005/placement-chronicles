import { NextRequest } from 'next/server';
import { verifySession, SESSION_COOKIE, type Session } from './session';

/** Verified session for a route-handler / middleware request, or null. */
export function getSession(request: NextRequest): Promise<Session | null> {
    return verifySession(request.cookies.get(SESSION_COOKIE)?.value);
}

/** True only for a validly signed, unexpired admin session. */
export async function requireAdmin(request: NextRequest): Promise<boolean> {
    return (await getSession(request))?.role === 'admin';
}
