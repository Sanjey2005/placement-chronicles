'use client';

import { useState } from 'react';
import { IExperience } from '@/models/Experience';
import ExperienceCard from './ExperienceCard';
import { motion } from 'framer-motion';

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
        setFilters({ companies: [], batches: [], search: '' });
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
                        <select
                            value={filters.companies[0] || ''}
                            onChange={(e) => {
                                const value = e.target.value;
                                updateFilters({ companies: value ? [value] : [] });
                            }}
                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="" className="bg-slate-900">All Companies</option>
                            {companies.map(company => (
                                <option key={company} value={company} className="bg-slate-900">
                                    {company}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Batch Filter */}
                    <div className="min-w-[120px]">
                        <select
                            value={filters.batches[0] || ''}
                            onChange={(e) => {
                                const value = e.target.value;
                                updateFilters({ batches: value ? [value] : [] });
                            }}
                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="" className="bg-slate-900">All Batches</option>
                            {batches.map(batch => (
                                <option key={batch} value={batch} className="bg-slate-900">
                                    {batch}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Clear Filters */}
                    {(filters.companies.length > 0 || filters.batches.length > 0 || filters.search) && (
                        <button
                            onClick={clearFilters}
                            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 rounded-lg transition-all text-sm font-semibold"
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
                            eligibilityCriteria={exp.eligibilityCriteria}
                            tipsForJuniors={exp.tipsForJuniors}
                            overallExperience={exp.overallExperience}
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
