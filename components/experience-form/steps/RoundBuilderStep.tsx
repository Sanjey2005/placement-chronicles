'use client';

import { UseFormReturn, useFieldArray } from 'react-hook-form';
import { ExperienceFormData, getDefaultRound } from '@/lib/schemas/experience-schema';
import { Plus, Trash2 } from 'lucide-react';
import RoundCard from '../RoundCard';

interface RoundBuilderStepProps {
    form: UseFormReturn<ExperienceFormData>;
}

export default function RoundBuilderStep({ form }: RoundBuilderStepProps) {
    const { control, formState: { errors } } = form;

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'rounds',
    });

    const addRound = (type: 'test' | 'hackathon' | 'interview' | 'gd') => {
        append(getDefaultRound(type, fields.length + 1));
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Interview Rounds</h2>
                <p className="text-white/60">Add details about each round of the interview process</p>
            </div>

            {/* Resume Shortlisting Checkbox */}
            <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors cursor-pointer" onClick={() => {
                const isChecked = form.getValues('resumeShortlisting');
                form.setValue('resumeShortlisting', !isChecked, { shouldValidate: true, shouldDirty: true });
            }}>
                <div className="flex items-center justify-center min-w-6 h-6 rounded border border-white/20 bg-black/20">
                    <input
                        type="checkbox"
                        {...form.register('resumeShortlisting')}
                        className="w-4 h-4 text-purple-600 rounded bg-transparent border-transparent focus:ring-0 cursor-pointer accent-purple-500"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
                <div>
                    <h3 className="text-white font-medium">Resume Shortlisting</h3>
                    <p className="text-xs text-white/50">Check this if there was a resume screening round before interviews/tests</p>
                </div>
            </div>

            {/* Add Round Buttons */}
            <div className="flex flex-wrap gap-3">
                <button
                    type="button"
                    onClick={() => addRound('test')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 border border-blue-500/50 hover:bg-blue-600/30 text-blue-300 rounded-lg transition-all"
                >
                    <Plus className="h-4 w-4" />
                    Add Online Test
                </button>
                <button
                    type="button"
                    onClick={() => addRound('hackathon')}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 border border-purple-500/50 hover:bg-purple-600/30 text-purple-300 rounded-lg transition-all"
                >
                    <Plus className="h-4 w-4" />
                    Add Hackathon
                </button>
                <button
                    type="button"
                    onClick={() => addRound('interview')}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600/20 border border-green-500/50 hover:bg-green-600/30 text-green-300 rounded-lg transition-all"
                >
                    <Plus className="h-4 w-4" />
                    Add Interview
                </button>
                <button
                    type="button"
                    onClick={() => addRound('gd')}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600/20 border border-orange-500/50 hover:bg-orange-600/30 text-orange-300 rounded-lg transition-all"
                >
                    <Plus className="h-4 w-4" />
                    Add Group Discussion
                </button>
            </div>

            {/* Round Cards */}
            {fields.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-white/20 rounded-lg">
                    <p className="text-white/60">No rounds added yet. Click a button above to add your first round.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {fields.map((field, index) => (
                        <div key={field.id} className="relative">
                            <RoundCard
                                form={form}
                                index={index}
                                onRemove={() => remove(index)}
                            />
                        </div>
                    ))}
                </div>
            )}

            {errors.rounds && (
                <p className="text-sm text-red-400">{errors.rounds.message}</p>
            )}

            <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-sm text-blue-300">
                    <strong>Tip:</strong> Add all rounds in the order they happened. You can mix different round types!
                </p>
            </div>
        </div>
    );
}
