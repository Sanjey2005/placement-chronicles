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
                'bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-xl',
                'transition-all duration-300',
                hover && 'hover:bg-white/15 hover:border-white/30 hover:shadow-2xl',
                className
            )}
        >
            {children}
        </div>
    );
}
