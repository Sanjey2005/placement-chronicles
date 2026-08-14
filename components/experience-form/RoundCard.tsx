'use client';

import { UseFormReturn, useFieldArray } from 'react-hook-form';
import { ExperienceFormData } from '@/lib/schemas/experience-schema';
import { Trash2, Plus, X, Beaker, Code, Users, Link as LinkIcon, MessageSquare, GripVertical } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { DragControls } from 'framer-motion';

const errorRing = 'border-destructive ring-2 ring-destructive/20';

interface RoundCardProps {
    form: UseFormReturn<ExperienceFormData>;
    index: number;
    displayRoundNumber?: number;
    onRemove: () => void;
    dragControls?: DragControls;
    isDragging?: boolean;
    isExpanded?: boolean;
    onToggleExpand?: () => void;
}

export default function RoundCard({
    form,
    index,
    displayRoundNumber,
    onRemove,
    dragControls,
    isDragging = false,
    isExpanded: controlledIsExpanded,
    onToggleExpand,
}: RoundCardProps) {
    const { register, watch, setValue, control, formState: { errors } } = form;
    const [localIsExpanded, setLocalIsExpanded] = useState(true);

    const isExpanded = controlledIsExpanded !== undefined ? controlledIsExpanded : localIsExpanded;

    const handleToggle = () => {
        if (isDragging) return;
        if (onToggleExpand) {
            onToggleExpand();
        } else {
            setLocalIsExpanded((prev) => !prev);
        }
    };

    const round = watch(`rounds.${index}`);
    const roundType = round?.type;
    const roundNum = displayRoundNumber ?? (index + 1);

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
            case 'interview': {
                const interviewType = (round as any)?.interviewType;
                let typeLabel = 'Interview';
                if (interviewType === 'technical') typeLabel = 'Technical Interview';
                else if (interviewType === 'hr') typeLabel = 'HR Interview';
                else if (interviewType === 'managerial') typeLabel = 'Managerial Round';
                else if (interviewType === 'mixed') typeLabel = 'Mixed Interview';
                return { icon: Users, color: 'green', label: typeLabel };
            }
            case 'gd':
                return { icon: MessageSquare, color: 'orange', label: 'Group Discussion' };
            default:
                return { icon: Users, color: 'gray', label: 'Round' };
        }
    };

    const { icon: Icon, color, label } = getRoundStyle();

    const roundError = errors.rounds?.[index];

    return (
        <div className="border-2 border-outline-variant bg-surface-container-low rounded-2xl overflow-hidden shadow-sm">
            {/* Header */}
            <div
                onClick={handleToggle}
                style={{ touchAction: 'none' }}
                className={cn(
                    "flex items-center justify-between p-4 bg-surface-container cursor-grab active:cursor-grabbing select-none transition-colors touch-none",
                    isDragging && "cursor-grabbing bg-surface-container-high ring-2 ring-primary/40 shadow-lg"
                )}
            >
                <div className="flex items-center gap-2.5 min-w-0 pointer-events-none">
                    {/* Drag Handle Indicator */}
                    <div
                        className="p-1.5 -ml-1 text-outline group-hover:text-foreground shrink-0"
                        title="Hold & drag to reorder"
                    >
                        <GripVertical className="h-5 w-5" />
                    </div>

                    <div className="p-2 bg-primary-fixed rounded-full shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-foreground font-semibold truncate">Round {roundNum}: {label}</h3>
                        <p className="text-xs text-muted-foreground">Click to {isExpanded ? 'collapse' : 'expand'} • Hold to reorder</p>
                    </div>
                </div>

                <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    title="Delete round"
                    aria-label={`Delete Round ${roundNum}`}
                    className="p-2 hover:bg-error-container/70 rounded-lg text-on-error-container border border-transparent hover:border-error-container transition-all ml-1 cursor-pointer shrink-0"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>

            {/* Content */}
            {isExpanded && (
                <div
                    onPointerDown={(e) => e.stopPropagation()}
                    className="p-4 space-y-4 cursor-default"
                >
                    {/* ONLINE TEST FIELDS */}
                    {roundType === 'test' && (
                        <>
                            {/* Topics */}
                            <div>
                                <label className="text-foreground font-semibold mb-2 block">
                                    Topics Covered <span className="text-on-error-container">*</span>
                                </label>
                                <input
                                    {...register(`rounds.${index}.topics` as const)}
                                    type="text"
                                    placeholder="DSA, OS, DBMS, Networking"
                                    aria-invalid={!!(roundError && 'topics' in roundError)}
                                    className={cn(
                                        "w-full px-4 py-2 bg-surface-container border rounded-lg text-foreground placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-ring/30",
                                        roundError && 'topics' in roundError ? errorRing : "border-outline-variant"
                                    )}
                                />
                                {roundError && 'topics' in roundError && (
                                    <p className="mt-1 text-sm text-on-error-container">{(roundError as any).topics?.message || "Topics are required"}</p>
                                )}
                                <p className="mt-1 text-xs text-outline">List the topics covered in this test</p>
                            </div>

                            {/* Study Sources */}
                            <div>
                                <label className="text-foreground font-semibold mb-2 block">
                                    Study Sources
                                </label>
                                <input
                                    {...register(`rounds.${index}.studySources` as const)}
                                    type="text"
                                    placeholder="LeetCode, GeeksforGeeks, Striver's SDE Sheet"
                                    className="w-full px-4 py-2 bg-surface-container border border-outline-variant rounded-lg text-foreground placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-ring/30"
                                />
                                <p className="mt-1 text-xs text-outline">Optional: Books, websites, or resources that helped</p>
                            </div>
                        </>
                    )}

                    {/* HACKATHON FIELDS */}
                    {roundType === 'hackathon' && (
                        <>
                            {/* Experience/Strategy */}
                            <div>
                                <label className="text-foreground font-semibold mb-2 block">
                                    Your Strategy & Approach <span className="text-on-error-container">*</span>
                                </label>
                                <textarea
                                    {...register(`rounds.${index}.strategy` as const)}
                                    rows={4}
                                    placeholder="Describe your approach, team dynamics, challenges faced..."
                                    aria-invalid={!!(roundError && 'strategy' in roundError)}
                                    className={cn(
                                        "w-full px-4 py-2 bg-surface-container border rounded-lg text-foreground placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-ring/30 resize-none",
                                        roundError && 'strategy' in roundError ? errorRing : "border-outline-variant"
                                    )}
                                />
                                {roundError && 'strategy' in roundError && (
                                    <p className="mt-1 text-sm text-on-error-container">{(roundError as any).strategy?.message}</p>
                                )}
                            </div>

                            {/* Problem Statement */}
                            <div>
                                <label className="text-foreground font-semibold mb-2 block">
                                    Problem Statement <span className="text-on-error-container">*</span>
                                </label>
                                <textarea
                                    {...register(`rounds.${index}.problemStatement` as const)}
                                    rows={4}
                                    placeholder="Describe the problem statement you had to solve..."
                                    aria-invalid={!!(roundError && 'problemStatement' in roundError)}
                                    className={cn(
                                        "w-full px-4 py-2 bg-surface-container border rounded-lg text-foreground placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-ring/30 resize-none",
                                        roundError && 'problemStatement' in roundError ? errorRing : "border-outline-variant"
                                    )}
                                />
                                {roundError && 'problemStatement' in roundError && (
                                    <p className="mt-1 text-sm text-on-error-container">{(roundError as any).problemStatement?.message}</p>
                                )}
                            </div>
                        </>
                    )}

                    {/* INTERVIEW FIELDS */}
                    {roundType === 'interview' && (
                        <>
                            {/* Interview Type & Duration (Side by Side) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-foreground font-semibold mb-2 block">
                                        Interview Type
                                    </label>
                                    <select
                                        {...register(`rounds.${index}.interviewType` as const)}
                                        className="w-full px-4 py-2 bg-surface-container border border-outline-variant rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-green-500"
                                    >
                                        <option value="technical" className="bg-card">Technical</option>
                                        <option value="hr" className="bg-card">HR</option>
                                        <option value="managerial" className="bg-card">Managerial</option>
                                        <option value="mixed" className="bg-card">Mixed</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-foreground font-semibold mb-2 block">
                                        Duration (Optional)
                                    </label>
                                    <input
                                        {...register(`rounds.${index}.duration` as const)}
                                        type="text"
                                        placeholder="e.g., 45 minutes"
                                        className="w-full px-4 py-2 bg-surface-container border border-outline-variant rounded-lg text-foreground placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                            </div>

                            {/* Questions */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-foreground font-semibold">
                                        Questions <span className="text-outline text-sm font-normal">(Optional if Notes provided)</span>
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
                                    <p className="text-muted-foreground text-sm mb-2">No questions added yet.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {questionFields.map((field, qIndex) => (
                                            <div key={field.id} className="p-3 bg-surface-container border border-outline-variant rounded-lg space-y-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1">
                                                        <label className="text-xs text-muted-foreground mb-1 block">Question {qIndex + 1}</label>
                                                        <input
                                                            {...register(`rounds.${index}.questions.${qIndex}.question` as const)}
                                                            type="text"
                                                            placeholder="What was the question asked?"
                                                            className="w-full px-3 py-2 bg-surface-container border border-outline-variant rounded text-foreground text-sm placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-green-500"
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeQuestion(qIndex)}
                                                        className="p-1 hover:bg-error-container/70 rounded text-on-error-container"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-muted-foreground mb-1 block">Your Answer/Tip</label>
                                                    <textarea
                                                        {...register(`rounds.${index}.questions.${qIndex}.answerTip` as const)}
                                                        rows={2}
                                                        placeholder="How did you answer? What should others know?"
                                                        className="w-full px-3 py-2 bg-surface-container border border-outline-variant rounded text-foreground text-sm placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {roundError && 'questions' in roundError && (
                                    <p className="mt-2 text-sm text-on-error-container">{(roundError as any).questions?.message}</p>
                                )}
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="text-foreground font-semibold mb-2 block">
                                    Additional Notes (Optional)
                                </label>
                                <textarea
                                    {...register(`rounds.${index}.notes` as const)}
                                    rows={2}
                                    placeholder="Any other details about this round..."
                                    className="w-full px-4 py-2 bg-surface-container border border-outline-variant rounded-lg text-foreground placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                                />
                            </div>
                        </>
                    )}

                    {/* GROUP DISCUSSION FIELDS */}
                    {roundType === 'gd' && (
                        <>
                            {/* Topics */}
                            <div>
                                <label className="text-foreground font-semibold mb-2 block">
                                    Discussion Topic(s) <span className="text-on-error-container">*</span>
                                </label>
                                <textarea
                                    {...register(`rounds.${index}.topics` as const)}
                                    rows={3}
                                    placeholder="What topics were given for the discussion?"
                                    aria-invalid={!!(roundError && 'topics' in roundError)}
                                    className={cn(
                                        "w-full px-4 py-2 bg-surface-container border rounded-lg text-foreground placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none",
                                        roundError && 'topics' in roundError ? errorRing : "border-outline-variant"
                                    )}
                                />
                                {roundError && 'topics' in roundError && (
                                    <p className="mt-1 text-sm text-on-error-container">{(roundError as any).topics?.message || "Topics are required"}</p>
                                )}
                            </div>

                            {/* Tips */}
                            <div>
                                <label className="text-foreground font-semibold mb-2 block">
                                    Your Tips / Experience (Optional)
                                </label>
                                <textarea
                                    {...register(`rounds.${index}.tips` as const)}
                                    rows={3}
                                    placeholder="Any tips on how to structure arguments, group dynamics, or what the moderators were looking for?"
                                    className="w-full px-4 py-2 bg-surface-container border border-outline-variant rounded-lg text-foreground placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                                />
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
