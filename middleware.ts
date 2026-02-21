import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { get } from '@vercel/edge-config';

// Public routes that don't require authentication
const publicRoutes = ['/login', '/api/auth'];

// Protected routes that explicitly require authentication
const protectedRoutes = ['/share-experience', '/chat'];

// Protected API routes
const protectedApiRoutes = ['/api/chat', '/api/ingest', '/api/experiences'];

// Admin-only routes
const adminRoutes = ['/admin'];
const adminApiRoutes = ['/api/admin'];

export async function middleware(request: NextRequest) {
    // --- EDGE CONFIG PROTECTION (placement-chronicles-store) ---
    try {
        // 1. Maintenance Mode Switch: Kills the site if under massive attack
        const maintenanceMode = await get('maintenance_mode');
        if (maintenanceMode) {
            return NextResponse.json(
                { error: 'Site is temporarily down for maintenance. Please try again later.' },
                { status: 503 }
            );
        }

        // 2. IP Blocking: Denies access to specific malicious IPs
        const blockedIps = await get('blocked_ips') as string[] | undefined;
        if (blockedIps && Array.isArray(blockedIps)) {
            const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for') || 'Unknown IP';

            if (blockedIps.includes(ip)) {
                return NextResponse.json(
                    { error: 'Access Denied: Your IP has been blocked due to suspicious activity.' },
                    { status: 403 }
                );
            }
        }
    } catch (error) {
        // Fallback: If edge config isn't hooked up yet, log and bypass so normal traffic continues
        console.warn('Vercel Edge Config not configured or failed to fetch. Ensure EDGE_CONFIG is set.', error);
    }
    // --- END EDGE CONFIG PROTECTION ---

    const { pathname } = request.nextUrl;

    // Check if the route is public
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

    // Check if the route is explicitly protected
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

    // Check if it's a protected API route
    const isProtectedApiRoute = protectedApiRoutes.some(route => pathname.startsWith(route));

    // Check if it's an admin route
    const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
    const isAdminApiRoute = adminApiRoutes.some(route => pathname.startsWith(route));

    // Get the auth token from cookies
    const rawToken = request.cookies.get('auth-token')?.value;
    let authToken: string | undefined;
    let tokenExpiry: number | undefined;

    if (rawToken) {
        const parts = rawToken.split('|');
        authToken = parts[0];
        if (parts.length > 1) {
            tokenExpiry = parseInt(parts[1], 10);
        }
    }

    // Check if token is expired
    if (tokenExpiry && Date.now() > tokenExpiry) {
        // Token expired
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('auth-token');
        response.cookies.delete('user-id');
        return response;
    }

    // Admin route checks — must have admin cookie value
    if (isAdminRoute || isAdminApiRoute) {
        if (authToken !== 'admin') {
            if (isAdminApiRoute) {
                return NextResponse.json(
                    { success: false, error: 'Admin access required' },
                    { status: 403 }
                );
            }
            // Redirect non-admin to home page
            const homeUrl = new URL('/', request.url);
            return NextResponse.redirect(homeUrl);
        }
        return NextResponse.next();
    }

    // If trying to access a protected route without auth token
    if ((isProtectedRoute || isProtectedApiRoute || !isPublicRoute) && !authToken) {
        // Redirect to login
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    // If already logged in and trying to access login page
    if (pathname === '/login' && authToken) {
        // Redirect to home (or admin if admin)
        const redirectUrl = authToken === 'admin' ? '/admin' : '/';
        const targetUrl = new URL(redirectUrl, request.url);
        return NextResponse.redirect(targetUrl);
    }

    return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (public folder)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};

