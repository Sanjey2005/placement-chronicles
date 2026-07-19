'use client';

import { motion } from 'framer-motion';
import { Users, TrendingUp, Layers, ArrowUpRight, type LucideIcon } from 'lucide-react';
import { averageCTC, averageRounds } from '@/lib/utils';
import CompanyLogo from './CompanyLogo';

interface CompanyCardProps {
    companyName: string;
    experiences: Array<{ ctc?: number; roleType?: string; rounds?: unknown[] }>;
    logoUrl?: string;
    onClick: () => void;
    index: number;
}

function Stat({
    icon: Icon,
    value,
    label,
    tone,
}: {
    icon: LucideIcon;
    value: string;
    label: string;
    tone: string;
}) {
    return (
        <div className="bg-surface-container rounded-2xl px-2 py-2.5 text-center">
            <div className={`flex items-center justify-center gap-1 mb-0.5 ${tone}`}>
                <Icon className="h-3 w-3 shrink-0" />
                <span className="text-base font-bold text-foreground tabular-nums">{value}</span>
            </div>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                {label}
            </span>
        </div>
    );
}

export default function CompanyCard({
    companyName,
    experiences,
    logoUrl,
    onClick,
    index,
}: CompanyCardProps) {
    const avg = averageCTC(experiences);
    // Not selection rate: every experience in the data is 'selected' (people who
    // don't get an offer rarely share), so it read 100% on every card. Avg rounds
    // actually varies (1.0-4.5) and tells you how long the process runs.
    const rounds = averageRounds(experiences);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.3 }}
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            role="button"
            tabIndex={0}
            aria-label={`${companyName}, ${experiences.length} experience${experiences.length === 1 ? '' : 's'}`}
            onClick={onClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
            className="cursor-pointer group h-full rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
            <article className="relative h-full flex flex-col rounded-3xl bg-card border border-outline-variant p-5 shadow-m3 transition-[box-shadow,border-color] duration-300 group-hover:border-primary/40 group-hover:shadow-xl">
                <ArrowUpRight className="absolute top-5 right-5 h-4 w-4 text-primary opacity-0 -translate-y-1 translate-x-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0" />

                <div className="flex items-center gap-3 mb-4 pr-6">
                    <CompanyLogo logoUrl={logoUrl} />
                    <h3 className="text-lg font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {companyName}
                    </h3>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-auto">
                    <Stat icon={Users} value={String(experiences.length)} label="Shared" tone="text-primary" />
                    <Stat
                        icon={TrendingUp}
                        value={avg === null ? '—' : avg.toFixed(1)}
                        label="Avg LPA"
                        tone="text-on-secondary-container"
                    />
                    <Stat
                        icon={Layers}
                        value={rounds === null ? '—' : rounds.toFixed(1)}
                        label="Rounds"
                        tone="text-success"
                    />
                </div>
            </article>
        </motion.div>
    );
}
