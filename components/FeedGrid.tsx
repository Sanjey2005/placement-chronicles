'use client';

import { useState, useMemo, useEffect } from 'react';
import CompanyCard from './CompanyCard';
import CompanyDetailPanel from './CompanyDetailPanel';
import { motion } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FeedGridProps {
    experiences: any[];
    companies: string[];
    batches: string[];
    companyLinks: Record<string, string>;
}

export default function FeedGrid({ experiences, companies, batches, companyLinks }: FeedGridProps) {
    const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 12;

    const [filters, setFilters] = useState({
        companies: [] as string[],
        batches: [] as string[],
        verdicts: [] as string[],
        types: [] as string[],
        cgpa: '',
        search: '',
    });

    // Apply global filters
    const filteredExperiences = useMemo(() => {
        let result = experiences;

        if (filters.companies.length > 0) {
            result = result.filter(exp => filters.companies.includes(exp.company));
        }

        if (filters.batches.length > 0) {
            result = result.filter(exp => exp.batch && filters.batches.includes(exp.batch));
        }

        if (filters.verdicts.length > 0) {
            result = result.filter(exp => exp.verdict && filters.verdicts.includes(exp.verdict));
        }

        if (filters.types.length > 0) {
            result = result.filter(exp => exp.roleType && filters.types.includes(exp.roleType));
        }

        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            result = result.filter(exp =>
                exp.company.toLowerCase().includes(searchLower) ||
                exp.role.toLowerCase().includes(searchLower) ||
                exp.tags?.some((tag: string) => tag.toLowerCase().includes(searchLower))
            );
        }

        if (filters.cgpa) {
            const cgpaThreshold = parseFloat(filters.cgpa);
            result = result.filter(exp => exp.minCGPA != null && exp.minCGPA <= cgpaThreshold);
        }

        return result;
    }, [experiences, filters]);

    // Group by company
    const companyGroups = useMemo(() => {
        const groups: Record<string, any[]> = {};
        for (const exp of filteredExperiences) {
            const company = exp.company;
            if (!groups[company]) groups[company] = [];
            groups[company].push(exp);
        }
        // Sort by experience count descending
        return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
    }, [filteredExperiences]);

    // Auto-expand if only one company matches after global filter
    useEffect(() => {
        const hasActiveFilter = filters.companies.length > 0 || filters.batches.length > 0 ||
            filters.verdicts.length > 0 || filters.types.length > 0 ||
            filters.cgpa || filters.search;

        if (hasActiveFilter && companyGroups.length === 1) {
            setSelectedCompany(companyGroups[0][0]);
        } else if (!hasActiveFilter && selectedCompany) {
            // Keep selection, don't auto-close
        }
    }, [companyGroups, filters]);

    // Update filters
    const updateFilters = (newFilters: Partial<typeof filters>) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
        setCurrentPage(1); // Reset page on filter change
    };

    const clearFilters = () => {
        setFilters({ companies: [], batches: [], verdicts: [], types: [], cgpa: '', search: '' });
        setSelectedCompany(null);
        setCurrentPage(1);
    };

    const hasActiveFilters = filters.companies.length > 0 || filters.batches.length > 0 ||
        filters.verdicts.length > 0 || filters.types.length > 0 ||
        filters.cgpa || filters.search;

    // Pagination calculations
    const totalPages = Math.ceil(companyGroups.length / ITEMS_PER_PAGE);
    const paginatedGroups = companyGroups.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <div className="space-y-6">
            {/* Global Filter Bar */}
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

                    {/* CGPA Filter */}
                    <div className="min-w-[130px]">
                        <Select
                            value={filters.cgpa || "all"}
                            onValueChange={(value) => {
                                updateFilters({ cgpa: value === "all" ? '' : value });
                            }}
                        >
                            <SelectTrigger className="w-full h-10 px-4 py-2 bg-white/10 border-white/20 text-white focus:ring-blue-500">
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

                    {/* Clear Filters */}
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 rounded-lg transition-all text-sm font-semibold whitespace-nowrap"
                        >
                            Clear Filters
                        </button>
                    )}

                    {/* Results Count */}
                    <div className="text-sm text-white/60 ml-auto">
                        {companyGroups.length} {companyGroups.length === 1 ? 'company' : 'companies'} · {filteredExperiences.length} {filteredExperiences.length === 1 ? 'experience' : 'experiences'}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            {selectedCompany ? (
                /* Expanded Company Detail View */
                <CompanyDetailPanel
                    companyName={selectedCompany}
                    experiences={filteredExperiences.filter(e => e.company === selectedCompany)}
                    logoUrl={companyLinks[selectedCompany] || ''}
                    onBack={() => setSelectedCompany(null)}
                />
            ) : (
                /* Company Cards Grid */
                <>
                    {companyGroups.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-12 max-w-md mx-auto">
                                <p className="text-xl font-semibold text-white mb-2">No experiences found</p>
                                <p className="text-white/60">Try adjusting your filters or search query</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {paginatedGroups.map(([companyName, exps], index) => (
                                    <CompanyCard
                                        key={companyName}
                                        companyName={companyName}
                                        experiences={exps}
                                        logoUrl={companyLinks[companyName] || ''}
                                        onClick={() => setSelectedCompany(companyName)}
                                        index={index}
                                    />
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
                </>
            )}
        </div>
    );
}
