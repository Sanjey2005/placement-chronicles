'use client';

import { cn } from '@/lib/utils';

interface GridBackgroundProps {
    children: React.ReactNode;
    className?: string;
}

export default function GridBackground({ children, className }: GridBackgroundProps) {
    return (
        <div className={cn('relative w-full overflow-hidden bg-background', className)}>
            {/* Subtle dot pattern. Colour and opacity are tokens so the dots
                dim in dark mode instead of glowing against the near-black bg. */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage:
                        'radial-gradient(circle at 1px 1px, var(--dot-color) 1px, transparent 0)',
                    backgroundSize: '32px 32px',
                    opacity: 'var(--dot-opacity)',
                }}
            />

            {/* Content */}
            <div className="relative z-10">{children}</div>
        </div>
    );
}
