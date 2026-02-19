'use client';

import { useState } from 'react';
import { Building2, Briefcase, IndianRupee, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import ExperienceModal from './ExperienceModal';

interface ExperienceCardProps {
    company: string;
    role: string;
    ctc: number;
    rounds?: any[];
    tags?: string[];
    year?: number;
    batch?: string;
    finalVerdict?: 'selected' | 'rejected' | 'waitlisted' | 'ongoing';
    studentName?: string;
    minCGPA?: number;
    tipsForJuniors?: string;
    overallExperience?: string;
    placementType?: string;
    roleType?: string;
    historyOfBacklogs?: string;
    standingBacklogs?: string;
}

export default function ExperienceCard({
    company,
    role,
    ctc,
    rounds = [],
    tags = [],
    year,
    batch,
    finalVerdict,
    studentName,
    minCGPA,
    tipsForJuniors,
    overallExperience,
    placementType,
    roleType,
    historyOfBacklogs,
    standingBacklogs,
}: ExperienceCardProps) {
    const [modalOpen, setModalOpen] = useState(false);

    const verdictConfig: Record<string, { label: string; cls: string }> = {
        selected: { label: '✓ Selected', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
        rejected: { label: '✗ Not Selected', cls: 'bg-red-500/15 text-red-400 border-red-500/25' },
        waitlisted: { label: '⏳ Waitlisted', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
        ongoing: { label: '🔄 Ongoing', cls: 'bg-sky-500/15 text-sky-400 border-sky-500/25' },
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                onClick={() => setModalOpen(true)}
                className="cursor-pointer group"
            >
                <div className="relative rounded-xl bg-slate-950/60 backdrop-blur-xl border border-white/[0.08] p-6 transition-all duration-300 hover:border-violet-500/30 hover:bg-slate-900/60 hover:shadow-[0_0_40px_-10px_rgba(139,92,246,0.15)]">
                    {/* Top accent line */}
                    <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-violet-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Arrow indicator */}
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 -translate-y-1 group-hover:translate-x-0 group-hover:translate-y-0">
                        <ArrowUpRight className="h-4 w-4 text-violet-400" />
                    </div>

                    {/* Header */}
                    <div className="flex items-start justify-between mb-3 gap-3">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2 truncate">
                                <Building2 className="h-5 w-5 text-blue-400 shrink-0" />
                                <span className="truncate">{company}</span>
                            </h3>
                            <p className="text-sm text-white/60 flex items-center gap-2 truncate">
                                <Briefcase className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{role}</span>
                            </p>
                            {studentName && (
                                <p className="text-xs text-white/40 mt-1 ml-[22px]">
                                    by {studentName}
                                </p>
                            )}
                        </div>
                        <div className="text-right shrink-0">
                            <div className="flex items-center gap-0.5 text-emerald-400 font-bold text-lg">
                                <IndianRupee className="h-4 w-4" />
                                {ctc} LPA
                            </div>
                        </div>
                    </div>

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        {batch && (
                            <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-blue-500/15 text-blue-300 border border-blue-500/20">
                                {batch}
                            </span>
                        )}
                        {finalVerdict && (
                            <span className={`px-2 py-0.5 text-[11px] font-semibold rounded border ${verdictConfig[finalVerdict]?.cls || ''}`}>
                                {verdictConfig[finalVerdict]?.label || finalVerdict}
                            </span>
                        )}
                        {year && (
                            <span className="text-[11px] text-white/40 ml-auto">{year}</span>
                        )}

                    </div>

                    {/* Type Badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        {placementType && (
                            <span className="px-2 py-0.5 text-[10px] font-medium rounded uppercase tracking-wider bg-purple-500/10 text-purple-300 border border-purple-500/20">
                                {placementType.replace('_', ' ')}
                            </span>
                        )}
                        {roleType && (
                            <span className="px-2 py-0.5 text-[10px] font-medium rounded uppercase tracking-wider bg-pink-500/10 text-pink-300 border border-pink-500/20">
                                {roleType.replace('_', ' ')}
                            </span>
                        )}
                    </div>

                    {/* Tags */}
                    {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            {tags.slice(0, 5).map((tag, idx) => (
                                <span
                                    key={idx}
                                    className="px-2.5 py-0.5 text-[11px] font-medium rounded-full bg-white/[0.05] text-white/70 border border-white/[0.08]"
                                >
                                    {tag}
                                </span>
                            ))}
                            {tags.length > 5 && (
                                <span className="px-2.5 py-0.5 text-[11px] text-white/40">
                                    +{tags.length - 5} more
                                </span>
                            )}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                        <p className="text-xs text-white/40">
                            {rounds.length} round{rounds.length !== 1 ? 's' : ''}
                        </p>
                        <span className="text-xs text-violet-400/80 group-hover:text-violet-400 transition-colors">
                            View Details →
                        </span>
                    </div>
                </div>
            </motion.div>

            {/* Detail Modal */}
            <ExperienceModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                company={company}
                role={role}
                ctc={ctc}
                rounds={rounds}
                tags={tags}
                year={year}
                batch={batch}
                finalVerdict={finalVerdict}
                studentName={studentName}
                minCGPA={minCGPA}
                tipsForJuniors={tipsForJuniors}
                overallExperience={overallExperience}
                placementType={placementType}
                roleType={roleType}
                historyOfBacklogs={historyOfBacklogs}
                standingBacklogs={standingBacklogs}
            />
        </>
    );
}
