'use client';

import { useState, useMemo, useEffect } from 'react';
import CompanyCard from './CompanyCard';
import CompanyDetailPanel from './CompanyDetailPanel';
import { motion, AnimatePresence } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Filter, X } from 'lucide-react';

const emptyDraft = { companies: [] as string[], batches: [] as string[], verdicts: [] as string[], types: [] as string[], cgpa: '' };

interface FeedGridProps {
    experiences: any[];
    companies: string[];
    batches: string[];
    companyLinks: Record<string, string>;
}

export default function FeedGrid({ experiences, companies, batches, companyLinks }: FeedGridProps) {
    const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
    const ITEMS_PER_PAGE = 12;

    const [filters, setFilters] = useState({ ...emptyDraft, search: '' });
    // Dropdown selections are staged here and only take effect on "Apply" —
    // auto-applying each Select was reflowing the page on every click when
    // someone wanted to set 3-4 filters at once. Search stays live/immediate.
    const [draftFilters, setDraftFilters] = useState(emptyDraft);

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

    // Update filters (used for the live search box — applies immediately)
    const updateFilters = (newFilters: Partial<typeof filters>) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
        setCurrentPage(1); // Reset page on filter change
    };

    // Stage a dropdown change without applying it yet
    const updateDraft = (newDraft: Partial<typeof draftFilters>) => {
        setDraftFilters(prev => ({ ...prev, ...newDraft }));
    };

    // Commit staged dropdown selections
    const applyFilters = () => {
        setFilters(prev => ({ ...prev, ...draftFilters }));
        setCurrentPage(1);
    };

    const clearFilters = () => {
        setDraftFilters(emptyDraft);
        setFilters({ ...emptyDraft, search: '' });
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
            {/* Filter Bars - Hidden when a company is selected */}
            {!selectedCompany && (
                <>
                    {/* Mobile Filter Button */}
                    <div className="sm:hidden sticky top-[76px] z-40 bg-background/90 backdrop-blur border border-outline-variant rounded-3xl p-4 shadow-m3 mb-2">
                        <div className="flex items-center justify-between">
                    <div className="flex-1 mr-4">
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => updateFilters({ search: e.target.value })}
                            placeholder="Search company, role..."
                            className="w-full px-4 py-2 bg-card border border-outline-variant rounded-full text-foreground placeholder:text-outline focus:outline-none"
                        />
                    </div>
                    <button
                        onClick={() => setIsMobileFilterOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-fixed text-primary rounded-full transition-all font-semibold whitespace-nowrap hover:bg-primary-fixed-dim"
                    >
                        <Filter className="h-4 w-4" />
                        Filters {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-destructive inline-block ml-1"></span>}
                    </button>
                </div>
                <div className="text-xs font-medium text-muted-foreground mt-2 text-center">
                    {companyGroups.length} {companyGroups.length === 1 ? 'company' : 'companies'} · {filteredExperiences.length} {filteredExperiences.length === 1 ? 'experience' : 'experiences'}
                </div>
            </div>

            {/* Global Filter Bar (Desktop) */}
            <div className="hidden sm:block sticky top-[76px] z-40 bg-background/90 backdrop-blur border border-outline-variant rounded-2xl p-4 shadow-m3 mb-6">
                {/* Search — the hero search */}
                <div className="w-full max-w-2xl mx-auto mb-4">
                    <input
                        type="text"
                        value={filters.search}
                        onChange={(e) => updateFilters({ search: e.target.value })}
                        placeholder="Search by company, role, or tags..."
                        className="w-full px-6 py-3 bg-card border border-outline-variant rounded-full text-foreground placeholder:text-outline focus:outline-none"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-4">
                    {/* Company Filter — searchable, the plain list got long */}
                    <div className="min-w-[150px]">
                        <Combobox
                            value={draftFilters.companies[0] || "all"}
                            onChange={(value) => updateDraft({ companies: value === "all" ? [] : [value] })}
                            options={companies}
                            placeholder="Search companies..."
                            allLabel="All Companies"
                        />
                    </div>

                    {/* Role Type Filter */}
                    <div className="min-w-[140px]">
                        <Select
                            value={draftFilters.types[0] || "all"}
                            onValueChange={(value) => {
                                updateDraft({ types: value === "all" ? [] : [value] });
                            }}
                        >
                            <SelectTrigger className="w-full h-10 px-4 py-2 rounded-full">
                                <SelectValue placeholder="All Roles" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="cursor-pointer">All Roles</SelectItem>
                                <SelectItem value="FULL_TIME" className="cursor-pointer">Full Time</SelectItem>
                                <SelectItem value="INTERNSHIP" className="cursor-pointer">Internship</SelectItem>
                                <SelectItem value="SUMMER_INTERNSHIP" className="cursor-pointer">Summer Intern</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Verdict Filter */}
                    <div className="min-w-[140px]">
                        <Select
                            value={draftFilters.verdicts[0] || "all"}
                            onValueChange={(value) => {
                                updateDraft({ verdicts: value === "all" ? [] : [value] });
                            }}
                        >
                            <SelectTrigger className="w-full h-10 px-4 py-2 rounded-full">
                                <SelectValue placeholder="All Verdicts" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="cursor-pointer">All Verdicts</SelectItem>
                                <SelectItem value="ACCEPTED" className="cursor-pointer">Accepted</SelectItem>
                                <SelectItem value="REJECTED" className="cursor-pointer">Rejected</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Batch Filter */}
                    <div className="min-w-[120px]">
                        <Select
                            value={draftFilters.batches[0] || "all"}
                            onValueChange={(value) => {
                                updateDraft({ batches: value === "all" ? [] : [value] });
                            }}
                        >
                            <SelectTrigger className="w-full h-10 px-4 py-2 rounded-full">
                                <SelectValue placeholder="All Batches" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                <SelectItem value="all" className="cursor-pointer">All Batches</SelectItem>
                                {batches.map(batch => (
                                    <SelectItem key={batch} value={batch} className="cursor-pointer">
                                        {batch}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* CGPA Filter */}
                    <div className="min-w-[130px]">
                        <Select
                            value={draftFilters.cgpa || "all"}
                            onValueChange={(value) => {
                                updateDraft({ cgpa: value === "all" ? '' : value });
                            }}
                        >
                            <SelectTrigger className="w-full h-10 px-4 py-2 rounded-full">
                                <SelectValue placeholder="All CGPAs" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="cursor-pointer">All CGPAs</SelectItem>
                                <SelectItem value="6" className="cursor-pointer">6 & above</SelectItem>
                                <SelectItem value="7" className="cursor-pointer">7 & above</SelectItem>
                                <SelectItem value="8" className="cursor-pointer">8 & above</SelectItem>
                                <SelectItem value="9" className="cursor-pointer">9 & above</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Apply — dropdown picks are staged, not auto-applied, so
                        picking several filters in a row doesn't re-render the
                        grid after every click. */}
                    <button
                        onClick={applyFilters}
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full transition-all text-sm font-semibold whitespace-nowrap shadow-m3"
                    >
                        Apply Filters
                    </button>

                    {/* Clear Filters */}
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="px-4 py-2 bg-error-container hover:bg-error-container/70 text-on-error-container rounded-full transition-all text-sm font-semibold whitespace-nowrap"
                        >
                            Clear Filters
                        </button>
                    )}

                    {/* Results Count */}
                    <div className="text-sm font-medium text-muted-foreground ml-auto">
                        {companyGroups.length} {companyGroups.length === 1 ? 'company' : 'companies'} · {filteredExperiences.length} {filteredExperiences.length === 1 ? 'experience' : 'experiences'}
                    </div>
                </div>
            </div>
                </>
            )}

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
                            <div className="bg-card border border-outline-variant shadow-m3 rounded-2xl p-12 max-w-md mx-auto">
                                <p className="text-xl font-semibold text-foreground mb-2">No experiences found</p>
                                <p className="text-muted-foreground">Try adjusting your filters or search query</p>
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
                                <div className="flex justify-center items-center gap-3 pt-4 border-t border-outline-variant">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="px-4 py-2 bg-card border border-outline-variant rounded-full text-sm font-medium text-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-container transition-colors"
                                    >
                                        Previous
                                    </button>
                                    <div className="flex items-center gap-2 px-4 py-2 bg-card border border-outline-variant rounded-full text-sm text-muted-foreground">
                                        Page <span className="text-foreground font-medium">{currentPage}</span> of <span className="text-foreground font-medium">{totalPages}</span>
                                    </div>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-4 py-2 bg-card border border-outline-variant rounded-full text-sm font-medium text-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-container transition-colors"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Mobile Filter Modal */}
            <AnimatePresence>
                {isMobileFilterOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-end sm:hidden bg-black/40"
                        onClick={() => setIsMobileFilterOpen(false)}
                    >
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="w-full bg-card border-t border-outline-variant rounded-t-3xl p-6 shadow-m3 max-h-[85vh] overflow-y-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                                    <Filter className="h-5 w-5 text-primary" />
                                    Filters
                                </h3>
                                <button
                                    onClick={() => setIsMobileFilterOpen(false)}
                                    className="p-2 rounded-full bg-surface-container hover:bg-surface-container-high text-muted-foreground hover:text-foreground transition-all"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Company Filter — searchable */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">Company</label>
                                    <Combobox
                                        value={draftFilters.companies[0] || "all"}
                                        onChange={(value) => updateDraft({ companies: value === "all" ? [] : [value] })}
                                        options={companies}
                                        placeholder="Search companies..."
                                        allLabel="All Companies"
                                    />
                                </div>

                                {/* Role Type Filter */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">Role Type</label>
                                    <Select
                                        value={draftFilters.types[0] || "all"}
                                        onValueChange={(value) => updateDraft({ types: value === "all" ? [] : [value] })}
                                    >
                                        <SelectTrigger className="w-full h-10 px-4 py-2 rounded-full">
                                            <SelectValue placeholder="All Roles" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Roles</SelectItem>
                                            <SelectItem value="FULL_TIME">Full Time</SelectItem>
                                            <SelectItem value="INTERNSHIP">Internship</SelectItem>
                                            <SelectItem value="SUMMER_INTERNSHIP">Summer Intern</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Verdict Filter */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">Verdict</label>
                                    <Select
                                        value={draftFilters.verdicts[0] || "all"}
                                        onValueChange={(value) => updateDraft({ verdicts: value === "all" ? [] : [value] })}
                                    >
                                        <SelectTrigger className="w-full h-10 px-4 py-2 rounded-full">
                                            <SelectValue placeholder="All Verdicts" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Verdicts</SelectItem>
                                            <SelectItem value="ACCEPTED">Accepted</SelectItem>
                                            <SelectItem value="REJECTED">Rejected</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Batch Filter */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">Batch</label>
                                    <Select
                                        value={draftFilters.batches[0] || "all"}
                                        onValueChange={(value) => updateDraft({ batches: value === "all" ? [] : [value] })}
                                    >
                                        <SelectTrigger className="w-full h-10 px-4 py-2 rounded-full">
                                            <SelectValue placeholder="All Batches" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[200px]">
                                            <SelectItem value="all">All Batches</SelectItem>
                                            {batches.map(batch => (
                                                <SelectItem key={batch} value={batch}>{batch}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* CGPA Filter */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-muted-foreground">Minimum CGPA</label>
                                    <Select
                                        value={draftFilters.cgpa || "all"}
                                        onValueChange={(value) => updateDraft({ cgpa: value === "all" ? '' : value })}
                                    >
                                        <SelectTrigger className="w-full h-10 px-4 py-2 rounded-full">
                                            <SelectValue placeholder="All CGPAs" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All CGPAs</SelectItem>
                                            <SelectItem value="6">6 & above</SelectItem>
                                            <SelectItem value="7">7 & above</SelectItem>
                                            <SelectItem value="8">8 & above</SelectItem>
                                            <SelectItem value="9">9 & above</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="mt-8 flex gap-3">
                                {hasActiveFilters && (
                                    <button
                                        onClick={() => {
                                            clearFilters();
                                            setIsMobileFilterOpen(false);
                                        }}
                                        className="flex-1 px-4 py-3 bg-error-container hover:bg-error-container/70 text-on-error-container font-semibold rounded-full transition-colors"
                                    >
                                        Clear
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        applyFilters();
                                        setIsMobileFilterOpen(false);
                                    }}
                                    className="flex-[2] px-4 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-full transition-colors shadow-m3"
                                >
                                    Apply Filters
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
