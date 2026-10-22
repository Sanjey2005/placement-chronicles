import type { Viewport } from 'next';
import { cookies } from 'next/headers';
import { getAllExperiences } from '@/actions/experience';
import { verifySession, SESSION_COOKIE } from '@/lib/session';
import Chat from './Chat';

// cover: the composer pads itself above the home indicator with env(safe-area-inset-bottom).
// resizes-content: Android shrinks the page for the keyboard, so the composer stays in view.
export const viewport: Viewport = { viewportFit: 'cover', interactiveWidget: 'resizes-content' };

export default async function ChatPage() {
    // ponytail: two counts off the feed's own query, which already drops hidden companies;
    // a countDocuments + distinct pair would be cheaper if the corpus grows large.
    const result = await getAllExperiences();
    const experiences = result.success ? result.data ?? [] : [];
    const stats = experiences.length
        ? { experiences: experiences.length, companies: new Set(experiences.map((e) => e.company)).size }
        : null;

    // Tags the chat saved in this browser, so a shared lab computer never restores one
    // student's chat for another. Keyed with the session secret, so the roll number can't be
    // brute-forced back out of browser storage (roll numbers are easy to enumerate).
    const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(process.env.SESSION_SECRET ?? ''), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`chat:${session?.role}:${session?.sub}`));
    const owner = Buffer.from(mac).toString('hex').slice(0, 32);

    return <Chat stats={stats} owner={owner} />;
}
