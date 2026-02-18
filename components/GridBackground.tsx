'use client';

import { cn } from '@/lib/utils';

interface GridBackgroundProps {
    children: React.ReactNode;
    className?: string;
}

export default function GridBackground({ children, className }: GridBackgroundProps) {
    return (
        <div className={cn('relative w-full overflow-hidden bg-black', className)}>
            {/* Dot Grid Pattern */}
            <div
                className="absolute inset-0 opacity-20"
                style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.15) 1px, transparent 0)`,
                    backgroundSize: '50px 50px',
                }}
            />

            {/* Grid Lines */}
            <div
                className="absolute inset-0 opacity-10"
                style={{
                    backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
          `,
                    backgroundSize: '50px 50px',
                }}
            />

            {/* Radial Gradients for depth */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
            <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl" />

            {/* Beam effect lines */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-purple-500/50 to-transparent animate-beam-1" />
                <div className="absolute top-0 left-1/2 w-px h-full bg-gradient-to-b from-transparent via-blue-500/50 to-transparent animate-beam-2" />
                <div className="absolute top-0 left-3/4 w-px h-full bg-gradient-to-b from-transparent via-pink-500/50 to-transparent animate-beam-3" />
            </div>

            {/* Content */}
            <div className="relative z-10">{children}</div>
        </div>
    );
}
