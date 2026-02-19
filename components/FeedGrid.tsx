'use client';

import { useState } from 'react';
import { IExperience } from '@/models/Experience';
import ExperienceCard from './ExperienceCard';
import { motion } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FeedGridProps {
    experiences: any[];
    companies: string[];
    batches: string[];
}

export default function FeedGrid({ experiences, companies, batches }: FeedGridProps) {
    const [filteredExperiences, setFilteredExperiences] = useState(experiences);
    const [filters, setFilters] = useState({
        companies: [] as string[],
        batches: [] as string[],
        verdicts: [] as string[],
        types: [] as string[],
        search: '',
    });

    // Apply filters
    const applyFilters = () => {
        let result = experiences;

        if (filters.companies.length > 0) {
            result = result.filter(exp => filters.companies.includes(exp.company));
        }

        if (filters.batches.length > 0) {
            result = result.filter(exp => exp.batch && filters.batches.includes(exp.batch));
        }

        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            result = result.filter(exp =>
                exp.company.toLowerCase().includes(searchLower) ||
                exp.role.toLowerCase().includes(searchLower) ||
                exp.tags?.some((tag: string) => tag.toLowerCase().includes(searchLower))
            );
        }

        setFilteredExperiences(result);
    };

    // Update filters and apply
    const updateFilters = (newFilters: Partial<typeof filters>) => {
        const updated = { ...filters, ...newFilters };
        setFilters(updated);

        // Apply immediately
        let result = experiences;

        if (updated.companies.length > 0) {
            result = result.filter(exp => updated.companies.includes(exp.company));
        }

        if (updated.batches.length > 0) {
            result = result.filter(exp => exp.batch && updated.batches.includes(exp.batch));
        }

        if (updated.verdicts.length > 0) {
            result = result.filter(exp => exp.verdict && updated.verdicts.includes(exp.verdict));
        }

        if (updated.types.length > 0) {
            result = result.filter(exp => exp.roleType && updated.types.includes(exp.roleType));
        }

        if (updated.search) {
            const searchLower = updated.search.toLowerCase();
            result = result.filter(exp =>
                exp.company.toLowerCase().includes(searchLower) ||
                exp.role.toLowerCase().includes(searchLower) ||
                exp.tags?.some((tag: string) => tag.toLowerCase().includes(searchLower))
            );
        }

        setFilteredExperiences(result);
    };

    const clearFilters = () => {
        setFilters({ companies: [], batches: [], verdicts: [], types: [], search: '' });
        setFilteredExperiences(experiences);
    };

    return (
        <div className="space-y-6">
            {/* Filter Bar */}
            <div className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-2xl">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Search */}
                    <div className="flex-1 min-w-[200px]">
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => updateFilters({ search: e.target.value })}
                            placeholder="Search by company, role, or tags..."
                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Company Filter */}
                    <div className="min-w-[150px]">
                        <Select
                            value={filters.companies[0] || "all"}
                            onValueChange={(value) => {
                                updateFilters({ companies: value === "all" ? [] : [value] });
                            }}
                        >
                            <SelectTrigger className="w-full h-10 px-4 py-2 bg-white/10 border-white/20 text-white focus:ring-blue-500">
                                <SelectValue placeholder="All Companies" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10 text-white max-h-[300px]">
                                <SelectItem value="all" className="focus:bg-white/10 focus:text-white cursor-pointer">All Companies</SelectItem>
                                {companies.map(company => (
                                    <SelectItem key={company} value={company} className="focus:bg-white/10 focus:text-white cursor-pointer">
                                        {company}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Role Type Filter */}
                    <div className="min-w-[140px]">
                        <Select
                            value={filters.types[0] || "all"}
                            onValueChange={(value) => {
                                updateFilters({ types: value === "all" ? [] : [value] });
                            }}
                        >
                            <SelectTrigger className="w-full h-10 px-4 py-2 bg-white/10 border-white/20 text-white focus:ring-blue-500">
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

                    {/* Verdict Filter */}
                    <div className="min-w-[140px]">
                        <Select
                            value={filters.verdicts[0] || "all"}
                            onValueChange={(value) => {
                                updateFilters({ verdicts: value === "all" ? [] : [value] });
                            }}
                        >
                            <SelectTrigger className="w-full h-10 px-4 py-2 bg-white/10 border-white/20 text-white focus:ring-blue-500">
                                <SelectValue placeholder="All Verdicts" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10 text-white">
                                <SelectItem value="all" className="focus:bg-white/10 focus:text-white cursor-pointer">All Verdicts</SelectItem>
                                <SelectItem value="ACCEPTED" className="focus:bg-white/10 focus:text-white cursor-pointer">Accepted</SelectItem>
                                <SelectItem value="REJECTED" className="focus:bg-white/10 focus:text-white cursor-pointer">Rejected</SelectItem>
                                <SelectItem value="WAITLISTED" className="focus:bg-white/10 focus:text-white cursor-pointer">Waitlisted</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Batch Filter */}
                    <div className="min-w-[120px]">
                        <Select
                            value={filters.batches[0] || "all"}
                            onValueChange={(value) => {
                                updateFilters({ batches: value === "all" ? [] : [value] });
                            }}
                        >
                            <SelectTrigger className="w-full h-10 px-4 py-2 bg-white/10 border-white/20 text-white focus:ring-blue-500">
                                <SelectValue placeholder="All Batches" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10 text-white max-h-[300px]">
                                <SelectItem value="all" className="focus:bg-white/10 focus:text-white cursor-pointer">All Batches</SelectItem>
                                {batches.map(batch => (
                                    <SelectItem key={batch} value={batch} className="focus:bg-white/10 focus:text-white cursor-pointer">
                                        {batch}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Clear Filters */}
                    {(filters.companies.length > 0 || filters.batches.length > 0 || filters.verdicts.length > 0 || filters.types.length > 0 || filters.search) && (
                        <button
                            onClick={clearFilters}
                            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 rounded-lg transition-all text-sm font-semibold whitespace-nowrap"
                        >
                            Clear Filters
                        </button>
                    )}

                    {/* Results Count */}
                    <div className="text-sm text-white/60 ml-auto">
                        {filteredExperiences.length} {filteredExperiences.length === 1 ? 'result' : 'results'}
                    </div>
                </div>
            </div>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 auto-rows-auto">
                {filteredExperiences.map((exp, index) => (
                    <motion.div
                        key={exp._id?.toString() || index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
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
                        />
                    </motion.div>
                ))}
            </div>

            {filteredExperiences.length === 0 && (
                <div className="text-center py-20">
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-12 max-w-md mx-auto">
                        <p className="text-xl font-semibold text-white mb-2">No experiences found</p>
                        <p className="text-white/60">Try adjusting your filters or search query</p>
                    </div>
                </div>
            )}
        </div>
    );
}
