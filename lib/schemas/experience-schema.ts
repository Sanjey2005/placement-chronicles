import { z } from 'zod';

// ============================================================================
// STEP 1: Basic Info Schema
// ============================================================================
export const basicInfoSchema = z.object({
    studentName: z.string().min(2, 'Name must be at least 2 characters'),
    company: z.string().min(2, 'Company name is required'),
    role: z.string().min(2, 'Role is required'),
    batch: z.string().min(4, 'Please select a batch year'),
    courseBranch: z.string().min(2, 'Course & Branch is required (e.g., BTech CSE)'),
    eligibilityCriteria: z.string().min(10, 'Please provide eligibility criteria (min 10 characters)'),
    ctc: z.number().min(0, 'CTC must be a positive number'),
    internshipDuration: z.string().default(''),
});

// ============================================================================
// STEP 2: Round Builder Schema (Discriminated Unions)
// ============================================================================

// Online Test Round — topics & studySources are plain strings
export const onlineTestRoundSchema = z.object({
    type: z.literal('test'),
    roundNumber: z.number().min(1),
    topics: z.string().min(1, 'Topics are required (e.g. DSA, OS, DBMS)'),
    studySources: z.string().default(''),
});

// Hackathon Round — problemStatement & strategy
export const hackathonRoundSchema = z.object({
    type: z.literal('hackathon'),
    roundNumber: z.number().min(1),
    problemStatement: z.string().min(5, 'Please describe the problem statement'),
    strategy: z.string().min(5, 'Please describe your approach/strategy'),
});

// Interview Round — interviewType, questions, notes, duration
export const interviewRoundSchema = z.object({
    type: z.literal('interview'),
    roundNumber: z.number().min(1),
    interviewType: z.enum(['technical', 'hr', 'managerial', 'mixed']).default('technical'),
    questions: z.array(
        z.object({
            question: z.string().min(3, 'Question must be at least 3 characters'),
            answerTip: z.string().default(''),
        })
    ).optional().default([]),
    notes: z.string().default(''),
    duration: z.string().default(''),
});

// Discriminated Union for all round types
export const roundSchema = z.discriminatedUnion('type', [
    onlineTestRoundSchema,
    hackathonRoundSchema,
    interviewRoundSchema,
]);

// Step 2 Schema: Array of rounds
export const roundBuilderSchema = z.object({
    rounds: z.array(roundSchema).min(1, 'At least one round is required'),
});

// ============================================================================
// STEP 3: Conclusion Schema
// ============================================================================
export const conclusionSchema = z.object({
    finalVerdict: z.enum(['selected', 'rejected', 'waitlisted', 'ongoing']),
    tipsForJuniors: z.string().min(20, 'Please share some tips for juniors (min 20 characters)'),
    overallExperience: z.string().default(''),
});

// ============================================================================
// Complete Form Schema (All Steps Combined)
// ============================================================================
export const experienceFormSchema = basicInfoSchema
    .merge(roundBuilderSchema)
    .merge(conclusionSchema)
    .extend({
        tags: z.array(z.string()).optional().default([]),
        year: z.number().optional(),
    });

// ============================================================================
// Type Exports
// ============================================================================
export type BasicInfo = z.infer<typeof basicInfoSchema>;
export type OnlineTestRound = z.infer<typeof onlineTestRoundSchema>;
export type HackathonRound = z.infer<typeof hackathonRoundSchema>;
export type InterviewRound = z.infer<typeof interviewRoundSchema>;
export type Round = z.infer<typeof roundSchema>;
export type RoundBuilder = z.infer<typeof roundBuilderSchema>;
export type Conclusion = z.infer<typeof conclusionSchema>;
export type ExperienceFormData = z.infer<typeof experienceFormSchema>;

// ============================================================================
// Helper: Default Round Templates
// ============================================================================
export const getDefaultRound = (type: 'test' | 'hackathon' | 'interview', roundNumber: number): Round => {
    switch (type) {
        case 'test':
            return {
                type: 'test',
                roundNumber,
                topics: '',
                studySources: '',
            };
        case 'hackathon':
            return {
                type: 'hackathon',
                roundNumber,
                problemStatement: '',
                strategy: '',
            };
        case 'interview':
            return {
                type: 'interview',
                roundNumber,
                interviewType: 'technical',
                questions: [],
                notes: '',
                duration: '',
            };
    }
};

// ============================================================================
// Helper: Validation for PDF Auto-fill
// ============================================================================
export const pdfExtractionSchema = experienceFormSchema.partial({
    tipsForJuniors: true,
    overallExperience: true,
});

export type PDFExtractionData = z.infer<typeof pdfExtractionSchema>;
