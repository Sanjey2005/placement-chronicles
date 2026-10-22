import mongoose, { Schema, Model } from 'mongoose';

/**
 * One page opened by a signed-in student, recorded by /api/pv and summarised at
 * /admin/analytics. Privacy: no IP address, cookie or roll number is stored;
 * visitorId is a salted one-way hash that changes every day.
 */
export interface IPageView {
    createdAt: Date;
    lastSeenAt: Date; // bumped by the open tab's heartbeat
    visitorId: string;
    path: string; // pathname only, no query string
    source: string | null; // null = in-site navigation; 'Direct' | 'WhatsApp' | ... | hostname
    referrer: string | null; // external referrer host only
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    country: string | null; // ISO 3166-1 alpha-2 (Vercel geo headers)
    region: string | null;
    city: string | null;
    device: string | null; // Mobile | Tablet | Desktop (from screen width)
    browser: string | null;
    os: string | null;
}

// ponytail: MongoDB's own TTL monitor deletes views after 13 months (the 12-month
// range plus a month); shorten it if the free tier ever runs short of space.
const RETENTION_S = 60 * 60 * 24 * 395;

const nullable = { type: String, default: null };

const PageViewSchema = new Schema<IPageView>(
    {
        createdAt: { type: Date, default: Date.now, expires: RETENTION_S },
        lastSeenAt: { type: Date, default: Date.now, index: true },
        visitorId: { type: String, required: true, index: true },
        path: { type: String, required: true },
        source: nullable,
        referrer: nullable,
        utmSource: nullable,
        utmMedium: nullable,
        utmCampaign: nullable,
        country: nullable,
        region: nullable,
        city: nullable,
        device: nullable,
        browser: nullable,
        os: nullable,
    },
    { versionKey: false }
);

const PageView: Model<IPageView> = mongoose.models.PageView || mongoose.model<IPageView>('PageView', PageViewSchema);

export default PageView;
