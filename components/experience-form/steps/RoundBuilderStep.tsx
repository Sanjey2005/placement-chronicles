'use client';

import { UseFormReturn, useFieldArray, FieldArrayWithId } from 'react-hook-form';
import { ExperienceFormData, getDefaultRound } from '@/lib/schemas/experience-schema';
import { Plus } from 'lucide-react';
import { Reorder } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import RoundCard from '../RoundCard';

interface RoundBuilderStepProps {
    form: UseFormReturn<ExperienceFormData>;
}

function ReorderRoundItem({
    field,
    index,
    form,
    isExpanded,
    onToggleExpand,
    onRemove,
    onReorderEnd,
}: {
    field: FieldArrayWithId<ExperienceFormData, 'rounds'>;
    index: number;
    form: UseFormReturn<ExperienceFormData>;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onRemove: () => void;
    onReorderEnd: (id: string) => void;
}) {
    const [isDragging, setIsDragging] = useState(false);
    const dragEndTimeRef = useRef(0);

    const handleToggle = () => {
        // Prevent click if drag just finished in the last 300ms
        if (Date.now() - dragEndTimeRef.current < 300) {
            return;
        }
        if (isDragging) return;
        onToggleExpand();
    };

    return (
        <Reorder.Item
            value={field}
            id={field.id}
            style={{ touchAction: 'none' }}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => {
                dragEndTimeRef.current = Date.now();
                setTimeout(() => setIsDragging(false), 200);
                onReorderEnd(field.id);
            }}
            className="relative select-none list-none touch-none"
            layout="position"
            whileDrag={{
                scale: 1.02,
                boxShadow: '0 25px 35px -10px rgba(0, 0, 0, 0.5), 0 12px 15px -8px rgba(0, 0, 0, 0.3)',
                zIndex: 50,
            }}
            transition={{ duration: 0.2 }}
        >
            <RoundCard
                form={form}
                index={index}
                displayRoundNumber={index + 1}
                isExpanded={isExpanded}
                onToggleExpand={handleToggle}
                onRemove={onRemove}
                isDragging={isDragging}
            />
        </Reorder.Item>
    );
}

export default function RoundBuilderStep({ form }: RoundBuilderStepProps) {
    const { control, formState: { errors } } = form;

    const { fields, append, remove, replace, move } = useFieldArray({
        control,
        name: 'rounds',
    });

    // Local items list for smooth 60fps drag & drop without React Hook Form thrashing
    const [items, setItems] = useState(fields);
    // Persistent expand/collapse map by field ID so dragging/reordering never resets open state
    const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

    // Keep items in sync when fields change (addition, deletion)
    useEffect(() => {
        setItems(fields);
    }, [fields]);

    const toggleExpand = (id: string) => {
        setExpandedMap((prev) => ({
            ...prev,
            [id]: prev[id] !== undefined ? !prev[id] : false,
        }));
    };

    const addRound = (type: 'test' | 'hackathon' | 'interview' | 'gd') => {
        append(getDefaultRound(type, fields.length + 1));
    };

    // Fired continuously while dragging - only updates local items for smooth animation
    const handleReorder = (newItems: typeof fields) => {
        setItems(newItems);
    };

    // Fired once when drag is released - commits the final reordered positions to react-hook-form
    const handleReorderEnd = (draggedId: string) => {
        const oldIndex = fields.findIndex((f) => f.id === draggedId);
        const newIndex = items.findIndex((i) => i.id === draggedId);

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            move(oldIndex, newIndex);
            
            // Sync up the round numbers for all items after move
            setTimeout(() => {
                const currentRounds = form.getValues('rounds') || [];
                currentRounds.forEach((_, i) => {
                    form.setValue(`rounds.${i}.roundNumber`, i + 1, { shouldDirty: true });
                });
            }, 0);
        }
    };

    const handleRemove = (index: number) => {
        const itemToRemove = items[index];
        if (itemToRemove) {
            setExpandedMap((prev) => {
                const next = { ...prev };
                delete next[itemToRemove.id];
                return next;
            });
        }
        remove(index);
        setTimeout(() => {
            const currentRounds = form.getValues('rounds') || [];
            currentRounds.forEach((_, i) => {
                form.setValue(`rounds.${i}.roundNumber`, i + 1, { shouldDirty: true });
            });
        }, 0);
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Interview Rounds</h2>
                <p className="text-muted-foreground">Add details about each round of the interview process</p>
            </div>

            {/* Resume Shortlisting Checkbox */}
            <label className="flex items-center gap-4 p-4 bg-surface-container border border-outline-variant rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer group">
                <div className="relative flex items-center justify-center shrink-0">
                    <input
                        type="checkbox"
                        {...form.register('resumeShortlisting')}
                        className="peer h-5 w-5 rounded-md border-2 border-outline/60 group-hover:border-primary bg-surface-container-highest checked:bg-primary checked:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none cursor-pointer transition-all appearance-none"
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity">
                        <svg className="w-3.5 h-3.5 text-primary-foreground stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                </div>
                <div>
                    <h3 className="text-foreground font-medium group-hover:text-primary transition-colors">Resume Shortlisting</h3>
                    <p className="text-xs text-muted-foreground group-hover:text-muted-foreground transition-colors">Check this if there was a resume screening round before interviews/tests</p>
                </div>
            </label>

            {/* Add Round Buttons */}
            <div className="flex flex-wrap gap-3">
                <button
                    type="button"
                    onClick={() => addRound('test')}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-fixed border border-transparent hover:bg-primary-fixed-dim text-primary rounded-lg transition-all cursor-pointer"
                >
                    <Plus className="h-4 w-4" />
                    Add Online Test
                </button>
                <button
                    type="button"
                    onClick={() => addRound('hackathon')}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-fixed border border-outline-variant hover:bg-primary-fixed text-primary rounded-lg transition-all cursor-pointer"
                >
                    <Plus className="h-4 w-4" />
                    Add Hackathon
                </button>
                <button
                    type="button"
                    onClick={() => addRound('interview')}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600/20 border border-green-500/50 hover:bg-green-600/30 text-green-300 rounded-lg transition-all cursor-pointer"
                >
                    <Plus className="h-4 w-4" />
                    Add Interview
                </button>
                <button
                    type="button"
                    onClick={() => addRound('gd')}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600/20 border border-orange-500/50 hover:bg-orange-600/30 text-orange-300 rounded-lg transition-all cursor-pointer"
                >
                    <Plus className="h-4 w-4" />
                    Add Group Discussion
                </button>
            </div>

            {/* Round Cards */}
            {items.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-outline-variant rounded-lg">
                    <p className="text-muted-foreground">No rounds added yet. Click a button above to add your first round.</p>
                </div>
            ) : (
                <Reorder.Group
                    axis="y"
                    values={items}
                    onReorder={handleReorder}
                    className="flex flex-col gap-4"
                >
                    {items.map((item, index) => (
                        <ReorderRoundItem
                            key={item.id}
                            field={item}
                            index={index}
                            form={form}
                            isExpanded={expandedMap[item.id] ?? true}
                            onToggleExpand={() => toggleExpand(item.id)}
                            onRemove={() => handleRemove(index)}
                            onReorderEnd={handleReorderEnd}
                        />
                    ))}
                </Reorder.Group>
            )}

            {errors.rounds && (
                <p className="text-sm text-on-error-container">{errors.rounds.message}</p>
            )}

            <div className="mt-4 p-4 bg-primary-fixed border border-transparent rounded-lg">
                <p className="text-sm text-primary">
                    <strong>Tip:</strong> Grab and drag the <strong>⋮⋮ handle</strong> on the left of any round to re-order them. Round numbers and names will update automatically!
                </p>
            </div>
        </div>
    );
}
