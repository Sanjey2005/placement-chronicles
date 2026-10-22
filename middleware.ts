import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { globalApiRateLimit } from './lib/ratelimit';
import { verifySession, SESSION_COOKIE } from './lib/session';

// Public routes that don't require authentication (SEO: /about is crawlable)
const publicRoutes = ['/login', '/about', '/api/auth', '/api/feedback', '/robots.txt', '/sitemap.xml'];

// Admin-only routes
const adminRoutes = ['/admin'];
const adminApiRoutes = ['/api/admin'];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // --- GENERIC API RATE LIMITING (Upstash Redis) ---
    console.log('Middleware Path:', pathname, 'HasRateLimit:', !!globalApiRateLimit);
    if (pathname.startsWith('/api') && globalApiRateLimit) {
        const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1';
        try {
            const { success } = await globalApiRateLimit.limit(ip);
            if (!success) {
                return NextResponse.json(
                    { error: 'Too Many Requests: Rate limit exceeded. Please try again later.' },
                    { status: 429 }
                );
            }
        } catch (error) {
            // Fail open if Redis is unreachable
        }
    }
    // --- END RATE LIMITING ---

    // Check if the route is public
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

    // Check if it's an admin route
    const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
    const isAdminApiRoute = adminApiRoutes.some(route => pathname.startsWith(route));

    // Verified, signed session (null when missing, forged, malformed or expired)
    const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);

    // Admin route checks — must have a signed admin session
    if (isAdminRoute || isAdminApiRoute) {
        if (session?.role !== 'admin') {
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

    // If trying to access any non-public route without a valid session
    if (!isPublicRoute && !session) {
        // If it's an API route, return 401 instead of redirecting
        // to avoid 405 Method Not Allowed on POST/PATCH/DELETE requests
        if (pathname.startsWith('/api')) {
            return NextResponse.json(
                { success: false, error: 'Session expired or not authenticated' },
                { status: 401 }
            );
        }
        // Redirect to login for pages, dropping any stale or invalid cookie
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete(SESSION_COOKIE);
        return response;
    }

    // If already logged in and trying to access login page
    if (pathname === '/login' && session) {
        // Redirect to home (or admin if admin)
        const redirectUrl = session.role === 'admin' ? '/admin' : '/';
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

