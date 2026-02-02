'use client';

import { useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import GlassCard from '@/components/GlassCard';
import { createExperience } from '@/actions/experience';
import { toast } from 'sonner';

interface ExtractedData {
    studentId?: string | null;
    company: string;
    role: string;
    ctc: number;
    year?: number | null;
    rounds?: Array<{
        roundNumber: number;
        roundType: string;
        questions: string[];
        description?: string | null;
        duration?: string | null;
    }>;
    tags?: string[];
}

export default function UploadTab() {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
    const [saving, setSaving] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setProgress(0);

        try {
            const formData = new FormData();
            formData.append('file', file);

            // Simulate progress
            const progressInterval = setInterval(() => {
                setProgress((prev) => Math.min(prev + 10, 90));
            }, 200);

            const response = await fetch('/api/ingest', {
                method: 'POST',
                body: formData,
            });

            clearInterval(progressInterval);
            setProgress(100);

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const result = await response.json();

            if (result.success && result.data) {
                setExtractedData(result.data);
                toast.success('PDF processed successfully! Review the extracted data below.');
            } else {
                throw new Error(result.error || 'Failed to extract data');
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Upload failed');
            setProgress(0);
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!extractedData) return;

        setSaving(true);
        try {
            // Ensure studentId is a string (use empty string if null/undefined)
            // Also convert null to undefined for rounds description and duration
            const dataToSave = {
                ...extractedData,
                studentId: extractedData.studentId || '',
                year: extractedData.year || undefined,
                rounds: extractedData.rounds?.map(round => ({
                    ...round,
                    description: round.description || undefined,
                    duration: round.duration || undefined,
                })),
            };

            const result = await createExperience(dataToSave);

            if (result.success) {
                toast.success('Experience saved successfully!');
                // Reset form
                setFile(null);
                setExtractedData(null);
                setProgress(0);
            } else {
                toast.error(result.error || 'Failed to save experience');
            }
        } catch (error) {
            toast.error('An error occurred while saving');
        } finally {
            setSaving(false);
        }
    };

    const updateField = (field: keyof ExtractedData, value: any) => {
        setExtractedData((prev) => prev ? { ...prev, [field]: value } : null);
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Upload Interview Experience</h2>

            {/* Upload Area */}
            {!extractedData && (
                <GlassCard className="p-8">
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        className="border-2 border-dashed border-white/30 rounded-lg p-12 text-center space-y-4 hover:border-white/50 transition-colors"
                    >
                        <Upload className="h-12 w-12 text-white/70 mx-auto" />
                        <div>
                            <p className="text-lg text-white/90 mb-2">
                                Drag and drop your PDF here, or click to browse
                            </p>
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handleFileChange}
                                className="hidden"
                                id="file-upload"
                            />
                            <label htmlFor="file-upload">
                                <Button variant="outline" className="mt-2 bg-white/10 border-white/20 text-white hover:bg-white/20" asChild>
                                    <span>Choose File</span>
                                </Button>
                            </label>
                        </div>
                        {file && (
                            <div className="flex items-center justify-center gap-2 text-white/90">
                                <FileText className="h-5 w-5" />
                                <span>{file.name}</span>
                                <button onClick={() => setFile(null)} className="ml-2">
                                    <X className="h-4 w-4 text-white/70 hover:text-white" />
                                </button>
                            </div>
                        )}
                    </div>

                    {file && !uploading && (
                        <Button
                            onClick={handleUpload}
                            className="w-full mt-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                        >
                            Process PDF
                        </Button>
                    )}

                    {uploading && (
                        <div className="mt-4 space-y-2">
                            <Progress value={progress} className="bg-white/20" />
                            <p className="text-sm text-white/70 text-center">Processing PDF... {progress}%</p>
                        </div>
                    )}
                </GlassCard>
            )}

            {/* Review Form */}
            {extractedData && (
                <GlassCard className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-semibold text-white">Review Extracted Data</h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setExtractedData(null);
                                setFile(null);
                                setProgress(0);
                            }}
                            className="text-white/70 hover:text-white hover:bg-white/10"
                        >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                        </Button>
                    </div>

                    <div className="grid gap-4">
                        <div>
                            <label className="text-sm font-medium text-white/90 mb-2 block">Student ID</label>
                            <Input
                                value={extractedData.studentId || ''}
                                onChange={(e) => updateField('studentId', e.target.value)}
                                className="bg-white/10 border-white/20 text-white"
                                placeholder="e.g., 21XYZ123"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-white/90 mb-2 block">Company</label>
                                <Input
                                    value={extractedData.company}
                                    onChange={(e) => updateField('company', e.target.value)}
                                    className="bg-white/10 border-white/20 text-white"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-white/90 mb-2 block">Role</label>
                                <Input
                                    value={extractedData.role}
                                    onChange={(e) => updateField('role', e.target.value)}
                                    className="bg-white/10 border-white/20 text-white"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-white/90 mb-2 block">CTC (LPA)</label>
                                <Input
                                    type="number"
                                    value={extractedData.ctc}
                                    onChange={(e) => updateField('ctc', parseFloat(e.target.value))}
                                    className="bg-white/10 border-white/20 text-white"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-white/90 mb-2 block">Year</label>
                                <Input
                                    type="number"
                                    value={extractedData.year || ''}
                                    onChange={(e) => updateField('year', parseInt(e.target.value))}
                                    className="bg-white/10 border-white/20 text-white"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-white/90 mb-2 block">Tags</label>
                            <Input
                                value={extractedData.tags?.join(', ') || ''}
                                onChange={(e) => updateField('tags', e.target.value.split(',').map((t) => t.trim()))}
                                className="bg-white/10 border-white/20 text-white"
                                placeholder="e.g., JavaScript, React, Node.js"
                            />
                        </div>

                        {/* Rounds */}
                        <div>
                            <label className="text-sm font-medium text-white/90 mb-2 block">Interview Rounds</label>
                            <div className="space-y-4">
                                {extractedData.rounds?.map((round, idx) => (
                                    <GlassCard key={idx} className="p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-white font-medium">Round {round.roundNumber}: {round.roundType}</span>
                                        </div>
                                        <Textarea
                                            value={round.questions.join('\n')}
                                            onChange={(e) => {
                                                const newRounds = [...(extractedData.rounds || [])];
                                                newRounds[idx].questions = e.target.value.split('\n').filter((q) => q.trim());
                                                updateField('rounds', newRounds);
                                            }}
                                            className="bg-white/10 border-white/20 text-white min-h-[100px]"
                                            placeholder="One question per line"
                                        />
                                    </GlassCard>
                                ))}
                            </div>
                        </div>
                    </div>

                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-6"
                    >
                        {saving ? 'Saving...' : 'Save Experience'}
                    </Button>
                </GlassCard>
            )}
        </div>
    );
}
