'use client';

import { ThemeProvider } from 'next-themes';
import { MotionConfig } from 'framer-motion';

/**
 * Client providers for the root layout, which must stay a server component
 * (it owns the metadata and JSON-LD).
 *
 * `reducedMotion="user"` covers every framer-motion animation in the app from
 * one place; CSS animations are handled by the media query in globals.css.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <MotionConfig reducedMotion="user">{children}</MotionConfig>
        </ThemeProvider>
    );
}
