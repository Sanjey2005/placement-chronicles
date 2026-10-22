'use client';

import { useEffect, useState } from 'react';
import InfoTip from '@/components/admin/InfoTip';
import { BarList } from '@/components/admin/AnalyticsUI';
import { TRAFFIC_HELP, pageLabel, type Live } from '@/lib/traffic';

const POLL_MS = 15_000;

/** Students on the site right now + today's totals, polled while the tab is visible (Stotradhwani's useLive). */
export default function LiveVisitors() {
    const [live, setLive] = useState<Live | null>(null);

    useEffect(() => {
        let alive = true;
        let last = 0;
        const load = () => {
            // Some browsers fire visibilitychange in bursts; never ask more than every 5 s.
            if (document.visibilityState !== 'visible' || Date.now() - last < 5_000) return;
            last = Date.now();
            fetch('/api/admin/analytics/live', { cache: 'no-store' })
                .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
                .then((data: Live) => {
                    if (alive) setLive(data);
                })
                .catch(() => {});
        };

        load();
        const timer = window.setInterval(load, POLL_MS);
        document.addEventListener('visibilitychange', load);
        return () => {
            alive = false;
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', load);
        };
    }, []);

    return (
        <div className="space-y-5">
            <p className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="relative flex size-2.5 shrink-0" aria-hidden>
                    <span className="absolute inline-flex size-full rounded-full bg-success opacity-75 motion-safe:animate-ping" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-success" />
                </span>
                <span>
                    <span className="text-3xl font-bold text-foreground">{live ? live.live.toLocaleString('en-IN') : '–'}</span> on the site right now
                </span>
                <InfoTip label="On the site right now">{TRAFFIC_HELP.live}</InfoTip>
            </p>
            {live && (
                <>
                    <p className="text-sm text-muted-foreground">
                        Today: <span className="font-semibold text-foreground">{live.today_visitors.toLocaleString('en-IN')}</span> students,{' '}
                        <span className="font-semibold text-foreground">{live.today_pageviews.toLocaleString('en-IN')}</span> page views
                    </p>
                    <div>
                        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pages being viewed</h3>
                        <BarList
                            items={live.pages.map((row, i) => ({ key: `${row.name}-${i}`, label: pageLabel(row.name), value: row.visitors }))}
                            empty="Nobody's browsing right now."
                        />
                    </div>
                    {live.cities.length > 0 && (
                        <div>
                            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Where they are</h3>
                            <BarList items={live.cities.map((row, i) => ({ key: `${row.name}-${i}`, label: row.name ?? 'Unknown', value: row.visitors }))} />
                        </div>
                    )}
                </>
            )}
            <p className="text-[11px] text-muted-foreground">Updates every 15 seconds.</p>
        </div>
    );
}
