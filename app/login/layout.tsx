import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Sign In | Placement Chronicles - PSG Tech Placement Experiences',
    description: 'Sign in to Placement Chronicles to explore real PSG Tech placement experiences, interview insights, and preparation tips. PSG College of Technology students use eCampus credentials.',
    keywords: ['PSG Tech login', 'PSG placement', 'Placement Chronicles', 'PSG Tech placement experiences'],
    // Don't let Google index the login page — it is a form, not content
    robots: {
        index: false,
        follow: false,
    },
    openGraph: {
        title: 'Sign In | Placement Chronicles - PSG Tech Placement',
        description: 'Access real PSG Tech placement and interview experiences. Sign in with eCampus credentials.',
        url: 'https://placement-chronicles.vercel.app/login',
    },
};

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
