import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { isValidObjectId } from 'mongoose';
import dbConnect from '@/lib/db';
import { getSession } from '@/lib/auth-check';
import { classifySource, deviceFromWidth, isBot, istDateKey, parseUserAgent } from '@/lib/traffic';
import PageView from '@/models/PageView';

// Page-view beacon for PageViewTracker, modelled on Stotradhwani's /api/pv. The
// neutral name is deliberate: ad-block lists target paths like /track. Anything
// not recorded gets a 204, so analytics can never break the site.
//
// Only signed-in students are counted: middleware.ts already rejects requests
// without a session, which keeps anonymous scripts from filling the database.

const LIVE_HOST = 'placement-chronicles.vercel.app';
const HEARTBEAT_MAX_AGE_MS = 3_600_000; // an abandoned open tab stops counting as live after an hour
// ponytail: per-student ceiling on recorded views per day, so a scripted beacon can't fill the free tier.
const DAILY_CAP = 500;

const skip = () => new NextResponse(null, { status: 204 });
const text = (value: unknown, max: number) => (typeof value === 'string' && value ? value.slice(0, max) : null);

function decode(value: string | null): string | null {
    if (!value) return null;
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

export async function POST(req: NextRequest) {
    // Only the live site counts; set ANALYTICS_DEV=1 to record from localhost while testing.
    const host = req.nextUrl.hostname;
    if (host !== LIVE_HOST && process.env.ANALYTICS_DEV !== '1') return skip();

    const ua = req.headers.get('user-agent') ?? '';
    if (isBot(ua)) return skip();

    // Students only: the admin's own browsing isn't a visit.
    const session = await getSession(req);
    const secret = process.env.SESSION_SECRET;
    if (!session || session.role === 'admin' || !secret) return skip();

    const raw = await req.text();
    if (raw.length > 2000) return skip();
    let body: Record<string, unknown>;
    try {
        body = JSON.parse(raw);
    } catch {
        return skip();
    }
    if (!body || typeof body !== 'object') return skip();

    try {
        await dbConnect();

        // Heartbeat from an open tab: keeps the view live and measures visit length.
        if (typeof body.id === 'string') {
            if (!isValidObjectId(body.id)) return skip();
            await PageView.updateOne(
                { _id: body.id, createdAt: { $gt: new Date(Date.now() - HEARTBEAT_MAX_AGE_MS) } },
                { $set: { lastSeenAt: new Date() } }
            );
            return skip();
        }

        const path = text(body.path, 300);
        if (!path?.startsWith('/') || path.startsWith('/admin')) return skip();

        // Daily-rotating, salted, one-way: counts each student once a day across
        // devices (campus Wi-Fi puts many students behind one IP) without storing
        // the roll number, and a student can't be followed from one day to the next.
        const visitorId = createHash('sha256')
            .update(`${secret}|${istDateKey(new Date())}|${session.sub}`)
            .digest('hex')
            .slice(0, 16);
        if ((await PageView.countDocuments({ visitorId })) >= DAILY_CAP) return skip();

        const utm = new URLSearchParams(text(body.q, 500) ?? '');
        const ref = typeof body.ref === 'string' ? body.ref.slice(0, 500) : undefined;
        const { source, referrer } = classifySource(ref, utm.get('utm_source'), host);
        const { browser, os } = parseUserAgent(ua);

        const view = await PageView.create({
            visitorId,
            path,
            source,
            referrer,
            utmSource: text(utm.get('utm_source'), 100),
            utmMedium: text(utm.get('utm_medium'), 100),
            utmCampaign: text(utm.get('utm_campaign'), 100),
            country: text(req.headers.get('x-vercel-ip-country'), 2),
            region: text(req.headers.get('x-vercel-ip-country-region'), 10),
            city: text(decode(req.headers.get('x-vercel-ip-city')), 100),
            device: deviceFromWidth(body.w),
            browser,
            os,
        });
        return NextResponse.json({ id: String(view._id) });
    } catch (error) {
        console.error('[pv] failed:', error instanceof Error ? error.message : String(error));
        return skip();
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
