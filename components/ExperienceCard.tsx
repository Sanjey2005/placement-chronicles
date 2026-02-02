'use client';

import { useState } from 'react';
import GlassCard from './GlassCard';
import { Building2, Briefcase, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Round {
    roundNumber: number;
    roundType: string;
    questions: string[];
    description?: string | null;
    duration?: string | null;
}

interface ExperienceCardProps {
    company: string;
    role: string;
    ctc: number;
    rounds?: Round[];
    tags?: string[];
    year?: number;
}

export default function ExperienceCard({
    company,
    role,
    ctc,
    rounds = [],
    tags = [],
    year,
}: ExperienceCardProps) {
    const [expanded, setExpanded] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <GlassCard
                className="p-6 hover relative group overflow-hidden"
            >
                {/* Animated gradient border on hover */}
                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 blur-xl opacity-50" />
                </div>

                <div className="relative z-10">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                            <h3 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                                <Building2 className="h-6 w-6 text-blue-400" />
                                {company}
                            </h3>
                            <p className="text-white/80 flex items-center gap-2">
                                <Briefcase className="h-4 w-4" />
                                {role}
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="flex items-center gap-1 text-green-400 font-semibold text-xl">
                                <DollarSign className="h-5 w-5" />
                                {ctc} LPA
                            </div>
                            {year && <p className="text-sm text-white/60">{year}</p>}
                        </div>
                    </div>

                    {/* Tags */}
                    {tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                            {tags.map((tag, idx) => (
                                <span
                                    key={idx}
                                    className="px-3 py-1 text-xs font-medium rounded-full bg-white/10 text-white/90 border border-white/20"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Round Count */}
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-white/70">
                            {rounds.length} interview round{rounds.length !== 1 ? 's' : ''}
                        </p>
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                        >
                            {expanded ? (
                                <>
                                    Hide Details <ChevronUp className="h-4 w-4" />
                                </>
                            ) : (
                                <>
                                    View Details <ChevronDown className="h-4 w-4" />
                                </>
                            )}
                        </button>
                    </div>

                    {/* Expanded Details */}
                    <AnimatePresence>
                        {expanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden"
                            >
                                <div className="mt-4 pt-4 border-t border-white/20 space-y-4">
                                    {rounds.map((round, idx) => (
                                        <div key={idx} className="space-y-2">
                                            <h4 className="font-semibold text-white flex items-center gap-2">
                                                <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs px-2 py-1 rounded">
                                                    Round {round.roundNumber}
                                                </span>
                                                {round.roundType}
                                            </h4>
                                            {round.description && (
                                                <p className="text-sm text-white/70 italic">{round.description}</p>
                                            )}
                                            {round.duration && (
                                                <p className="text-xs text-white/60">Duration: {round.duration}</p>
                                            )}
                                            {round.questions.length > 0 && (
                                                <ul className="space-y-1 ml-4">
                                                    {round.questions.map((question, qIdx) => (
                                                        <li key={qIdx} className="text-sm text-white/80 list-disc">
                                                            {question}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </GlassCard>
        </motion.div>
    );
}
