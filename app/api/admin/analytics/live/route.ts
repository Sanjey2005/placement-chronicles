import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-check';
import { trafficLive } from '@/lib/traffic-queries';

// GET: who's on the site now + today's totals, polled by LiveVisitors every 15 s.
export async function GET(request: NextRequest) {
    if (!(await requireAdmin(request))) {
        return NextResponse.json({ success: false, error: 'Forbidden: Admin access only' }, { status: 403 });
    }

    try {
        return NextResponse.json(await trafficLive(), { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        console.error('[analytics] live failed:', error instanceof Error ? error.message : String(error));
        return NextResponse.json({ success: false, error: 'Could not load live visitors' }, { status: 500 });
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
