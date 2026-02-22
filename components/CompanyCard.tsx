'use client';

import { motion } from 'framer-motion';
import { Building2, Users, TrendingUp, Briefcase } from 'lucide-react';
import { formatCompensation } from '@/lib/utils';

interface CompanyCardProps {
    companyName: string;
    experiences: any[];
    logoUrl?: string;
    onClick: () => void;
    index: number;
}

export default function CompanyCard({ companyName, experiences, logoUrl, onClick, index }: CompanyCardProps) {
    // Compute stats
    const count = experiences.length;

    // Average CTC in LPA
    let totalLPA = 0;
    let validCount = 0;
    for (const exp of experiences) {
        if (exp.ctc > 0) {
            if (exp.roleType === 'INTERNSHIP' || exp.roleType === 'SUMMER_INTERNSHIP') {
                totalLPA += (exp.ctc * 12) / 100000;
            } else {
                totalLPA += exp.ctc;
            }
            validCount++;
        }
    }
    const avgCTC = validCount > 0 ? (totalLPA / validCount).toFixed(1) : '—';

    // Role types present
    const roleTypes = Array.from(new Set(experiences.map(e => e.roleType).filter(Boolean)));
    const roleTypeLabels: Record<string, { label: string; cls: string }> = {
        FULL_TIME: { label: 'Full Time', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
        INTERNSHIP: { label: 'Intern', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
        SUMMER_INTERNSHIP: { label: 'Summer', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
    };

    // Most recent batch
    const batches = experiences.map(e => e.batch).filter(Boolean).sort().reverse();
    const latestBatch = batches[0] || null;

    // Selection rate
    const selected = experiences.filter(e => e.finalVerdict === 'selected').length;
    const selectionRate = count > 0 ? Math.round((selected / count) * 100) : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.3 }}
            onClick={onClick}
            className="cursor-pointer group"
        >
            <article className="relative rounded-xl bg-slate-950/60 backdrop-blur-xl border border-white/[0.08] p-5 transition-all duration-300 hover:border-violet-500/30 hover:bg-slate-900/60 hover:shadow-[0_0_40px_-10px_rgba(139,92,246,0.15)] h-full">
                {/* Top accent */}
                <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-violet-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Header: Logo + Name */}
                <div className="flex items-center gap-3 mb-4">
                    {logoUrl ? (
                        <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-white flex items-center justify-center overflow-hidden border border-white/10 shadow-sm">
                            <img
                                src={`https://www.google.com/s2/favicons?domain=${logoUrl}&sz=128`}
                                alt={`${companyName} logo`}
                                className="w-full h-full object-contain p-0.5"
                                onError={(e) => {
                                    const target = e.currentTarget;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                        parent.classList.remove('bg-white');
                                        parent.classList.add('bg-blue-500/10');
                                        parent.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-400"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>';
                                    }
                                }}
                            />
                        </div>
                    ) : (
                        <div className="w-10 h-10 flex-shrink-0 p-2 bg-blue-500/10 rounded-lg flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-blue-400" />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-white truncate group-hover:text-violet-300 transition-colors">
                            {companyName}
                        </h3>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-white/[0.04] rounded-lg px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1 text-blue-400 mb-0.5">
                            <Users className="h-3 w-3" />
                        </div>
                        <p className="text-lg font-bold text-white">{count}</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">Experiences</p>
                    </div>
                    <div className="bg-white/[0.04] rounded-lg px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1 text-emerald-400 mb-0.5">
                            <TrendingUp className="h-3 w-3" />
                        </div>
                        <p className="text-lg font-bold text-white">{avgCTC}</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">Avg LPA</p>
                    </div>
                    <div className="bg-white/[0.04] rounded-lg px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1 text-purple-400 mb-0.5">
                            <Briefcase className="h-3 w-3" />
                        </div>
                        <p className="text-lg font-bold text-white">{selectionRate}%</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">Selected</p>
                    </div>
                </div>

                {/* Role Types + Batch */}
                <div className="flex flex-wrap items-center gap-1.5">
                    {roleTypes.map(rt => {
                        const config = roleTypeLabels[rt] || { label: rt, cls: 'bg-white/5 text-white/50 border-white/10' };
                        return (
                            <span key={rt} className={`px-2 py-0.5 text-[10px] font-medium rounded border ${config.cls}`}>
                                {config.label}
                            </span>
                        );
                    })}
                    {latestBatch && (
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-white/5 text-white/40 border border-white/10 ml-auto">
                            {latestBatch}
                        </span>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end pt-3 mt-3 border-t border-white/[0.06]">
                    <span className="text-xs text-violet-400/80 group-hover:text-violet-400 transition-colors">
                        View Experiences →
                    </span>
                </div>
            </article>
        </motion.div>
    );
}
