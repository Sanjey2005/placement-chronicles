'use client';

import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { Popover } from 'radix-ui';

/** A small ⓘ that opens a plain-English explanation on click or tap (works on phones, unlike hover tooltips). */
export default function InfoTip({ label, children }: { label: string; children: ReactNode }) {
    return (
        <Popover.Root>
            <Popover.Trigger
                aria-label={`What is ${label}?`}
                className="inline-flex shrink-0 cursor-pointer items-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
                <Info className="h-3.5 w-3.5" aria-hidden />
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content
                    side="top"
                    sideOffset={6}
                    collisionPadding={12}
                    className="z-50 w-72 rounded-xl border border-outline-variant bg-popover p-3 text-xs font-normal normal-case leading-relaxed tracking-normal text-popover-foreground shadow-m3"
                >
                    <p className="mb-1 text-sm font-semibold">{label}</p>
                    {children}
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}
