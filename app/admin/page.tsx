'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
    BarChart3,
    Clock,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Trash2,
    Shield,
    Activity,
    RefreshCw,
    Filter,
    Building2,
    User,
    Sparkles,
    Pencil,
    Check,
    X,
    MessageSquare,
    Eye,
    EyeOff,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ─── Types ──────────────────────────────────────────────────────────────────
interface Stats {
    total: number;
    pending: number;
    flagged: number;
    approved: number;
    rejected: number;
}

interface Experience {
    _id: string;
    studentName?: string;
    studentId: string;
    company: string;
    role: string;
    ctc: number;
    batch?: string;
    status: string;
    moderationReason?: string;
    createdAt: string;
}

interface AdminLogEntry {
    _id: string;
    action: string;
    adminId: string;
    targetId: string;
    details?: string;
    rollNumber?: string;
    timestamp: string;
}

interface Company {
    _id: string;
    name: string;
    aliases: string[];
    link: string;
    isHidden: boolean;
    experienceCount: number;
    createdAt: string;
}

type StatusFilter = 'ALL' | 'PENDING' | 'FLAGGED' | 'APPROVED' | 'REJECTED';
type CompaniesFilter = 'ALL' | 'HAS_LINK' | 'MISSING_LINK';

// ─── Status Badge Component ─────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
        PENDING: {
            bg: 'bg-secondary border-transparent',
            text: 'text-secondary-foreground',
            icon: <Clock className="h-3 w-3" />,
        },
        FLAGGED: {
            bg: 'bg-error-container border-transparent',
            text: 'text-on-error-container',
            icon: <AlertTriangle className="h-3 w-3" />,
        },
        APPROVED: {
            bg: 'bg-success-container border-transparent',
            text: 'text-on-success-container',
            icon: <CheckCircle2 className="h-3 w-3" />,
        },
        REJECTED: {
            bg: 'bg-error-container border-transparent',
            text: 'text-on-error-container',
            icon: <XCircle className="h-3 w-3" />,
        },
    };

    const c = config[status] || config.PENDING;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${c.bg} ${c.text}`}>
            {c.icon}
            {status}
        </span>
    );
}

// ─── Stat Card Component ────────────────────────────────────────────────────
function StatCard({
    title,
    value,
    icon,
    delay,
}: {
    title: string;
    value: number;
    icon: React.ReactNode;
    delay: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4 }}
            className="rounded-xl border border-outline-variant bg-surface-container p-6"
        >
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-muted-foreground font-medium">{title}</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
                </div>
                <div className="p-3 rounded-xl bg-surface-container-high text-muted-foreground">
                    {icon}
                </div>
            </div>
        </motion.div>
    );
}

// ─── Pagination Component ───────────────────────────────────────────────────
function PaginationControls({
    currentPage,
    totalPages,
    onPageChange,
    totalItems,
    itemName,
}: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalItems: number;
    itemName: string;
}) {
    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant bg-surface-container rounded-b-xl">
            <div className="text-sm text-muted-foreground">
                Showing <span className="text-foreground font-medium">total {totalItems}</span> {itemName}
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-xs font-medium bg-surface-container hover:bg-surface-container-high border border-outline-variant rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    Previous
                </button>
                <div className="text-sm text-muted-foreground">
                    Page <span className="text-foreground">{currentPage}</span> of <span className="text-foreground">{totalPages}</span>
                </div>
                <button
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-xs font-medium bg-surface-container hover:bg-surface-container-high border border-outline-variant rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    Next
                </button>
            </div>
        </div>
    );
}

import { ReviewModal } from '@/components/admin/ReviewModal';

// ─── Main Admin Dashboard ───────────────────────────────────────────────────
// ... (previous interfaces)

interface Feedback {
    _id: string;
    studentId: string;
    message: string;
    createdAt: string;
}

// ... (other code)

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, flagged: 0, approved: 0, rejected: 0 });
    const [experiences, setExperiences] = useState<Experience[]>([]);
    const [logs, setLogs] = useState<AdminLogEntry[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]); // New state
    const [filter, setFilter] = useState<StatusFilter>('ALL');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'table' | 'logs' | 'companies' | 'feedbacks'>('table');
    const [reviewExperience, setReviewExperience] = useState<Experience | null>(null);
    const [cleanupLoading, setCleanupLoading] = useState(false);
    const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
    const [editLinkValue, setEditLinkValue] = useState('');

    // Pagination & Filter States
    const [experiencesPage, setExperiencesPage] = useState(1);
    const [logsPage, setLogsPage] = useState(1);
    const [logsFilter, setLogsFilter] = useState('ALL');
    const [companiesPage, setCompaniesPage] = useState(1);
    const [companiesSearch, setCompaniesSearch] = useState('');
    const [companiesFilter, setCompaniesFilter] = useState<CompaniesFilter>('ALL');
    const [feedbacksPage, setFeedbacksPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    // Derived State Computations
    const paginatedExperiences = useMemo(() => {
        return experiences.slice((experiencesPage - 1) * ITEMS_PER_PAGE, experiencesPage * ITEMS_PER_PAGE);
    }, [experiences, experiencesPage]);

    const filteredLogs = useMemo(() => {
        if (logsFilter === 'ALL') return logs;
        return logs.filter(l => l.action === logsFilter);
    }, [logs, logsFilter]);

    const paginatedLogs = useMemo(() => {
        return filteredLogs.slice((logsPage - 1) * ITEMS_PER_PAGE, logsPage * ITEMS_PER_PAGE);
    }, [filteredLogs, logsPage]);

    const filteredCompanies = useMemo(() => {
        let result = companies;
        if (companiesFilter === 'HAS_LINK') result = result.filter(c => !!c.link);
        if (companiesFilter === 'MISSING_LINK') result = result.filter(c => !c.link);
        if (companiesSearch) {
            const searchLower = companiesSearch.toLowerCase();
            result = result.filter(c =>
                c.name.toLowerCase().includes(searchLower) ||
                c.aliases.some(a => a.toLowerCase().includes(searchLower))
            );
        }
        return result;
    }, [companies, companiesFilter, companiesSearch]);

    const paginatedCompanies = useMemo(() => {
        return filteredCompanies.slice((companiesPage - 1) * ITEMS_PER_PAGE, companiesPage * ITEMS_PER_PAGE);
    }, [filteredCompanies, companiesPage]);

    const paginatedFeedbacks = useMemo(() => {
        return feedbacks.slice((feedbacksPage - 1) * ITEMS_PER_PAGE, feedbacksPage * ITEMS_PER_PAGE);
    }, [feedbacks, feedbacksPage]);

    // Reset pages on filter change
    useEffect(() => setExperiencesPage(1), [filter]);
    useEffect(() => setLogsPage(1), [logsFilter]);
    useEffect(() => setCompaniesPage(1), [companiesFilter, companiesSearch]);

    // ── Data Fetching ───────────────────────────────────────────────────
    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/stats');
            const data = await res.json();
            if (data.success) setStats(data.data);
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        }
    }, []);

    const fetchExperiences = useCallback(async () => {
        try {
            const res = await fetch(`/api/admin/experiences?status=${filter}`);
            const data = await res.json();
            if (data.success) setExperiences(data.data);
        } catch (err) {
            console.error('Failed to fetch experiences:', err);
        }
    }, [filter]);

    const fetchLogs = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/logs');
            const data = await res.json();
            if (data.success) setLogs(data.data);
        } catch (err) {
            console.error('Failed to fetch logs:', err);
        }
    }, []);

    const fetchCompanies = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/companies');
            const data = await res.json();
            if (data.success) setCompanies(data.data);
        } catch (err) {
            console.error('Failed to fetch companies:', err);
        }
    }, []);

    const fetchFeedbacks = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/feedbacks');
            const data = await res.json();
            if (data.success) setFeedbacks(data.data);
        } catch (err) {
            console.error('Failed to fetch feedbacks:', err);
        }
    }, []);

    const refreshAll = useCallback(async () => {
        setLoading(true);
        await Promise.all([fetchStats(), fetchExperiences(), fetchLogs(), fetchCompanies(), fetchFeedbacks()]);
        setLoading(false);
    }, [fetchStats, fetchExperiences, fetchLogs, fetchCompanies, fetchFeedbacks]);

    useEffect(() => {
        refreshAll();
    }, [refreshAll]);

    useEffect(() => {
        fetchExperiences();
    }, [filter, fetchExperiences]);

    // ── Admin Actions ───────────────────────────────────────────────────
    const handleAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
        setActionLoading(id);
        try {
            const res = await fetch('/api/admin/experiences', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(`Experience ${action.toLowerCase()}d successfully`);
                await refreshAll();
            } else {
                toast.error(data.error || 'Action failed');
            }
        } catch {
            toast.error('Failed to perform action');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to permanently delete this experience?')) return;

        setActionLoading(id);
        try {
            const res = await fetch(`/api/admin/experiences?id=${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                toast.success('Experience deleted successfully');
                await refreshAll();
            } else {
                toast.error(data.error || 'Delete failed');
            }
        } catch {
            toast.error('Failed to delete experience');
        } finally {
            setActionLoading(null);
        }
    };

    // ── Clean Companies ──────────────────────────────────────────────
    const handleCleanup = async () => {
        if (!confirm('This will merge duplicate company names and remove orphaned entries. Continue?')) return;

        setCleanupLoading(true);
        try {
            const res = await fetch('/api/admin/companies/cleanup', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                const msg = data.message || 'Cleanup complete';
                toast.success(msg, { duration: 5000 });
                if (data.data?.merges?.length > 0) {
                    const mergeList = data.data.merges.map((m: { from: string; to: string; source: 'local' | 'ai' }) => `${m.from} → ${m.to} [${m.source === 'local' ? 'Local' : 'AI'}]`).join(', ');
                    toast.info(`Merged: ${mergeList}`, { duration: 7000 });
                }
                await refreshAll();
            } else {
                toast.error(data.error || 'Cleanup failed');
            }
        } catch {
            toast.error('Failed to clean companies');
        } finally {
            setCleanupLoading(false);
        }
    };

    // ── Edit Company Link ───────────────────────────────────────────
    const handleSaveLink = async (companyId: string) => {
        try {
            const res = await fetch('/api/admin/companies', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ companyId, link: editLinkValue }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Company link updated successfully');
                await fetchCompanies();
            } else {
                toast.error(data.error || 'Failed to update link');
            }
        } catch {
            toast.error('Failed to update company link');
        } finally {
            setEditingLinkId(null);
            setEditLinkValue('');
        }
    };

    // ── Toggle Company Visibility ───────────────────────────────────
    const handleToggleVisibility = async (companyId: string, currentlyHidden: boolean) => {
        try {
            const res = await fetch('/api/admin/companies', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ companyId, isHidden: !currentlyHidden }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(currentlyHidden ? 'Company is now visible on home page' : 'Company hidden from home page');
                await fetchCompanies();
            } else {
                toast.error(data.error || 'Failed to update visibility');
            }
        } catch {
            toast.error('Failed to toggle company visibility');
        }
    };

    // ── Filter Tabs ─────────────────────────────────────────────────────
    const filters: { label: string; value: StatusFilter; count: number }[] = [
        { label: 'All', value: 'ALL', count: stats.total },
        { label: 'Pending', value: 'PENDING', count: stats.pending },
        { label: 'Flagged', value: 'FLAGGED', count: stats.flagged },
        { label: 'Approved', value: 'APPROVED', count: stats.approved },
        { label: 'Rejected', value: 'REJECTED', count: stats.rejected },
    ];

    return (
        <>
            <Navbar />
            <div className="min-h-screen bg-background text-foreground">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4"
                    >
                        <div className="flex items-center gap-3">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold">Admin Dashboard</h1>
                                <p className="text-sm text-muted-foreground">Content Moderation & Management</p>
                            </div>
                        </div>
                        <button
                            onClick={refreshAll}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-surface-container hover:bg-surface-container-high border border-outline-variant rounded-lg transition-all text-sm"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </motion.div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <StatCard title="Total Experiences" value={stats.total} icon={<BarChart3 className="h-5 w-5" />} delay={0} />
                        <StatCard title="Pending Review" value={stats.pending} icon={<Clock className="h-5 w-5" />} delay={0.1} />
                        <StatCard title="Flagged Items" value={stats.flagged} icon={<AlertTriangle className="h-5 w-5" />} delay={0.2} />
                        <StatCard title="Approved" value={stats.approved} icon={<CheckCircle2 className="h-5 w-5" />} delay={0.3} />
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex flex-wrap items-center gap-2 mb-6">
                        <button
                            onClick={() => setActiveTab('table')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'table'
                                ? 'bg-primary-fixed border border-outline-variant text-primary'
                                : 'bg-surface-container border border-outline-variant text-muted-foreground hover:text-foreground hover:bg-surface-container-high'
                                }`}
                        >
                            <Filter className="h-4 w-4" />
                            Experiences
                        </button>
                        <button
                            onClick={() => setActiveTab('logs')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'logs'
                                ? 'bg-primary-fixed border border-outline-variant text-primary'
                                : 'bg-surface-container border border-outline-variant text-muted-foreground hover:text-foreground hover:bg-surface-container-high'
                                }`}
                        >
                            <Activity className="h-4 w-4" />
                            Activity Logs
                        </button>
                        <button
                            onClick={() => setActiveTab('companies')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'companies'
                                ? 'bg-primary-fixed border border-outline-variant text-primary'
                                : 'bg-surface-container border border-outline-variant text-muted-foreground hover:text-foreground hover:bg-surface-container-high'
                                }`}
                        >
                            <Building2 className="h-4 w-4" />
                            Companies
                        </button>
                        <button
                            onClick={() => setActiveTab('feedbacks')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'feedbacks'
                                ? 'bg-primary-fixed border border-outline-variant text-primary'
                                : 'bg-surface-container border border-outline-variant text-muted-foreground hover:text-foreground hover:bg-surface-container-high'
                                }`}
                        >
                            <MessageSquare className="h-4 w-4" />
                            Feedbacks
                        </button>
                        <Link
                            href="/admin/analytics"
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all bg-surface-container border border-outline-variant text-muted-foreground hover:text-foreground hover:bg-surface-container-high"
                        >
                            <BarChart3 className="h-4 w-4" />
                            Analytics
                        </Link>
                    </div>

                    {/* ── Experiences Table Tab ──────────────────────────────── */}
                    {activeTab === 'table' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-4"
                        >
                            {/* Filter Tabs */}
                            <div className="flex flex-wrap gap-2">
                                {filters.map((f) => (
                                    <button
                                        key={f.value}
                                        onClick={() => setFilter(f.value)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f.value
                                            ? 'bg-surface-container text-foreground border border-outline-variant'
                                            : 'bg-surface-container text-muted-foreground border border-outline-variant hover:bg-surface-container-high hover:text-muted-foreground'
                                            }`}
                                    >
                                        {f.label} ({f.count})
                                    </button>
                                ))}
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface-container">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-outline-variant">
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">AI Reason</th>
                                            <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-outline-variant">
                                        {paginatedExperiences.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-12 text-center text-outline">
                                                    {loading ? 'Loading...' : 'No experiences found'}
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedExperiences.map((exp: Experience) => (
                                                <tr key={exp._id} className="hover:bg-surface-container-high transition-colors">
                                                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                                                        {new Date(exp.createdAt).toLocaleDateString('en-IN', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric',
                                                        })}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-foreground font-medium">
                                                        {exp.studentName || exp.studentId || 'Anonymous'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-muted-foreground">
                                                        {exp.company}
                                                        <span className="block text-xs text-outline">{exp.role}</span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <StatusBadge status={exp.status || 'PENDING'} />
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                                                        {exp.moderationReason || '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                                                            {exp.status === 'FLAGGED' && (
                                                                <button
                                                                    onClick={() => setReviewExperience(exp)}
                                                                    className="px-2.5 py-1 text-xs font-medium bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-transparent rounded-md transition-all flex items-center gap-1"
                                                                >
                                                                    <Shield className="h-3 w-3" />
                                                                    Review
                                                                </button>
                                                            )}
                                                            {exp.status !== 'APPROVED' && exp.status !== 'FLAGGED' && (
                                                                <button
                                                                    onClick={() => handleAction(exp._id, 'APPROVE')}
                                                                    disabled={actionLoading === exp._id}
                                                                    className="px-2.5 py-1 text-xs font-medium bg-success-container hover:bg-success-container/70 text-on-success-container border border-transparent rounded-md transition-all disabled:opacity-50"
                                                                >
                                                                    Approve
                                                                </button>
                                                            )}
                                                            {exp.status !== 'REJECTED' && exp.status !== 'FLAGGED' && (
                                                                <button
                                                                    onClick={() => handleAction(exp._id, 'REJECT')}
                                                                    disabled={actionLoading === exp._id}
                                                                    className="px-2.5 py-1 text-xs font-medium bg-error-container hover:bg-error-container/70 text-on-error-container border border-transparent rounded-md transition-all disabled:opacity-50"
                                                                >
                                                                    Reject
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleDelete(exp._id)}
                                                                disabled={actionLoading === exp._id}
                                                                className="p-1.5 text-on-error-container/70 hover:text-on-error-container hover:bg-error-container/70 rounded-md transition-all disabled:opacity-50"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                                <PaginationControls
                                    currentPage={experiencesPage}
                                    totalPages={Math.ceil(experiences.length / ITEMS_PER_PAGE)}
                                    onPageChange={setExperiencesPage}
                                    totalItems={experiences.length}
                                    itemName="experiences"
                                />
                            </div>
                        </motion.div>
                    )}

                    {/* ── Activity Logs Tab ──────────────────────────────────── */}
                    {activeTab === 'logs' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="rounded-xl border border-outline-variant bg-surface-container overflow-hidden"
                        >
                            <div className="px-4 py-3 border-b border-outline-variant flex items-center justify-between">
                                <Select value={logsFilter} onValueChange={setLogsFilter}>
                                    <SelectTrigger className="w-[140px] h-8 bg-surface-container border border-outline-variant rounded-md px-3 text-xs text-foreground focus:ring-ring/30">
                                        <SelectValue placeholder="All Actions" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-outline-variant text-foreground">
                                        <SelectItem value="ALL" className="focus:bg-surface-container focus:text-foreground cursor-pointer text-xs">All Actions</SelectItem>
                                        <SelectItem value="APPROVE" className="focus:bg-surface-container focus:text-foreground cursor-pointer text-xs">Approved</SelectItem>
                                        <SelectItem value="AUTO_APPROVE" className="focus:bg-surface-container focus:text-foreground cursor-pointer text-xs">Auto Approved</SelectItem>
                                        <SelectItem value="REJECT" className="focus:bg-surface-container focus:text-foreground cursor-pointer text-xs">Rejected</SelectItem>
                                        <SelectItem value="FLAG" className="focus:bg-surface-container focus:text-foreground cursor-pointer text-xs">Flagged</SelectItem>
                                        <SelectItem value="DELETE" className="focus:bg-surface-container focus:text-foreground cursor-pointer text-xs">Deleted</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="divide-y divide-outline-variant max-h-[600px] overflow-y-auto">
                                {paginatedLogs.length === 0 ? (
                                    <div className="px-4 py-12 text-center text-outline">
                                        {loading ? 'Loading...' : 'No activity logs found'}
                                    </div>
                                ) : (
                                    paginatedLogs.map((log: AdminLogEntry) => (
                                        <div key={log._id} className="px-4 py-3 flex items-start gap-3 hover:bg-surface-container-high transition-colors">
                                            <div className={`mt-0.5 p-1.5 rounded-lg ${log.action === 'APPROVE' || log.action === 'AUTO_APPROVE'
                                                ? 'bg-success-container text-on-success-container'
                                                : log.action === 'REJECT'
                                                    ? 'bg-error-container text-on-error-container'
                                                    : log.action === 'DELETE'
                                                        ? 'bg-error-container text-on-error-container'
                                                        : log.action === 'FLAG'
                                                            ? 'bg-secondary text-secondary-foreground'
                                                            : 'bg-surface-container text-muted-foreground'
                                                }`}>
                                                {(log.action === 'APPROVE' || log.action === 'AUTO_APPROVE') && <CheckCircle2 className="h-3.5 w-3.5" />}
                                                {log.action === 'REJECT' && <XCircle className="h-3.5 w-3.5" />}
                                                {log.action === 'DELETE' && <Trash2 className="h-3.5 w-3.5" />}
                                                {log.action === 'FLAG' && <AlertTriangle className="h-3.5 w-3.5" />}
                                                {!['APPROVE', 'AUTO_APPROVE', 'REJECT', 'DELETE', 'FLAG'].includes(log.action) && <Activity className="h-3.5 w-3.5" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-muted-foreground">
                                                    <span className="font-medium text-foreground">{log.adminId}</span>
                                                    {' '}
                                                    <span className={`font-semibold ${log.action === 'APPROVE' || log.action === 'AUTO_APPROVE' ? 'text-on-success-container' :
                                                        log.action === 'REJECT' ? 'text-on-error-container' :
                                                            log.action === 'DELETE' ? 'text-on-error-container' :
                                                                log.action === 'FLAG' ? 'text-secondary-foreground' : 'text-muted-foreground'
                                                        }`}>
                                                        {log.action === 'AUTO_APPROVE' ? 'auto_approved' :
                                                            log.action === 'FLAG' ? 'flagged' :
                                                                `${log.action.toLowerCase()}d`}
                                                    </span>
                                                    {' '}an experience
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                                    {log.details}
                                                </p>
                                            </div>
                                            <span className="text-xs text-outline whitespace-nowrap">
                                                {new Date(log.timestamp).toLocaleString('en-IN', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: true,
                                                })}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                            <PaginationControls
                                currentPage={logsPage}
                                totalPages={Math.ceil(filteredLogs.length / ITEMS_PER_PAGE)}
                                onPageChange={setLogsPage}
                                totalItems={filteredLogs.length}
                                itemName="logs"
                            />
                        </motion.div>
                    )}

                    {/* ── Companies Tab ──────────────────────────────────────── */}
                    {activeTab === 'companies' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-4"
                        >
                            {/* Actions & Filters */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <input
                                        type="text"
                                        placeholder="Search companies..."
                                        value={companiesSearch}
                                        onChange={(e) => setCompaniesSearch(e.target.value)}
                                        className="bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary w-full sm:w-64 placeholder:text-outline"
                                    />
                                    <div className="w-[160px]">
                                        <Select value={companiesFilter} onValueChange={(val: CompaniesFilter) => setCompaniesFilter(val)}>
                                            <SelectTrigger className="w-full h-10 px-3 py-2 bg-surface-container border border-outline-variant rounded-lg text-sm text-foreground outline-none focus:ring-0">
                                                <SelectValue placeholder="All Links" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-card border-outline-variant text-foreground">
                                                <SelectItem value="ALL" className="focus:bg-surface-container focus:text-foreground cursor-pointer text-sm">All Links</SelectItem>
                                                <SelectItem value="HAS_LINK" className="focus:bg-surface-container focus:text-foreground cursor-pointer text-sm">Has Link</SelectItem>
                                                <SelectItem value="MISSING_LINK" className="focus:bg-surface-container focus:text-foreground cursor-pointer text-sm">Missing Link</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <button
                                    onClick={handleCleanup}
                                    disabled={cleanupLoading}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary-fixed hover:bg-primary-fixed-dim border border-outline-variant rounded-lg transition-all text-sm font-medium text-primary disabled:opacity-50 w-full sm:w-auto justify-center"
                                >
                                    <Sparkles className={`h-4 w-4 ${cleanupLoading ? 'animate-pulse' : ''}`} />
                                    {cleanupLoading ? 'Cleaning...' : 'Clean Companies'}
                                </button>
                            </div>
                            <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface-container">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-outline-variant">
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company Name</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Experiences</th>
                                            <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Visible</th>
                                            <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">First Seen</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-outline-variant">
                                        {paginatedCompanies.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-12 text-center text-outline">
                                                    {loading ? 'Loading...' : 'No companies found'}
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedCompanies.map((company: Company) => (
                                                <tr key={company._id} className="hover:bg-surface-container-high transition-colors">
                                                    <td className="px-4 py-3 text-sm text-foreground font-medium">
                                                        <div className="flex items-center gap-2">
                                                            {company.link ? (
                                                                <div className="w-8 h-8 flex-shrink-0 rounded-md bg-white flex items-center justify-center overflow-hidden border border-outline-variant">
                                                                    <img
                                                                        src={`https://www.google.com/s2/favicons?domain=${company.link}&sz=128`}
                                                                        alt={`${company.name} logo`}
                                                                        className="w-full h-full object-contain p-0.5"
                                                                        onError={(e) => {
                                                                            // Fallback to Building2 icon on error
                                                                            const target = e.currentTarget;
                                                                            target.style.display = 'none';
                                                                            const parent = target.parentElement;
                                                                            if (parent) {
                                                                                parent.classList.remove('bg-white');
                                                                                parent.classList.add('bg-primary-fixed');
                                                                                parent.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>';
                                                                            }
                                                                        }}
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="w-8 h-8 flex-shrink-0 p-1.5 bg-primary-fixed rounded-md flex items-center justify-center">
                                                                    <Building2 className="h-4 w-4 text-primary" />
                                                                </div>
                                                            )}
                                                            <div>
                                                                {company.name}
                                                                {editingLinkId === company._id ? (
                                                                    <div className="flex items-center gap-1.5 mt-1">
                                                                        <input
                                                                            type="text"
                                                                            className="bg-surface-container border border-outline-variant rounded px-2 py-0.5 text-xs text-foreground outline-none focus:border-primary w-32"
                                                                            value={editLinkValue}
                                                                            onChange={(e) => setEditLinkValue(e.target.value)}
                                                                            placeholder="domain.com"
                                                                            autoFocus
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') handleSaveLink(company._id);
                                                                                if (e.key === 'Escape') setEditingLinkId(null);
                                                                            }}
                                                                        />
                                                                        <button onClick={() => handleSaveLink(company._id)} className="p-1 hover:bg-success-container/70 text-on-success-container rounded transition-colors" title="Save">
                                                                            <Check className="h-3 w-3" />
                                                                        </button>
                                                                        <button onClick={() => setEditingLinkId(null)} className="p-1 hover:bg-error-container/70 text-on-error-container rounded transition-colors" title="Cancel">
                                                                            <X className="h-3 w-3" />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="group flex items-center gap-2 mt-0.5">
                                                                        {company.link ? (
                                                                            <span className="block text-xs text-outline font-normal">{company.link}</span>
                                                                        ) : (
                                                                            <span className="block text-xs text-muted-foreground font-normal italic">No domain set</span>
                                                                        )}
                                                                        <button
                                                                            onClick={() => { setEditingLinkId(company._id); setEditLinkValue(company.link || ''); }}
                                                                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-surface-container-high text-muted-foreground hover:text-foreground rounded transition-all"
                                                                            title="Edit Domain"
                                                                        >
                                                                            <Pencil className="h-3 w-3" />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-container text-muted-foreground border border-outline-variant">
                                                            {company.experienceCount}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            onClick={() => handleToggleVisibility(company._id, company.isHidden)}
                                                            title={company.isHidden ? 'Hidden from home page – click to show' : 'Visible on home page – click to hide'}
                                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${company.isHidden
                                                                    ? 'bg-error-container border-transparent text-on-error-container hover:bg-error-container/70'
                                                                    : 'bg-success-container border-transparent text-on-success-container hover:bg-success-container/70'
                                                                }`}
                                                        >
                                                            {company.isHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                                            {company.isHidden ? 'Hidden' : 'Visible'}
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-xs text-outline font-mono">
                                                        {new Date(company.createdAt).toLocaleDateString('en-IN', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric'
                                                        })}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                                <PaginationControls
                                    currentPage={companiesPage}
                                    totalPages={Math.ceil(filteredCompanies.length / ITEMS_PER_PAGE)}
                                    onPageChange={setCompaniesPage}
                                    totalItems={filteredCompanies.length}
                                    itemName="companies"
                                />
                            </div>
                        </motion.div>
                    )}

                    {/* ── Feedbacks Tab ──────────────────────────────────────── */}
                    {activeTab === 'feedbacks' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-4"
                        >
                            <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface-container">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-outline-variant">
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student ID</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Message</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-outline-variant">
                                        {paginatedFeedbacks.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="px-4 py-12 text-center text-outline">
                                                    {loading ? 'Loading...' : 'No feedbacks found'}
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedFeedbacks.map((feedback: Feedback) => (
                                                <tr key={feedback._id} className="hover:bg-surface-container-high transition-colors">
                                                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap align-top w-32">
                                                        {new Date(feedback.createdAt).toLocaleDateString('en-IN', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric',
                                                        })}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-foreground font-medium align-top w-40">
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container border border-outline-variant text-muted-foreground">
                                                            <User className="h-3 w-3" />
                                                            {feedback.studentId}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-pre-wrap">
                                                        {feedback.message}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                                <PaginationControls
                                    currentPage={feedbacksPage}
                                    totalPages={Math.ceil(feedbacks.length / ITEMS_PER_PAGE)}
                                    onPageChange={setFeedbacksPage}
                                    totalItems={feedbacks.length}
                                    itemName="feedbacks"
                                />
                            </div>
                        </motion.div>
                    )}
                </div>

                <ReviewModal
                    experience={reviewExperience}
                    isOpen={!!reviewExperience}
                    onClose={() => setReviewExperience(null)}
                    isLoading={!!actionLoading}
                    onApprove={(id) => {
                        handleAction(id, 'APPROVE');
                        setReviewExperience(null);
                    }}
                    onReject={(id) => {
                        handleAction(id, 'REJECT');
                        setReviewExperience(null);
                    }}
                />
            </div>
        </>
    );
}
