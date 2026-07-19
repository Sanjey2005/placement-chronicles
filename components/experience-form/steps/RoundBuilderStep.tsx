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
                <h2 className="text-2xl font-bold text-foreground mb-2">Interview Rounds</h2>
                <p className="text-muted-foreground">Add details about each round of the interview process</p>
            </div>

            {/* Resume Shortlisting Checkbox */}
            <label className="flex items-center gap-4 p-4 bg-surface-container border border-outline-variant rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer group">
                <div className="relative flex items-center justify-center shrink-0">
                    <input
                        type="checkbox"
                        {...form.register('resumeShortlisting')}
                        className="peer h-5 w-5 rounded border-outline-variant bg-surface-container text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer transition-all appearance-none checked:bg-primary checked:border-primary"
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity">
                        <svg className="w-3.5 h-3.5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
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
                    className="flex items-center gap-2 px-4 py-2 bg-primary-fixed border border-transparent hover:bg-primary-fixed-dim text-primary rounded-lg transition-all"
                >
                    <Plus className="h-4 w-4" />
                    Add Online Test
                </button>
                <button
                    type="button"
                    onClick={() => addRound('hackathon')}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-fixed border border-outline-variant hover:bg-primary-fixed text-primary rounded-lg transition-all"
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
                <div className="text-center py-12 border-2 border-dashed border-outline-variant rounded-lg">
                    <p className="text-muted-foreground">No rounds added yet. Click a button above to add your first round.</p>
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
                <p className="text-sm text-on-error-container">{errors.rounds.message}</p>
            )}

            <div className="mt-4 p-4 bg-primary-fixed border border-transparent rounded-lg">
                <p className="text-sm text-primary">
                    <strong>Tip:</strong> Add all rounds in the order they happened. You can mix different round types!
                </p>
            </div>
        </div>
    );
}
