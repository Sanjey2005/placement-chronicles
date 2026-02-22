'use client';

import { UseFormReturn, useFieldArray } from 'react-hook-form';
import { ExperienceFormData } from '@/lib/schemas/experience-schema';
import { Trash2, Plus, X, Beaker, Code, Users, Link as LinkIcon, MessageSquare } from 'lucide-react';
import { useState } from 'react';

interface RoundCardProps {
    form: UseFormReturn<ExperienceFormData>;
    index: number;
    onRemove: () => void;
}

export default function RoundCard({ form, index, onRemove }: RoundCardProps) {
    const { register, watch, setValue, control, formState: { errors } } = form;
    const [isExpanded, setIsExpanded] = useState(true);

    const round = watch(`rounds.${index}`);
    const roundType = round?.type;

    // For interview questions
    const { fields: questionFields, append: appendQuestion, remove: removeQuestion } = useFieldArray({
        control,
        name: `rounds.${index}.questions` as any,
    });

    // Get round-specific icon and color
    const getRoundStyle = () => {
        switch (roundType) {
            case 'test':
                return { icon: Beaker, color: 'blue', label: 'Online Test' };
            case 'hackathon':
                return { icon: Code, color: 'purple', label: 'Hackathon' };
            case 'interview':
                return { icon: Users, color: 'green', label: 'Interview' };
            case 'gd':
                return { icon: MessageSquare, color: 'orange', label: 'Group Discussion' };
            default:
                return { icon: Users, color: 'gray', label: 'Round' };
        }
    };

    const { icon: Icon, color, label } = getRoundStyle();

    const roundError = errors.rounds?.[index];

    return (
        <div className={`border-2 border-${color}-500/30 bg-${color}-500/5 rounded-xl overflow-hidden`}>
            {/* Header */}
            <div
                className={`flex items-center justify-between p-4 bg-${color}-500/10 cursor-pointer`}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2 bg-${color}-600/20 rounded-lg`}>
                        <Icon className={`h-5 w-5 text-${color}-400`} />
                    </div>
                    <div>
                        <h3 className="text-white font-semibold">Round {index + 1}: {label}</h3>
                        <p className="text-xs text-white/60">Click to {isExpanded ? 'collapse' : 'expand'}</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 transition-all"
                >
                    <Trash2 className="h-5 w-5" />
                </button>
            </div>

            {/* Content */}
            {isExpanded && (
                <div className="p-4 space-y-4">
                    {/* ONLINE TEST FIELDS */}
                    {roundType === 'test' && (
                        <>
                            {/* Topics */}
                            <div>
                                <label className="text-white font-semibold mb-2 block">
                                    Topics Covered <span className="text-red-400">*</span>
                                </label>
                                <input
                                    {...register(`rounds.${index}.topics` as const)}
                                    type="text"
                                    placeholder="DSA, OS, DBMS, Networking"
                                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                {roundError && 'topics' in roundError && (
                                    <p className="mt-1 text-sm text-red-400">{(roundError as any).topics?.message || "Topics are required"}</p>
                                )}
                                <p className="mt-1 text-xs text-white/40">List the topics covered in this test</p>
                            </div>

                            {/* Study Sources */}
                            <div>
                                <label className="text-white font-semibold mb-2 block">
                                    Study Sources
                                </label>
                                <input
                                    {...register(`rounds.${index}.studySources` as const)}
                                    type="text"
                                    placeholder="LeetCode, GeeksforGeeks, Striver's SDE Sheet"
                                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="mt-1 text-xs text-white/40">Optional: Books, websites, or resources that helped</p>
                            </div>
                        </>
                    )}

                    {/* HACKATHON FIELDS */}
                    {roundType === 'hackathon' && (
                        <>
                            {/* Experience/Strategy */}
                            <div>
                                <label className="text-white font-semibold mb-2 block">
                                    Your Strategy & Approach <span className="text-red-400">*</span>
                                </label>
                                <textarea
                                    {...register(`rounds.${index}.strategy` as const)}
                                    rows={4}
                                    placeholder="Describe your approach, team dynamics, challenges faced..."
                                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                                />
                                {roundError && 'strategy' in roundError && (
                                    <p className="mt-1 text-sm text-red-400">{(roundError as any).strategy?.message}</p>
                                )}
                            </div>

                            {/* Problem Statement */}
                            <div>
                                <label className="text-white font-semibold mb-2 block">
                                    Problem Statement <span className="text-red-400">*</span>
                                </label>
                                <textarea
                                    {...register(`rounds.${index}.problemStatement` as const)}
                                    rows={4}
                                    placeholder="Describe the problem statement you had to solve..."
                                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                                />
                                {roundError && 'problemStatement' in roundError && (
                                    <p className="mt-1 text-sm text-red-400">{(roundError as any).problemStatement?.message}</p>
                                )}
                            </div>
                        </>
                    )}

                    {/* INTERVIEW FIELDS */}
                    {roundType === 'interview' && (
                        <>
                            {/* Interview Type */}
                            <div>
                                <label className="text-white font-semibold mb-2 block">
                                    Interview Type
                                </label>
                                <select
                                    {...register(`rounds.${index}.interviewType` as const)}
                                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                >
                                    <option value="technical" className="bg-slate-900">Technical</option>
                                    <option value="hr" className="bg-slate-900">HR</option>
                                    <option value="managerial" className="bg-slate-900">Managerial</option>
                                    <option value="mixed" className="bg-slate-900">Mixed</option>
                                </select>
                            </div>

                            {/* Duration */}
                            <div>
                                <label className="text-white font-semibold mb-2 block">
                                    Duration (Optional)
                                </label>
                                <input
                                    {...register(`rounds.${index}.duration` as const)}
                                    type="text"
                                    placeholder="e.g., 45 minutes"
                                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                            </div>

                            {/* Questions */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-white font-semibold">
                                        Questions <span className="text-white/40 text-sm font-normal">(Optional if Notes provided)</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => appendQuestion({ question: '', answerTip: '' })}
                                        className="flex items-center gap-1 px-3 py-1 bg-green-600/20 border border-green-500/50 hover:bg-green-600/30 text-green-300 rounded-lg text-sm transition-all"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add Question
                                    </button>
                                </div>

                                {questionFields.length === 0 ? (
                                    <p className="text-white/60 text-sm mb-2">No questions added yet.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {questionFields.map((field, qIndex) => (
                                            <div key={field.id} className="p-3 bg-white/5 border border-white/10 rounded-lg space-y-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1">
                                                        <label className="text-xs text-white/70 mb-1 block">Question {qIndex + 1}</label>
                                                        <input
                                                            {...register(`rounds.${index}.questions.${qIndex}.question` as const)}
                                                            type="text"
                                                            placeholder="What was the question asked?"
                                                            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-green-500"
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeQuestion(qIndex)}
                                                        className="p-1 hover:bg-red-500/20 rounded text-red-400"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-white/70 mb-1 block">Your Answer/Tip</label>
                                                    <textarea
                                                        {...register(`rounds.${index}.questions.${qIndex}.answerTip` as const)}
                                                        rows={2}
                                                        placeholder="How did you answer? What should others know?"
                                                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {roundError && 'questions' in roundError && (
                                    <p className="mt-2 text-sm text-red-400">{(roundError as any).questions?.message}</p>
                                )}
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="text-white font-semibold mb-2 block">
                                    Additional Notes (Optional)
                                </label>
                                <textarea
                                    {...register(`rounds.${index}.notes` as const)}
                                    rows={2}
                                    placeholder="Any other details about this round..."
                                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                                />
                            </div>
                        </>
                    )}

                    {/* GROUP DISCUSSION FIELDS */}
                    {roundType === 'gd' && (
                        <>
                            {/* Topics */}
                            <div>
                                <label className="text-white font-semibold mb-2 block">
                                    Discussion Topic(s) <span className="text-red-400">*</span>
                                </label>
                                <textarea
                                    {...register(`rounds.${index}.topics` as const)}
                                    rows={3}
                                    placeholder="What topics were given for the discussion?"
                                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                                />
                                {roundError && 'topics' in roundError && (
                                    <p className="mt-1 text-sm text-red-400">{(roundError as any).topics?.message || "Topics are required"}</p>
                                )}
                            </div>

                            {/* Tips */}
                            <div>
                                <label className="text-white font-semibold mb-2 block">
                                    Your Tips / Experience (Optional)
                                </label>
                                <textarea
                                    {...register(`rounds.${index}.tips` as const)}
                                    rows={3}
                                    placeholder="Any tips on how to structure arguments, group dynamics, or what the moderators were looking for?"
                                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                                />
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
