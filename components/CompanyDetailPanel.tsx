'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Users, TrendingUp, Target, SortAsc, SortDesc } from 'lucide-react';
import ExperienceCard from './ExperienceCard';
import ExperienceModal from './ExperienceModal';
import CompanyLogo from './CompanyLogo';
import { averageCTC, selectionRate } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
}

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
    const [selectedExperience, setSelectedExperience] = useState<any | null>(null);
    const router = useRouter();
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

    // Aggregate stats (shared helpers — this math was copy-pasted in 3 places)
    const avg = averageCTC(experiences);
    const avgCTC = avg === null ? '—' : avg.toFixed(1);
    const rate = selectionRate(experiences);

    // Pagination calculations
    const totalPages = Math.ceil(filteredExperiences.length / ITEMS_PER_PAGE);
    const paginatedExperiences = filteredExperiences.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    // One modal for the whole list. Previously every ExperienceCard rendered its
    // own, so a page mounted 10 portals whose scroll-locks fought each other.
    // The auth gate lives here now, with the thing it actually gates.
    const openExperience = (exp: any) => {
        if (!getCookie('auth-token')) {
            toast.info('Please log in to view experience details');
            router.push('/login');
            return;
        }
        setSelectedExperience(exp);
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
        >
            {/* Company Header */}
            <div className="rounded-3xl bg-card border border-outline-variant p-5 sm:p-6 shadow-m3">
                <div className="flex items-center gap-3 sm:gap-4 mb-5">
                    <button
                        onClick={onBack}
                        aria-label={`Back to all companies`}
                        className="shrink-0 p-2 rounded-full bg-surface-container hover:bg-surface-container-high border border-outline-variant transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                        <ArrowLeft className="h-5 w-5 text-foreground" />
                    </button>

                    <CompanyLogo logoUrl={logoUrl} size="lg" />

                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl sm:text-2xl font-bold text-foreground truncate">{companyName}</h2>
                        {logoUrl && <span className="text-sm text-outline truncate block">{logoUrl}</span>}
                    </div>
                </div>

                {/* Stats — was grid-cols-3 with no mobile override, so three tiles
                    were crushed side-by-side on a phone. */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                        { Icon: Users, value: String(experiences.length), label: 'Experiences', tone: 'bg-primary-fixed text-primary' },
                        { Icon: TrendingUp, value: `${avgCTC} LPA`, label: 'Avg CTC', tone: 'bg-secondary-fixed text-on-secondary-container' },
                        { Icon: Target, value: `${rate}%`, label: 'Selection Rate', tone: 'bg-success-container text-on-success-container' },
                    ].map((s) => (
                        <div key={s.label} className="bg-surface-container rounded-2xl px-4 py-3 flex items-center gap-3">
                            <div className={`p-2 rounded-xl shrink-0 ${s.tone}`}>
                                <s.Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xl font-bold text-foreground tabular-nums">{s.value}</p>
                                <p className="text-xs text-outline">{s.label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Inner Filters */}
            <div className="bg-card border border-outline-variant rounded-xl p-4">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Role Type */}
                    <div className="min-w-[130px]">
                        <Select value={roleTypeFilter} onValueChange={setRoleTypeFilter}>
                            <SelectTrigger className="w-full h-9 px-3 py-1.5 bg-surface-container border-outline-variant text-foreground text-sm focus:ring-ring/30">
                                <SelectValue placeholder="All Roles" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-outline-variant text-foreground">
                                <SelectItem value="all" className="focus:bg-surface-container focus:text-foreground cursor-pointer">All Roles</SelectItem>
                                <SelectItem value="FULL_TIME" className="focus:bg-surface-container focus:text-foreground cursor-pointer">Full Time</SelectItem>
                                <SelectItem value="INTERNSHIP" className="focus:bg-surface-container focus:text-foreground cursor-pointer">Internship</SelectItem>
                                <SelectItem value="SUMMER_INTERNSHIP" className="focus:bg-surface-container focus:text-foreground cursor-pointer">Summer Intern</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Batch */}
                    <div className="min-w-[110px]">
                        <Select value={batchFilter} onValueChange={setBatchFilter}>
                            <SelectTrigger className="w-full h-9 px-3 py-1.5 bg-surface-container border-outline-variant text-foreground text-sm focus:ring-ring/30">
                                <SelectValue placeholder="All Batches" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-outline-variant text-foreground max-h-[300px]">
                                <SelectItem value="all" className="focus:bg-surface-container focus:text-foreground cursor-pointer">All Batches</SelectItem>
                                {batches.map(b => (
                                    <SelectItem key={b} value={b} className="focus:bg-surface-container focus:text-foreground cursor-pointer">{b}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Verdict */}
                    <div className="min-w-[120px]">
                        <Select value={verdictFilter} onValueChange={setVerdictFilter}>
                            <SelectTrigger className="w-full h-9 px-3 py-1.5 bg-surface-container border-outline-variant text-foreground text-sm focus:ring-ring/30">
                                <SelectValue placeholder="All Verdicts" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-outline-variant text-foreground">
                                <SelectItem value="all" className="focus:bg-surface-container focus:text-foreground cursor-pointer">All Verdicts</SelectItem>
                                <SelectItem value="selected" className="focus:bg-surface-container focus:text-foreground cursor-pointer">Selected</SelectItem>
                                <SelectItem value="rejected" className="focus:bg-surface-container focus:text-foreground cursor-pointer">Not Selected</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* CGPA */}
                    <div className="min-w-[120px]">
                        <Select value={cgpaFilter} onValueChange={setCgpaFilter}>
                            <SelectTrigger className="w-full h-9 px-3 py-1.5 bg-surface-container border-outline-variant text-foreground text-sm focus:ring-ring/30">
                                <SelectValue placeholder="All CGPAs" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-outline-variant text-foreground">
                                <SelectItem value="all" className="focus:bg-surface-container focus:text-foreground cursor-pointer">All CGPAs</SelectItem>
                                <SelectItem value="6" className="focus:bg-surface-container focus:text-foreground cursor-pointer">6 & above</SelectItem>
                                <SelectItem value="7" className="focus:bg-surface-container focus:text-foreground cursor-pointer">7 & above</SelectItem>
                                <SelectItem value="8" className="focus:bg-surface-container focus:text-foreground cursor-pointer">8 & above</SelectItem>
                                <SelectItem value="9" className="focus:bg-surface-container focus:text-foreground cursor-pointer">9 & above</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Sort order */}
                    <button
                        onClick={() => setSortOrder(s => s === 'newest' ? 'oldest' : 'newest')}
                        className="flex items-center gap-1.5 px-3 py-1.5 h-9 text-sm bg-surface-container hover:bg-surface-container-high border border-outline-variant rounded-md text-muted-foreground transition-colors"
                    >
                        {sortOrder === 'newest' ? <SortDesc className="h-3.5 w-3.5" /> : <SortAsc className="h-3.5 w-3.5" />}
                        {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
                    </button>

                    <span className="text-sm text-outline ml-auto">
                        {filteredExperiences.length} {filteredExperiences.length === 1 ? 'experience' : 'experiences'}
                    </span>
                </div>
            </div>

            {/* Experience Cards Grid */}
            {filteredExperiences.length === 0 ? (
                <div className="text-center py-16">
                    <div className="bg-surface-container border border-outline-variant rounded-xl p-12 max-w-md mx-auto">
                        <p className="text-xl font-semibold text-foreground mb-2">No experiences match</p>
                        <p className="text-muted-foreground">Try adjusting the filters above</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* The card owns its own entrance + hover motion now. It used to
                        be wrapped in a second motion.div animating the same y, so
                        every card translated 40px instead of 20. */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {paginatedExperiences.map((exp, index) => (
                            <ExperienceCard
                                key={exp._id?.toString() || index}
                                index={index}
                                role={exp.role}
                                ctc={exp.ctc}
                                studentName={exp.studentName}
                                courseBranch={exp.courseBranch}
                                batch={exp.batch}
                                year={exp.year}
                                roleType={exp.roleType}
                                placementType={exp.placementType}
                                finalVerdict={exp.finalVerdict}
                                rounds={exp.rounds}
                                tags={exp.tags}
                                createdAt={exp.createdAt}
                                onOpen={() => openExperience(exp)}
                            />
                        ))}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-3 pt-4 border-t border-outline-variant">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 bg-surface-container border border-outline-variant rounded-lg text-sm font-medium text-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-container-high transition-colors"
                            >
                                Previous
                            </button>
                            <div className="flex items-center gap-2 px-4 py-2 bg-surface-container border border-outline-variant rounded-lg text-sm text-muted-foreground">
                                Page <span className="text-foreground font-medium">{currentPage}</span> of <span className="text-foreground font-medium">{totalPages}</span>
                            </div>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 bg-surface-container border border-outline-variant rounded-lg text-sm font-medium text-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-container-high transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Exactly one modal for the whole list */}
            <ExperienceModal
                isOpen={selectedExperience !== null}
                onClose={() => setSelectedExperience(null)}
                company={selectedExperience?.company ?? companyName}
                role={selectedExperience?.role ?? ''}
                ctc={selectedExperience?.ctc ?? 0}
                studentName={selectedExperience?.studentName}
                courseBranch={selectedExperience?.courseBranch}
                batch={selectedExperience?.batch}
                year={selectedExperience?.year}
                roleType={selectedExperience?.roleType}
                placementType={selectedExperience?.placementType}
                finalVerdict={selectedExperience?.finalVerdict}
                minCGPA={selectedExperience?.minCGPA}
                historyOfBacklogs={selectedExperience?.historyOfBacklogs}
                standingBacklogs={selectedExperience?.standingBacklogs}
                resumeShortlisting={selectedExperience?.resumeShortlisting}
                rounds={selectedExperience?.rounds}
                tags={selectedExperience?.tags}
                overallExperience={selectedExperience?.overallExperience}
                tipsForJuniors={selectedExperience?.tipsForJuniors}
            />
        </motion.div>
    );
}
