'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from '@/components/Providers';

// Ported from Stotradhwani's PageViewTracker. The referrer + UTM of a page load
// belong to its first *recorded* view. Logged-out visitors land on /login, which
// isn't recorded, so the arrival is carried over to the first page after login.
let pendingArrival = true;

const HEARTBEAT_MS = 60_000;
const HEARTBEAT_MAX_AGE_MS = 3_600_000; // same cap as /api/pv, which ignores older heartbeats

/** Records signed-in students' page views at /api/pv and keeps them "live" while the tab is visible. */
export default function PageViewTracker() {
    const pathname = usePathname();
    const { isAuthenticated, isAdmin } = useSession();

    useEffect(() => {
        if (!isAuthenticated || isAdmin || pathname.startsWith('/admin')) return;

        const view: Record<string, unknown> = { path: pathname, w: window.screen.width };
        if (pendingArrival) {
            view.ref = document.referrer;
            view.q = window.location.search;
            pendingArrival = false;
        }

        let id: string | null = null;
        fetch('/api/pv', { method: 'POST', body: JSON.stringify(view), keepalive: true })
            .then((res) => (res.status === 200 ? res.json() : null))
            .then((data) => {
                id = typeof data?.id === 'string' ? data.id : null;
            })
            .catch(() => {});

        const started = Date.now();
        const ping = () => {
            // A tab left open for hours would otherwise cost a request a minute for nothing.
            if (Date.now() - started > HEARTBEAT_MAX_AGE_MS) {
                window.clearInterval(timer);
                return;
            }
            if (id) navigator.sendBeacon('/api/pv', JSON.stringify({ id }));
        };
        const timer = window.setInterval(() => {
            if (document.visibilityState === 'visible') ping();
        }, HEARTBEAT_MS);
        const onVisibility = () => {
            if (document.visibilityState === 'hidden') ping();
        };
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [pathname, isAuthenticated, isAdmin]);

    return null;
}
