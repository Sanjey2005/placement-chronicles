'use client';

import { UseFormReturn } from 'react-hook-form';
import { ExperienceFormData } from '@/lib/schemas/experience-schema';
import { Building2, Briefcase, Calendar, IndianRupee, User, FileText, GraduationCap, Clock, CheckCircle2, AlertCircle, History, MapPin } from 'lucide-react';

interface BasicInfoStepProps {
    form: UseFormReturn<ExperienceFormData>;
}

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function BasicInfoStep({ form }: BasicInfoStepProps) {
    const { register, formState: { errors }, watch, setValue, trigger } = form;

    const currentYear = new Date().getFullYear();
    const batchYears = Array.from({ length: 7 }, (_, i) => currentYear + i - 3); // Current year - 3 to + 3

    const roleType = watch('roleType');
    const isInternship = roleType === 'INTERNSHIP' || roleType === 'SUMMER_INTERNSHIP';

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

            {/* Academic Info: Batch and Course */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label className="flex items-center gap-2 text-white font-semibold mb-2">
                        <Calendar className="h-4 w-4" />
                        Batch Year (Year of Passing Out)
                    </Label>
                    <Select
                        onValueChange={(value) => {
                            setValue('batch', value);
                            trigger('batch');
                        }}
                        defaultValue={watch('batch')}
                    >
                        <SelectTrigger className="w-full px-4 py-3 h-auto bg-white/10 border-white/20 text-white focus:ring-blue-500">
                            <SelectValue placeholder="Select Batch" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                            {batchYears.map((year) => (
                                <SelectItem key={year} value={year.toString()} className="focus:bg-white/10 focus:text-white cursor-pointer">
                                    {year}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.batch && (
                        <p className="mt-1 text-sm text-red-400">{errors.batch.message}</p>
                    )}
                </div>

                <div>
                    <Label className="flex items-center gap-2 text-white font-semibold mb-2">
                        <GraduationCap className="h-4 w-4" />
                        Course & Branch
                    </Label>
                    <Select
                        onValueChange={(value) => {
                            setValue('courseBranch', value);
                            trigger('courseBranch');
                        }}
                        defaultValue={watch('courseBranch')}
                    >
                        <SelectTrigger className="w-full px-4 py-3 h-auto bg-white/10 border-white/20 text-white focus:ring-blue-500">
                            <SelectValue placeholder="Select Course & Branch" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white h-64">
                            <SelectItem value="B.Tech CSE" className="focus:bg-white/10 focus:text-white cursor-pointer">B.Tech CSE</SelectItem>
                            <SelectItem value="B.Tech IT" className="focus:bg-white/10 focus:text-white cursor-pointer">B.Tech IT</SelectItem>
                            <SelectItem value="B.Tech ECE" className="focus:bg-white/10 focus:text-white cursor-pointer">B.Tech ECE</SelectItem>
                            <SelectItem value="B.Tech EEE" className="focus:bg-white/10 focus:text-white cursor-pointer">B.Tech EEE</SelectItem>
                            <SelectItem value="B.Tech Mech" className="focus:bg-white/10 focus:text-white cursor-pointer">B.Tech Mech</SelectItem>
                            <SelectItem value="M.Sc Software Systems" className="focus:bg-white/10 focus:text-white cursor-pointer">M.Sc Software Systems</SelectItem>
                            <SelectItem value="M.Sc Theoretical Computer Science" className="focus:bg-white/10 focus:text-white cursor-pointer">M.Sc Theoretical Computer Science</SelectItem>
                            <SelectItem value="M.Sc Data Science" className="focus:bg-white/10 focus:text-white cursor-pointer">M.Sc Data Science</SelectItem>
                            <SelectItem value="M.Sc Cyber Security" className="focus:bg-white/10 focus:text-white cursor-pointer">M.Sc Cyber Security</SelectItem>
                            <SelectItem value="MCA" className="focus:bg-white/10 focus:text-white cursor-pointer">MCA</SelectItem>
                            <SelectItem value="MBA" className="focus:bg-white/10 focus:text-white cursor-pointer">MBA</SelectItem>
                            <SelectItem value="Other" className="focus:bg-white/10 focus:text-white cursor-pointer">Other</SelectItem>
                        </SelectContent>
                    </Select>
                    {errors.courseBranch && (
                        <p className="mt-1 text-sm text-red-400">{errors.courseBranch.message}</p>
                    )}
                </div>
            </div>

            {/* Job Type Info: Placement Type, Role Type, and Work Model */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <Label className="flex items-center gap-2 text-white font-semibold mb-2">
                        <Building2 className="h-4 w-4" />
                        Placement Type
                    </Label>
                    <Select
                        onValueChange={(value) => {
                            setValue('placementType', value as "ON_CAMPUS" | "OFF_CAMPUS");
                            trigger('placementType');
                        }}
                        defaultValue={watch('placementType')}
                    >
                        <SelectTrigger className="w-full px-4 py-3 h-auto bg-white/10 border-white/20 text-white focus:ring-blue-500">
                            <SelectValue placeholder="Select Type" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                            <SelectItem value="ON_CAMPUS" className="focus:bg-white/10 focus:text-white cursor-pointer">On Campus</SelectItem>
                            <SelectItem value="OFF_CAMPUS" className="focus:bg-white/10 focus:text-white cursor-pointer">Off Campus</SelectItem>
                        </SelectContent>
                    </Select>
                    {errors.placementType && (
                        <p className="mt-1 text-sm text-red-400">{errors.placementType.message}</p>
                    )}
                </div>

                <div>
                    <Label className="flex items-center gap-2 text-white font-semibold mb-2">
                        <Briefcase className="h-4 w-4" />
                        Role Type
                    </Label>
                    <Select
                        onValueChange={(value) => {
                            setValue('roleType', value as "FULL_TIME" | "INTERNSHIP" | "SUMMER_INTERNSHIP");
                            trigger('roleType');
                        }}
                        defaultValue={watch('roleType')}
                    >
                        <SelectTrigger className="w-full px-4 py-3 h-auto bg-white/10 border-white/20 text-white focus:ring-blue-500">
                            <SelectValue placeholder="Select Role Type" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                            <SelectItem value="FULL_TIME" className="focus:bg-white/10 focus:text-white cursor-pointer">Full Time</SelectItem>
                            <SelectItem value="INTERNSHIP" className="focus:bg-white/10 focus:text-white cursor-pointer">Internship</SelectItem>
                            <SelectItem value="SUMMER_INTERNSHIP" className="focus:bg-white/10 focus:text-white cursor-pointer">Summer Internship</SelectItem>
                        </SelectContent>
                    </Select>
                    {errors.roleType && (
                        <p className="mt-1 text-sm text-red-400">{errors.roleType.message}</p>
                    )}
                </div>

                <div>
                    <Label className="flex items-center gap-2 text-white font-semibold mb-2">
                        <MapPin className="h-4 w-4" />
                        Work Model
                    </Label>
                    <Select
                        onValueChange={(value) => {
                            setValue('workModel', value as "ON_SITE" | "WFH" | "HYBRID");
                            trigger('workModel');
                        }}
                        defaultValue={watch('workModel')}
                    >
                        <SelectTrigger className="w-full px-4 py-3 h-auto bg-white/10 border-white/20 text-white focus:ring-blue-500">
                            <SelectValue placeholder="Select Work Model" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                            <SelectItem value="ON_SITE" className="focus:bg-white/10 focus:text-white cursor-pointer">On-site</SelectItem>
                            <SelectItem value="WFH" className="focus:bg-white/10 focus:text-white cursor-pointer">Work From Home</SelectItem>
                            <SelectItem value="HYBRID" className="focus:bg-white/10 focus:text-white cursor-pointer">Hybrid</SelectItem>
                        </SelectContent>
                    </Select>
                    {errors.workModel && (
                        <p className="mt-1 text-sm text-red-400">{errors.workModel.message}</p>
                    )}
                </div>
            </div>

            {/* Metrics: Min CGPA and CTC */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="flex items-center gap-2 text-white font-semibold mb-2">
                        <GraduationCap className="h-4 w-4" />
                        Minimum CGPA
                    </label>
                    <input
                        {...register('minCGPA', { valueAsNumber: true })}
                        type="number"
                        step="0.01"
                        max="10"
                        placeholder="7.5"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    {errors.minCGPA && (
                        <p className="mt-1 text-sm text-red-400">{errors.minCGPA.message}</p>
                    )}
                </div>

                <div>
                    <label className="flex items-center gap-2 text-white font-semibold mb-2">
                        <IndianRupee className="h-4 w-4" />
                        {isInternship ? 'Stipend (per month)' : 'CTC (in LPA)'}
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

            {/* Backlogs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label className="flex items-center gap-2 text-white font-semibold mb-2">
                        <History className="h-4 w-4" />
                        History of Backlogs
                    </Label>
                    <Select
                        onValueChange={(value) => {
                            setValue('historyOfBacklogs', value as "Allowed" | "Not Allowed");
                            trigger('historyOfBacklogs');
                        }}
                        defaultValue={watch('historyOfBacklogs')}
                    >
                        <SelectTrigger className="w-full px-4 py-3 h-auto bg-white/10 border-white/20 text-white focus:ring-blue-500">
                            <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                            <SelectItem value="Allowed" className="focus:bg-white/10 focus:text-white cursor-pointer">Allowed</SelectItem>
                            <SelectItem value="Not Allowed" className="focus:bg-white/10 focus:text-white cursor-pointer">Not Allowed</SelectItem>
                        </SelectContent>
                    </Select>
                    {errors.historyOfBacklogs && (
                        <p className="mt-1 text-sm text-red-400">{errors.historyOfBacklogs.message}</p>
                    )}
                </div>

                <div>
                    <Label className="flex items-center gap-2 text-white font-semibold mb-2">
                        <AlertCircle className="h-4 w-4" />
                        Standing Backlogs
                    </Label>
                    <Select
                        onValueChange={(value) => {
                            setValue('standingBacklogs', value as "Allowed" | "Not Allowed");
                            trigger('standingBacklogs');
                        }}
                        defaultValue={watch('standingBacklogs')}
                    >
                        <SelectTrigger className="w-full px-4 py-3 h-auto bg-white/10 border-white/20 text-white focus:ring-blue-500">
                            <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                            <SelectItem value="Allowed" className="focus:bg-white/10 focus:text-white cursor-pointer">Allowed</SelectItem>
                            <SelectItem value="Not Allowed" className="focus:bg-white/10 focus:text-white cursor-pointer">Not Allowed</SelectItem>
                        </SelectContent>
                    </Select>
                    {errors.standingBacklogs && (
                        <p className="mt-1 text-sm text-red-400">{errors.standingBacklogs.message}</p>
                    )}
                </div>
            </div>


        </div>
    );
}
