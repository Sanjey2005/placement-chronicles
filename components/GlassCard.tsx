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
                'bg-card border border-outline-variant rounded-3xl shadow-m3',
                'transition-all duration-300',
                hover && 'hover:shadow-lg hover:border-primary/40',
                className
            )}
        >
            {children}
        </div>
    );
}
