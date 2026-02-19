'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
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
} from 'lucide-react';

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
    experienceCount: number;
    createdAt: string;
}

type StatusFilter = 'ALL' | 'PENDING' | 'FLAGGED' | 'APPROVED' | 'REJECTED';

// ─── Status Badge Component ─────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
        PENDING: {
            bg: 'bg-amber-500/20 border-amber-500/30',
            text: 'text-amber-300',
            icon: <Clock className="h-3 w-3" />,
        },
        FLAGGED: {
            bg: 'bg-red-500/20 border-red-500/30',
            text: 'text-red-300',
            icon: <AlertTriangle className="h-3 w-3" />,
        },
        APPROVED: {
            bg: 'bg-emerald-500/20 border-emerald-500/30',
            text: 'text-emerald-300',
            icon: <CheckCircle2 className="h-3 w-3" />,
        },
        REJECTED: {
            bg: 'bg-rose-500/20 border-rose-500/30',
            text: 'text-rose-300',
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
    gradient,
    delay,
}: {
    title: string;
    value: number;
    icon: React.ReactNode;
    gradient: string;
    delay: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4 }}
            className={`relative overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-6`}
        >
            <div className={`absolute inset-0 opacity-10 bg-gradient-to-br ${gradient}`} />
            <div className="relative flex items-center justify-between">
                <div>
                    <p className="text-sm text-white/60 font-medium">{title}</p>
                    <p className="text-3xl font-bold text-white mt-1">{value}</p>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient}`}>
                    {icon}
                </div>
            </div>
        </motion.div>
    );
}

import { ReviewModal } from '@/components/admin/ReviewModal';

// ─── Main Admin Dashboard ───────────────────────────────────────────────────
export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, flagged: 0, approved: 0, rejected: 0 });
    const [experiences, setExperiences] = useState<Experience[]>([]);
    const [logs, setLogs] = useState<AdminLogEntry[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [filter, setFilter] = useState<StatusFilter>('ALL');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'table' | 'logs' | 'companies'>('table');
    const [reviewExperience, setReviewExperience] = useState<Experience | null>(null);

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

    const refreshAll = useCallback(async () => {
        setLoading(true);
        await Promise.all([fetchStats(), fetchExperiences(), fetchLogs(), fetchCompanies()]);
        setLoading(false);
    }, [fetchStats, fetchExperiences, fetchLogs, fetchCompanies]);

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
            <div className="min-h-screen bg-black bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
                                <Shield className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold">Admin Dashboard</h1>
                                <p className="text-sm text-white/50">Content Moderation & Management</p>
                            </div>
                        </div>
                        <button
                            onClick={refreshAll}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg transition-all text-sm"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </motion.div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <StatCard title="Total Experiences" value={stats.total} icon={<BarChart3 className="h-5 w-5 text-white" />} gradient="from-blue-500 to-cyan-500" delay={0} />
                        <StatCard title="Pending Review" value={stats.pending} icon={<Clock className="h-5 w-5 text-white" />} gradient="from-amber-500 to-orange-500" delay={0.1} />
                        <StatCard title="Flagged Items" value={stats.flagged} icon={<AlertTriangle className="h-5 w-5 text-white" />} gradient="from-red-500 to-rose-500" delay={0.2} />
                        <StatCard title="Approved" value={stats.approved} icon={<CheckCircle2 className="h-5 w-5 text-white" />} gradient="from-emerald-500 to-green-500" delay={0.3} />
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex items-center gap-2 mb-6">
                        <button
                            onClick={() => setActiveTab('table')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'table'
                                ? 'bg-purple-500/20 border border-purple-500/30 text-purple-300'
                                : 'bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            <Filter className="h-4 w-4" />
                            Experiences
                        </button>
                        <button
                            onClick={() => setActiveTab('logs')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'logs'
                                ? 'bg-purple-500/20 border border-purple-500/30 text-purple-300'
                                : 'bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            <Activity className="h-4 w-4" />
                            Activity Logs
                        </button>
                        <button
                            onClick={() => setActiveTab('companies')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'companies'
                                ? 'bg-purple-500/20 border border-purple-500/30 text-purple-300'
                                : 'bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            <Building2 className="h-4 w-4" />
                            Companies
                        </button>
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
                                            ? 'bg-white/15 text-white border border-white/20'
                                            : 'bg-white/5 text-white/50 border border-white/5 hover:bg-white/10 hover:text-white/80'
                                            }`}
                                    >
                                        {f.label} ({f.count})
                                    </button>
                                ))}
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">Date</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">Student</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">Company</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">Status</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">AI Reason</th>
                                            <th className="text-right px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {experiences.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-12 text-center text-white/40">
                                                    {loading ? 'Loading...' : 'No experiences found'}
                                                </td>
                                            </tr>
                                        ) : (
                                            experiences.map((exp) => (
                                                <tr key={exp._id} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-4 py-3 text-sm text-white/70 whitespace-nowrap">
                                                        {new Date(exp.createdAt).toLocaleDateString('en-IN', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric',
                                                        })}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-white font-medium">
                                                        {exp.studentName || exp.studentId || 'Anonymous'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-white/80">
                                                        {exp.company}
                                                        <span className="block text-xs text-white/40">{exp.role}</span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <StatusBadge status={exp.status || 'PENDING'} />
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-white/50 max-w-[200px] truncate">
                                                        {exp.moderationReason || '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {exp.status === 'FLAGGED' && (
                                                                <button
                                                                    onClick={() => setReviewExperience(exp)}
                                                                    className="px-2.5 py-1 text-xs font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-md transition-all flex items-center gap-1"
                                                                >
                                                                    <Shield className="h-3 w-3" />
                                                                    Review
                                                                </button>
                                                            )}
                                                            {exp.status !== 'APPROVED' && exp.status !== 'FLAGGED' && (
                                                                <button
                                                                    onClick={() => handleAction(exp._id, 'APPROVE')}
                                                                    disabled={actionLoading === exp._id}
                                                                    className="px-2.5 py-1 text-xs font-medium bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-md transition-all disabled:opacity-50"
                                                                >
                                                                    Approve
                                                                </button>
                                                            )}
                                                            {exp.status !== 'REJECTED' && exp.status !== 'FLAGGED' && (
                                                                <button
                                                                    onClick={() => handleAction(exp._id, 'REJECT')}
                                                                    disabled={actionLoading === exp._id}
                                                                    className="px-2.5 py-1 text-xs font-medium bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-md transition-all disabled:opacity-50"
                                                                >
                                                                    Reject
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleDelete(exp._id)}
                                                                disabled={actionLoading === exp._id}
                                                                className="p-1.5 text-red-400/70 hover:text-red-300 hover:bg-red-500/20 rounded-md transition-all disabled:opacity-50"
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
                            </div>
                        </motion.div>
                    )}

                    {/* ── Activity Logs Tab ──────────────────────────────────── */}
                    {activeTab === 'logs' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden"
                        >
                            <div className="px-4 py-3 border-b border-white/10">
                                <h3 className="text-sm font-semibold text-white/80">Recent Activity</h3>
                            </div>
                            <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                                {logs.length === 0 ? (
                                    <div className="px-4 py-12 text-center text-white/40">
                                        {loading ? 'Loading...' : 'No activity logs yet'}
                                    </div>
                                ) : (
                                    logs.map((log) => (
                                        <div key={log._id} className="px-4 py-3 flex items-start gap-3 hover:bg-white/5 transition-colors">
                                            <div className={`mt-0.5 p-1.5 rounded-lg ${log.action === 'APPROVE'
                                                ? 'bg-emerald-500/20 text-emerald-300'
                                                : log.action === 'REJECT'
                                                    ? 'bg-rose-500/20 text-rose-300'
                                                    : log.action === 'DELETE'
                                                        ? 'bg-red-500/20 text-red-300'
                                                        : 'bg-white/10 text-white/60'
                                                }`}>
                                                {log.action === 'APPROVE' && <CheckCircle2 className="h-3.5 w-3.5" />}
                                                {log.action === 'REJECT' && <XCircle className="h-3.5 w-3.5" />}
                                                {log.action === 'DELETE' && <Trash2 className="h-3.5 w-3.5" />}
                                                {!['APPROVE', 'REJECT', 'DELETE'].includes(log.action) && <Activity className="h-3.5 w-3.5" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-white/80">
                                                    <span className="font-medium text-white">{log.adminId}</span>
                                                    {' '}
                                                    <span className={`font-semibold ${log.action === 'APPROVE' ? 'text-emerald-400' :
                                                        log.action === 'REJECT' ? 'text-rose-400' :
                                                            log.action === 'DELETE' ? 'text-red-400' : 'text-white/60'
                                                        }`}>
                                                        {log.action.toLowerCase()}d
                                                    </span>
                                                    {' '}an experience
                                                </p>
                                                <p className="text-xs text-white/50 mt-0.5 truncate">
                                                    {log.details}
                                                    {log.rollNumber && (
                                                        <span className="ml-2 text-white/30 font-mono">
                                                            (Student ID: {log.rollNumber})
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                            <span className="text-xs text-white/30 whitespace-nowrap">
                                                {new Date(log.timestamp).toLocaleString('en-IN', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* ── Companies Tab ──────────────────────────────────────── */}
                    {activeTab === 'companies' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-4"
                        >
                            <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">Company Name</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">Experiences</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">Aliases</th>
                                            <th className="text-right px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider">First Seen</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {companies.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-12 text-center text-white/40">
                                                    {loading ? 'Loading...' : 'No companies found'}
                                                </td>
                                            </tr>
                                        ) : (
                                            companies.map((company) => (
                                                <tr key={company._id} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-4 py-3 text-sm text-white font-medium flex items-center gap-2">
                                                        <div className="p-1.5 bg-blue-500/10 rounded-lg">
                                                            <Building2 className="h-4 w-4 text-blue-400" />
                                                        </div>
                                                        {company.name}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white/80 border border-white/10">
                                                            {company.experienceCount}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-white/50">
                                                        {company.aliases.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {company.aliases.map((alias, i) => (
                                                                    <span key={i} className="px-1.5 py-0.5 bg-white/5 rounded border border-white/5">
                                                                        {alias}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            '—'
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-xs text-white/40 font-mono">
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
