'use client';

import { UseFormReturn } from 'react-hook-form';
import { ExperienceFormData } from '@/lib/schemas/experience-schema';
import { CheckCircle2, XCircle, Clock, Lightbulb } from 'lucide-react';

interface ConclusionStepProps {
    form: UseFormReturn<ExperienceFormData>;
}

export default function ConclusionStep({ form }: ConclusionStepProps) {
    const { register, watch, formState: { errors } } = form;

    const finalVerdict = watch('finalVerdict');
    const formData = watch();

    const verdictOptions = [
        { value: 'selected', label: 'Selected', icon: CheckCircle2, color: 'green' },
        { value: 'rejected', label: 'Not Selected', icon: XCircle, color: 'red' },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Final Thoughts</h2>
                <p className="text-muted-foreground">Share your outcome and wisdom for juniors</p>
            </div>

            {/* Final Verdict */}
            <div>
                <label className="text-foreground font-semibold mb-3 block">
                    Final Verdict <span className="text-on-error-container">*</span>
                </label>
                <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 rounded-lg ${errors.finalVerdict ? 'ring-2 ring-destructive/30' : ''}`}>
                    {verdictOptions.map((option) => {
                        const Icon = option.icon;
                        const isSelected = finalVerdict === option.value;
                        return (
                            <label
                                key={option.value}
                                className={`relative flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${isSelected
                                    ? `border-${option.color}-500 bg-${option.color}-500/20`
                                    : 'border-outline-variant bg-surface-container hover:bg-surface-container-high'
                                    }`}
                            >
                                <input
                                    {...register('finalVerdict')}
                                    type="radio"
                                    value={option.value}
                                    className="sr-only"
                                />
                                <Icon
                                    className={`h-8 w-8 mb-2 ${isSelected ? `text-${option.color}-400` : 'text-muted-foreground'
                                        }`}
                                />
                                <span
                                    className={`text-sm font-semibold ${isSelected ? 'text-foreground' : 'text-muted-foreground'
                                        }`}
                                >
                                    {option.label}
                                </span>
                            </label>
                        );
                    })}
                </div>
                {errors.finalVerdict && (
                    <p className="mt-1 text-sm text-on-error-container">{errors.finalVerdict.message}</p>
                )}
            </div>

            {/* Tips for Juniors */}
            <div>
                <label className="flex items-center gap-2 text-foreground font-semibold mb-2">
                    <Lightbulb className="h-4 w-4" />
                    Tips for Juniors <span className="text-outline text-sm font-normal">(Optional)</span>
                </label>
                <textarea
                    {...register('tipsForJuniors')}
                    rows={6}
                    placeholder="Share your advice, preparation strategies, common mistakes to avoid, resources that helped you, etc."
                    className="w-full px-4 py-3 bg-surface-container border border-outline-variant rounded-lg text-foreground placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-transparent transition-all resize-none"
                />
                {errors.tipsForJuniors && (
                    <p className="mt-1 text-sm text-on-error-container">{errors.tipsForJuniors.message}</p>
                )}
                <p className="mt-1 text-xs text-outline">
                    Be specific and helpful. Your insights can make a real difference!
                </p>
            </div>

            {/* Overall Experience (Optional) */}
            <div>
                <label className="text-foreground font-semibold mb-2 block">
                    Overall Experience <span className="text-outline text-sm font-normal">(Optional)</span>
                </label>
                <textarea
                    {...register('overallExperience')}
                    rows={4}
                    placeholder="How was your overall experience? Any memorable moments? How was the company culture?"
                    className="w-full px-4 py-3 bg-surface-container border border-outline-variant rounded-lg text-foreground placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-transparent transition-all resize-none"
                />
                {errors.overallExperience && (
                    <p className="mt-1 text-sm text-on-error-container">{errors.overallExperience.message}</p>
                )}
            </div>

        </div>
    );
}
