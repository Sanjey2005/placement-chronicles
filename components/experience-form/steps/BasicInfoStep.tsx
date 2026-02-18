'use client';

import { UseFormReturn } from 'react-hook-form';
import { ExperienceFormData } from '@/lib/schemas/experience-schema';
import { Building2, Briefcase, Calendar, IndianRupee, User, FileText, GraduationCap, Clock } from 'lucide-react';

interface BasicInfoStepProps {
    form: UseFormReturn<ExperienceFormData>;
}

export default function BasicInfoStep({ form }: BasicInfoStepProps) {
    const { register, formState: { errors } } = form;

    const currentYear = new Date().getFullYear();
    const batchYears = Array.from({ length: 5 }, (_, i) => currentYear + i - 1);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Basic Information</h2>
                <p className="text-white/60">Tell us about yourself and the company</p>
            </div>

            {/* Student Name */}
            <div>
                <label className="flex items-center gap-2 text-white font-semibold mb-2">
                    <User className="h-4 w-4" />
                    Your Name
                </label>
                <input
                    {...register('studentName')}
                    type="text"
                    placeholder="John Doe"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                {errors.studentName && (
                    <p className="mt-1 text-sm text-red-400">{errors.studentName.message}</p>
                )}
            </div>

            {/* Company and Role */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="flex items-center gap-2 text-white font-semibold mb-2">
                        <Building2 className="h-4 w-4" />
                        Company
                    </label>
                    <input
                        {...register('company')}
                        type="text"
                        placeholder="Google"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    {errors.company && (
                        <p className="mt-1 text-sm text-red-400">{errors.company.message}</p>
                    )}
                </div>

                <div>
                    <label className="flex items-center gap-2 text-white font-semibold mb-2">
                        <Briefcase className="h-4 w-4" />
                        Role
                    </label>
                    <input
                        {...register('role')}
                        type="text"
                        placeholder="Software Engineer"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    {errors.role && (
                        <p className="mt-1 text-sm text-red-400">{errors.role.message}</p>
                    )}
                </div>
            </div>

            {/* Batch and CTC */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="flex items-center gap-2 text-white font-semibold mb-2">
                        <Calendar className="h-4 w-4" />
                        Batch Year
                    </label>
                    <select
                        {...register('batch')}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                        <option value="" className="bg-slate-900">Select Batch</option>
                        {batchYears.map((year) => (
                            <option key={year} value={year.toString()} className="bg-slate-900">
                                {year}
                            </option>
                        ))}
                    </select>
                    {errors.batch && (
                        <p className="mt-1 text-sm text-red-400">{errors.batch.message}</p>
                    )}
                </div>

                <div>
                    <label className="flex items-center gap-2 text-white font-semibold mb-2">
                        <IndianRupee className="h-4 w-4" />
                        CTC (in LPA)
                    </label>
                    <input
                        {...register('ctc', { valueAsNumber: true })}
                        type="number"
                        step="0.1"
                        placeholder="12.5"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    {errors.ctc && (
                        <p className="mt-1 text-sm text-red-400">{errors.ctc.message}</p>
                    )}
                </div>
            </div>

            {/* Course/Branch and Internship Duration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="flex items-center gap-2 text-white font-semibold mb-2">
                        <GraduationCap className="h-4 w-4" />
                        Course & Branch
                    </label>
                    <input
                        {...register('courseBranch')}
                        type="text"
                        placeholder="BTech CSE, MSc Data Science, etc."
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    {errors.courseBranch && (
                        <p className="mt-1 text-sm text-red-400">{errors.courseBranch.message}</p>
                    )}
                </div>

                <div>
                    <label className="flex items-center gap-2 text-white font-semibold mb-2">
                        <Clock className="h-4 w-4" />
                        Internship Duration
                    </label>
                    <input
                        {...register('internshipDuration')}
                        type="text"
                        placeholder="e.g., 2 months, 6 months"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    {errors.internshipDuration && (
                        <p className="mt-1 text-sm text-red-400">{errors.internshipDuration.message}</p>
                    )}
                    <p className="mt-1 text-xs text-white/40">Leave blank if not an internship</p>
                </div>
            </div>

            {/* Eligibility Criteria */}
            <div>
                <label className="flex items-center gap-2 text-white font-semibold mb-2">
                    <FileText className="h-4 w-4" />
                    Eligibility Criteria
                </label>
                <textarea
                    {...register('eligibilityCriteria')}
                    rows={4}
                    placeholder="e.g., CGPA > 7.5, No active backlogs, All branches eligible"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                />
                {errors.eligibilityCriteria && (
                    <p className="mt-1 text-sm text-red-400">{errors.eligibilityCriteria.message}</p>
                )}
                <p className="mt-1 text-xs text-white/40">Include CGPA requirements, branch restrictions, backlog policies, etc.</p>
            </div>
        </div>
    );
}
