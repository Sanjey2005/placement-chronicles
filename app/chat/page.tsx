import type { Viewport } from 'next';
import { getAllExperiences } from '@/actions/experience';
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

    return <Chat stats={stats} />;
}
