'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Building2, Users, TrendingUp, Briefcase, SortAsc, SortDesc } from 'lucide-react';
import ExperienceCard from './ExperienceCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CompanyDetailPanelProps {
    companyName: string;
    experiences: any[];
    logoUrl?: string;
    onBack: () => void;
}

export default function CompanyDetailPanel({ companyName, experiences, logoUrl, onBack }: CompanyDetailPanelProps) {
    const [roleTypeFilter, setRoleTypeFilter] = useState('all');
    const [batchFilter, setBatchFilter] = useState('all');
    const [verdictFilter, setVerdictFilter] = useState('all');
    const [cgpaFilter, setCgpaFilter] = useState('all');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Reset page to 1 whenever filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [roleTypeFilter, batchFilter, verdictFilter, cgpaFilter, sortOrder]);

    // Available filter options from this company's experiences
    const batches = useMemo(() =>
        Array.from(new Set(experiences.map(e => e.batch).filter(Boolean))).sort().reverse(),
        [experiences]
    );

    // Apply inner filters
    const filteredExperiences = useMemo(() => {
        let result = [...experiences];

        if (roleTypeFilter !== 'all') {
            result = result.filter(exp => exp.roleType === roleTypeFilter);
        }
        if (batchFilter !== 'all') {
            result = result.filter(exp => exp.batch === batchFilter);
        }
        if (verdictFilter !== 'all') {
            result = result.filter(exp => exp.finalVerdict === verdictFilter);
        }
        if (cgpaFilter !== 'all') {
            const threshold = parseFloat(cgpaFilter);
            result = result.filter(exp => exp.minCGPA != null && exp.minCGPA <= threshold);
        }

        // Sort
        result.sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });

        return result;
    }, [experiences, roleTypeFilter, batchFilter, verdictFilter, cgpaFilter, sortOrder]);

    // Aggregate stats
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
    const selected = experiences.filter(e => e.finalVerdict === 'selected').length;
    const selectionRate = experiences.length > 0 ? Math.round((selected / experiences.length) * 100) : 0;

    // Pagination calculations
    const totalPages = Math.ceil(filteredExperiences.length / ITEMS_PER_PAGE);
    const paginatedExperiences = filteredExperiences.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
        >
            {/* Company Header */}
            <div className="rounded-xl bg-slate-950/60 backdrop-blur-xl border border-white/[0.08] p-6">
                <div className="flex items-center gap-4 mb-4">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-white" />
                    </button>

                    {logoUrl ? (
                        <div className="w-14 h-14 flex-shrink-0 rounded-xl bg-white flex items-center justify-center overflow-hidden border border-white/10 shadow-md">
                            <img
                                src={`https://www.google.com/s2/favicons?domain=${logoUrl}&sz=128`}
                                alt={`${companyName} logo`}
                                className="w-full h-full object-contain p-1"
                                onError={(e) => {
                                    const target = e.currentTarget;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                        parent.classList.remove('bg-white');
                                        parent.classList.add('bg-blue-500/10');
                                        parent.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-400"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>';
                                    }
                                }}
                            />
                        </div>
                    ) : (
                        <div className="w-14 h-14 flex-shrink-0 p-3 bg-blue-500/10 rounded-xl flex items-center justify-center">
                            <Building2 className="h-7 w-7 text-blue-400" />
                        </div>
                    )}

                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-white">{companyName}</h2>
                        {logoUrl && <span className="text-sm text-white/40">{logoUrl}</span>}
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white/[0.04] rounded-lg px-4 py-3 flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Users className="h-4 w-4 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-white">{experiences.length}</p>
                            <p className="text-xs text-white/40">Experiences</p>
                        </div>
                    </div>
                    <div className="bg-white/[0.04] rounded-lg px-4 py-3 flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                            <TrendingUp className="h-4 w-4 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-white">{avgCTC} LPA</p>
                            <p className="text-xs text-white/40">Avg CTC</p>
                        </div>
                    </div>
                    <div className="bg-white/[0.04] rounded-lg px-4 py-3 flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                            <Briefcase className="h-4 w-4 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-white">{selectionRate}%</p>
                            <p className="text-xs text-white/40">Selection Rate</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Inner Filters */}
            <div className="bg-slate-950/60 backdrop-blur-xl border border-white/[0.08] rounded-xl p-4">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Role Type */}
                    <div className="min-w-[130px]">
                        <Select value={roleTypeFilter} onValueChange={setRoleTypeFilter}>
                            <SelectTrigger className="w-full h-9 px-3 py-1.5 bg-white/10 border-white/20 text-white text-sm focus:ring-blue-500">
                                <SelectValue placeholder="All Roles" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10 text-white">
                                <SelectItem value="all" className="focus:bg-white/10 focus:text-white cursor-pointer">All Roles</SelectItem>
                                <SelectItem value="FULL_TIME" className="focus:bg-white/10 focus:text-white cursor-pointer">Full Time</SelectItem>
                                <SelectItem value="INTERNSHIP" className="focus:bg-white/10 focus:text-white cursor-pointer">Internship</SelectItem>
                                <SelectItem value="SUMMER_INTERNSHIP" className="focus:bg-white/10 focus:text-white cursor-pointer">Summer Intern</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Batch */}
                    <div className="min-w-[110px]">
                        <Select value={batchFilter} onValueChange={setBatchFilter}>
                            <SelectTrigger className="w-full h-9 px-3 py-1.5 bg-white/10 border-white/20 text-white text-sm focus:ring-blue-500">
                                <SelectValue placeholder="All Batches" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10 text-white max-h-[300px]">
                                <SelectItem value="all" className="focus:bg-white/10 focus:text-white cursor-pointer">All Batches</SelectItem>
                                {batches.map(b => (
                                    <SelectItem key={b} value={b} className="focus:bg-white/10 focus:text-white cursor-pointer">{b}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Verdict */}
                    <div className="min-w-[120px]">
                        <Select value={verdictFilter} onValueChange={setVerdictFilter}>
                            <SelectTrigger className="w-full h-9 px-3 py-1.5 bg-white/10 border-white/20 text-white text-sm focus:ring-blue-500">
                                <SelectValue placeholder="All Verdicts" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10 text-white">
                                <SelectItem value="all" className="focus:bg-white/10 focus:text-white cursor-pointer">All Verdicts</SelectItem>
                                <SelectItem value="selected" className="focus:bg-white/10 focus:text-white cursor-pointer">Selected</SelectItem>
                                <SelectItem value="rejected" className="focus:bg-white/10 focus:text-white cursor-pointer">Not Selected</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* CGPA */}
                    <div className="min-w-[120px]">
                        <Select value={cgpaFilter} onValueChange={setCgpaFilter}>
                            <SelectTrigger className="w-full h-9 px-3 py-1.5 bg-white/10 border-white/20 text-white text-sm focus:ring-blue-500">
                                <SelectValue placeholder="All CGPAs" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10 text-white">
                                <SelectItem value="all" className="focus:bg-white/10 focus:text-white cursor-pointer">All CGPAs</SelectItem>
                                <SelectItem value="6" className="focus:bg-white/10 focus:text-white cursor-pointer">6 & above</SelectItem>
                                <SelectItem value="7" className="focus:bg-white/10 focus:text-white cursor-pointer">7 & above</SelectItem>
                                <SelectItem value="8" className="focus:bg-white/10 focus:text-white cursor-pointer">8 & above</SelectItem>
                                <SelectItem value="9" className="focus:bg-white/10 focus:text-white cursor-pointer">9 & above</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Sort order */}
                    <button
                        onClick={() => setSortOrder(s => s === 'newest' ? 'oldest' : 'newest')}
                        className="flex items-center gap-1.5 px-3 py-1.5 h-9 text-sm bg-white/10 hover:bg-white/15 border border-white/20 rounded-md text-white/70 transition-colors"
                    >
                        {sortOrder === 'newest' ? <SortDesc className="h-3.5 w-3.5" /> : <SortAsc className="h-3.5 w-3.5" />}
                        {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
                    </button>

                    <span className="text-sm text-white/40 ml-auto">
                        {filteredExperiences.length} {filteredExperiences.length === 1 ? 'experience' : 'experiences'}
                    </span>
                </div>
            </div>

            {/* Experience Cards Grid */}
            {filteredExperiences.length === 0 ? (
                <div className="text-center py-16">
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-12 max-w-md mx-auto">
                        <p className="text-xl font-semibold text-white mb-2">No experiences match</p>
                        <p className="text-white/60">Try adjusting the filters above</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {paginatedExperiences.map((exp, index) => (
                            <motion.div
                                key={exp._id?.toString() || index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.04 }}
                            >
                                <ExperienceCard
                                    company={exp.company}
                                    role={exp.role}
                                    ctc={exp.ctc}
                                    rounds={exp.rounds}
                                    tags={exp.tags}
                                    year={exp.year}
                                    batch={exp.batch}
                                    finalVerdict={exp.finalVerdict}
                                    studentName={exp.studentName}
                                    minCGPA={exp.minCGPA}
                                    historyOfBacklogs={exp.historyOfBacklogs}
                                    standingBacklogs={exp.standingBacklogs}
                                    tipsForJuniors={exp.tipsForJuniors}
                                    overallExperience={exp.overallExperience}
                                    placementType={exp.placementType}
                                    roleType={exp.roleType}
                                    resumeShortlisting={exp.resumeShortlisting}
                                    hideCompany
                                />
                            </motion.div>
                        ))}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-3 pt-4 border-t border-white/5">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-medium text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                            >
                                Previous
                            </button>
                            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white/60">
                                Page <span className="text-white font-medium">{currentPage}</span> of <span className="text-white font-medium">{totalPages}</span>
                            </div>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-medium text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
}
