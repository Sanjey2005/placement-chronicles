'use client';

import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Company favicon with a fallback.
 *
 * Both call sites previously duplicated an onError handler that wrote raw SVG
 * into parent.innerHTML — that destroys React's child, so the node never
 * reconciles again. State-driven fallback instead, and the chip is tokenised
 * (it was hardcoded bg-white, which stayed white in dark mode).
 */
export default function CompanyLogo({
    logoUrl,
    size = 'sm',
    className,
}: {
    logoUrl?: string;
    size?: 'sm' | 'lg';
    className?: string;
}) {
    const [failed, setFailed] = useState(false);
    const box = size === 'lg' ? 'w-14 h-14 rounded-2xl' : 'w-11 h-11 rounded-2xl';
    const glyph = size === 'lg' ? 'h-7 w-7' : 'h-5 w-5';
    const img = size === 'lg' ? 'w-9 h-9' : 'w-7 h-7';

    if (!logoUrl || failed) {
        return (
            <div className={cn(box, 'shrink-0 bg-primary-fixed flex items-center justify-center', className)}>
                <Building2 className={cn(glyph, 'text-primary')} />
            </div>
        );
    }

    return (
        <div
            className={cn(
                box,
                'shrink-0 bg-surface-container-lowest border border-outline-variant flex items-center justify-center overflow-hidden',
                className
            )}
        >
            <img
                src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(logoUrl)}&sz=128`}
                alt=""
                aria-hidden="true"
                className={cn(img, 'object-contain')}
                onError={() => setFailed(true)}
            />
        </div>
    );
}
