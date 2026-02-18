import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that don't require authentication
const publicRoutes = ['/login', '/api/auth'];

// Protected routes that explicitly require authentication
const protectedRoutes = ['/share-experience', '/chat'];

// Protected API routes
const protectedApiRoutes = ['/api/chat'];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Check if the route is public
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

    // Check if the route is explicitly protected
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

    // Check if it's a protected API route
    const isProtectedApiRoute = protectedApiRoutes.some(route => pathname.startsWith(route));

    // Get the auth token from cookies
    const authToken = request.cookies.get('auth-token')?.value;

    // If trying to access a protected route without auth token
    if ((isProtectedRoute || isProtectedApiRoute || !isPublicRoute) && !authToken) {
        // Redirect to login
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    // If already logged in and trying to access login page
    if (pathname === '/login' && authToken) {
        // Redirect to home
        const homeUrl = new URL('/', request.url);
        return NextResponse.redirect(homeUrl);
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
