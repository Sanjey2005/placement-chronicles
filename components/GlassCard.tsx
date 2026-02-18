import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface GlassCardProps {
    children: ReactNode;
    className?: string;
    hover?: boolean;
}

export default function GlassCard({ children, className, hover = false }: GlassCardProps) {
    return (
        <div
            className={cn(
                // Base Glass Effect
                'bg-black/40 backdrop-blur-xl',
                // Border
                'border border-white/10',
                // Shadow (Purple glow)
                'shadow-[0_0_50px_-12px_rgba(168,85,247,0.4)]',
                // Hover effects (if enabled)
                'transition-all duration-300',
                hover && 'hover:bg-black/50 hover:border-white/20 hover:shadow-[0_0_60px_-10px_rgba(168,85,247,0.5)]',
                className
            )}
        >
            {children}
        </div>
    );
}
