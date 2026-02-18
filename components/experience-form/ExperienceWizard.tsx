'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { ExperienceFormData, experienceFormSchema } from '@/lib/schemas/experience-schema';
import { ArrowLeft, ArrowRight, Upload, Check } from 'lucide-react';
import { toast } from 'sonner';
import GridBackground from '@/components/GridBackground';
import GlassCard from '@/components/GlassCard';

// Step components (we'll create these)
import BasicInfoStep from './steps/BasicInfoStep';
import RoundBuilderStep from './steps/RoundBuilderStep';
import ConclusionStep from './steps/ConclusionStep';

const STEPS = [
    { id: 1, name: 'Basic Info', description: 'Company & Role Details' },
    { id: 2, name: 'Rounds', description: 'Interview Process' },
    { id: 3, name: 'Conclusion', description: 'Final Thoughts' },
];

interface ExperienceWizardProps {
    onSubmit: (data: ExperienceFormData) => Promise<void>;
    initialData?: Partial<ExperienceFormData>;
}

export default function ExperienceWizard({ onSubmit, initialData }: ExperienceWizardProps) {
    const [currentStep, setCurrentStep] = useState(1);
    const [isUploading, setIsUploading] = useState(false);

    const form = useForm<ExperienceFormData>({
        resolver: zodResolver(experienceFormSchema) as any,
        defaultValues: initialData || {
            studentName: '',
            company: '',
            role: '',
            batch: '',
            eligibilityCriteria: '',
            ctc: 0,
            rounds: [],
            finalVerdict: 'ongoing',
            tipsForJuniors: '',
            tags: [],
            year: new Date().getFullYear(),
        },
        mode: 'onChange',
    });

    const { handleSubmit, formState: { errors, isSubmitting }, reset } = form;

    // Handle PDF Upload
    const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            toast.error('Please upload a PDF file');
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/ingest', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (result.success && result.data) {
                const apiData = result.data;

                // Normalize rounds based on discriminated union type
                const normalizedRounds = Array.isArray(apiData.rounds)
                    ? apiData.rounds.map((round: any) => {
                        if (round.type === 'test') {
                            return {
                                type: 'test' as const,
                                roundNumber: round.roundNumber || 1,
                                topics: round.topics || '',
                                studySources: round.studySources || '',
                            };
                        }
                        if (round.type === 'hackathon') {
                            return {
                                type: 'hackathon' as const,
                                roundNumber: round.roundNumber || 1,
                                problemStatement: round.problemStatement || '',
                                strategy: round.strategy || '',
                            };
                        }
                        // Default: interview
                        return {
                            type: 'interview' as const,
                            roundNumber: round.roundNumber || 1,
                            interviewType: round.interviewType || 'technical',
                            questions: Array.isArray(round.questions) ? round.questions : [],
                            notes: round.notes || '',
                            duration: round.duration || '',
                        };
                    })
                    : [];

                reset({
                    studentName: apiData.studentName || '',
                    company: apiData.company || '',
                    role: apiData.role || '',
                    batch: apiData.batch || new Date().getFullYear().toString(),
                    courseBranch: apiData.courseBranch || '',
                    internshipDuration: apiData.internshipDuration || '',
                    eligibilityCriteria: apiData.eligibilityCriteria || '',
                    ctc: apiData.ctc || 0,
                    rounds: normalizedRounds,
                    finalVerdict: apiData.finalVerdict || 'selected',
                    tipsForJuniors: apiData.tipsForJuniors || '',
                    overallExperience: apiData.overallExperience || '',
                    tags: apiData.tags || [],
                    year: apiData.year || new Date().getFullYear(),
                });

                toast.success('PDF data extracted! Please review and edit as needed.');
                setCurrentStep(2); // Jump to rounds step to review
            } else {
                toast.error(result.error || 'Failed to extract data from PDF');
            }
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Error uploading PDF');
        } finally {
            setIsUploading(false);
        }
    };

    // Step navigation with explicit validation
    const nextStep = async () => {
        // Determine which fields belong to the current step
        let fieldsToValidate: (keyof ExperienceFormData)[] = [];

        if (currentStep === 1) {
            fieldsToValidate = ['studentName', 'company', 'role', 'batch', 'eligibilityCriteria', 'ctc'];
        } else if (currentStep === 2) {
            fieldsToValidate = ['rounds'];
        } else if (currentStep === 3) {
            fieldsToValidate = ['finalVerdict', 'tipsForJuniors'];
        }

        // Await the trigger - this is critical!
        const isValid = await form.trigger(fieldsToValidate);

        // Debug logging
        console.log('🔍 Validation Check:', {
            currentStep,
            fieldsToValidate,
            isValid,
            errors: form.formState.errors
        });

        if (isValid) {
            console.log('✅ Validation passed, moving to next step');
            setCurrentStep(currentStep + 1);
        } else {
            // Visual feedback
            toast.error('Please fill required fields');

            // Log specific field errors for debugging
            const errorMessages = Object.entries(form.formState.errors)
                .filter(([key]) => fieldsToValidate.includes(key as keyof ExperienceFormData))
                .map(([key, error]) => `${key}: ${error.message}`)
                .join(', ');

            console.log('🚨 Validation Errors:', errorMessages || 'No specific errors found');
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const onFormSubmit = async (data: ExperienceFormData) => {
        try {
            await onSubmit(data);
            toast.success('Experience shared successfully!');
            reset();
            setCurrentStep(1);
        } catch (error) {
            toast.error('Failed to submit experience');
            console.error('Submit error:', error);
        }
    };

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-black bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]">
            {/* Subtle Grid Pattern Overlay */}
            <div
                className="absolute inset-0 opacity-[0.05] pointer-events-none"
                style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.15) 1px, transparent 0)`,
                    backgroundSize: '40px 40px',
                }}
            />

            <div className="relative z-10 min-h-screen py-16 px-4">
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <motion.h1
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-6xl font-bold mb-4 tracking-tight"
                        >
                            <span className="bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-transparent">
                                Share Your Experience
                            </span>
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="text-zinc-400 text-lg font-light"
                        >
                            Help your juniors by sharing your placement journey
                        </motion.p>
                    </div>

                    {/* PDF Upload Button */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="mb-10 text-center"
                    >
                        <label
                            htmlFor="pdf-upload"
                            className={`inline-flex items-center gap-3 px-8 py-4 bg-white text-black font-semibold rounded-xl cursor-pointer transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] hover:scale-105 ${isUploading ? 'opacity-50 cursor-not-allowed scale-95' : ''
                                }`}
                        >
                            <Upload className="h-5 w-5" />
                            {isUploading ? (
                                <span className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                    Scanning PDF...
                                </span>
                            ) : (
                                'Auto-fill from PDF'
                            )}
                        </label>
                        <input
                            id="pdf-upload"
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            onChange={handlePDFUpload}
                            disabled={isUploading}
                        />
                        <p className="text-sm text-zinc-600 mt-3 font-light">Upload a PDF to auto-fill the form using AI</p>
                    </motion.div>

                    {/* Progress Indicator */}
                    <div className="mb-10 max-w-xl mx-auto">
                        <div className="flex items-center justify-between">
                            {STEPS.map((step, index) => (
                                <div key={step.id} className="flex items-center" style={{ flex: index < STEPS.length - 1 ? 1 : 'none' }}>
                                    {/* Step circle + label */}
                                    <div className="flex flex-col items-center" style={{ minWidth: '80px' }}>
                                        <div
                                            className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${currentStep > step.id
                                                ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.4)]'
                                                : currentStep === step.id
                                                    ? 'bg-white text-black ring-4 ring-white/20 shadow-[0_0_20px_rgba(255,255,255,0.4)]'
                                                    : 'bg-zinc-800/50 text-zinc-600 border border-zinc-700'
                                                }`}
                                        >
                                            {currentStep > step.id ? (
                                                <Check className="h-6 w-6" />
                                            ) : (
                                                step.id
                                            )}
                                        </div>
                                        <div className="mt-3 text-center">
                                            <p className={`text-sm font-semibold transition-colors ${currentStep >= step.id ? 'text-white' : 'text-zinc-600'}`}>
                                                {step.name}
                                            </p>
                                            <p className="text-xs text-zinc-600 mt-0.5">{step.description}</p>
                                        </div>
                                    </div>
                                    {/* Connector line */}
                                    {index < STEPS.length - 1 && (
                                        <div
                                            className={`h-0.5 flex-1 mx-4 rounded transition-all duration-300 self-start mt-6 ${currentStep > step.id ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.3)]' : 'bg-zinc-800'
                                                }`}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Form Container - Glass Morphic Panel */}
                    <form onSubmit={handleSubmit(onFormSubmit)}>
                        <div className="backdrop-blur-3xl bg-zinc-900/40 border border-white/10 shadow-2xl shadow-purple-500/10 rounded-3xl p-10 ring-1 ring-white/5">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentStep}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {currentStep === 1 && <BasicInfoStep form={form} />}
                                    {currentStep === 2 && <RoundBuilderStep form={form} />}
                                    {currentStep === 3 && <ConclusionStep form={form} />}
                                </motion.div>
                            </AnimatePresence>

                            {/* Navigation Buttons */}
                            <div className="flex justify-between mt-10 pt-8 border-t border-white/5">
                                <button
                                    type="button"
                                    onClick={prevStep}
                                    disabled={currentStep === 1}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${currentStep === 1
                                        ? 'opacity-30 cursor-not-allowed text-zinc-600'
                                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                    Previous
                                </button>

                                {currentStep < 3 ? (
                                    <button
                                        type="button"
                                        onClick={nextStep}
                                        className="flex items-center gap-2 px-8 py-3 bg-white text-black hover:bg-zinc-200 font-semibold rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]"
                                    >
                                        Next
                                        <ArrowRight className="h-5 w-5" />
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className={`flex items-center gap-2 px-8 py-3 bg-white text-black font-semibold rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.3)] ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-zinc-200 hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]'
                                            }`}
                                    >
                                        {isSubmitting ? 'Submitting...' : 'Submit Experience'}
                                        <Check className="h-5 w-5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </form>

                    {/* Error summary */}
                    {Object.keys(errors).length > 0 && (
                        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl backdrop-blur-sm">
                            <p className="text-red-400 text-sm font-semibold">Please fix the following errors:</p>
                            <ul className="mt-2 text-sm text-red-300/80 list-disc list-inside space-y-1">
                                {Object.entries(errors).map(([key, error]) => (
                                    <li key={key}>{error.message}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
