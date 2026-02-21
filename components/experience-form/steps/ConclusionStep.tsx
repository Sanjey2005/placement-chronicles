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
                <h2 className="text-2xl font-bold text-white mb-2">Final Thoughts</h2>
                <p className="text-white/60">Share your outcome and wisdom for juniors</p>
            </div>

            {/* Final Verdict */}
            <div>
                <label className="text-white font-semibold mb-3 block">
                    Final Verdict <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {verdictOptions.map((option) => {
                        const Icon = option.icon;
                        const isSelected = finalVerdict === option.value;
                        return (
                            <label
                                key={option.value}
                                className={`relative flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${isSelected
                                    ? `border-${option.color}-500 bg-${option.color}-500/20`
                                    : 'border-white/20 bg-white/5 hover:bg-white/10'
                                    }`}
                            >
                                <input
                                    {...register('finalVerdict')}
                                    type="radio"
                                    value={option.value}
                                    className="sr-only"
                                />
                                <Icon
                                    className={`h-8 w-8 mb-2 ${isSelected ? `text-${option.color}-400` : 'text-white/60'
                                        }`}
                                />
                                <span
                                    className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-white/70'
                                        }`}
                                >
                                    {option.label}
                                </span>
                            </label>
                        );
                    })}
                </div>
                {errors.finalVerdict && (
                    <p className="mt-1 text-sm text-red-400">{errors.finalVerdict.message}</p>
                )}
            </div>

            {/* Tips for Juniors */}
            <div>
                <label className="flex items-center gap-2 text-white font-semibold mb-2">
                    <Lightbulb className="h-4 w-4" />
                    Tips for Juniors <span className="text-white/40 text-sm font-normal">(Optional)</span>
                </label>
                <textarea
                    {...register('tipsForJuniors')}
                    rows={6}
                    placeholder="Share your advice, preparation strategies, common mistakes to avoid, resources that helped you, etc."
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                />
                {errors.tipsForJuniors && (
                    <p className="mt-1 text-sm text-red-400">{errors.tipsForJuniors.message}</p>
                )}
                <p className="mt-1 text-xs text-white/40">
                    Be specific and helpful. Your insights can make a real difference!
                </p>
            </div>

            {/* Overall Experience (Optional) */}
            <div>
                <label className="text-white font-semibold mb-2 block">
                    Overall Experience <span className="text-white/40 text-sm font-normal">(Optional)</span>
                </label>
                <textarea
                    {...register('overallExperience')}
                    rows={4}
                    placeholder="How was your overall experience? Any memorable moments? How was the company culture?"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                />
                {errors.overallExperience && (
                    <p className="mt-1 text-sm text-red-400">{errors.overallExperience.message}</p>
                )}
            </div>

            {/* Review Summary */}
            <div className="mt-6 p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/20 rounded-xl">
                <h3 className="text-lg font-bold text-white mb-3">Review Your Submission</h3>
                <div className="space-y-2 text-sm">
                    <p className="text-white/80">
                        <span className="font-semibold">Company:</span> {formData.company || 'Not provided'}
                    </p>
                    <p className="text-white/80">
                        <span className="font-semibold">Role:</span> {formData.role || 'Not provided'}
                    </p>
                    <p className="text-white/80">
                        <span className="font-semibold">CTC:</span> {formData.ctc ? `${formData.ctc} LPA` : 'Not provided'}
                    </p>
                    <p className="text-white/80">
                        <span className="font-semibold">Batch:</span> {formData.batch || 'Not provided'}
                    </p>
                    <p className="text-white/80">
                        <span className="font-semibold">Rounds:</span> {formData.rounds?.length || 0} round(s)
                    </p>
                    <p className="text-white/80">
                        <span className="font-semibold">Status:</span>{' '}
                        {verdictOptions.find((v) => v.value === finalVerdict)?.label || 'Not selected'}
                    </p>
                </div>
                <p className="mt-4 text-xs text-white/60">
                    Everything looks good? Click "Submit Experience" below!
                </p>
            </div>
        </div>
    );
}
