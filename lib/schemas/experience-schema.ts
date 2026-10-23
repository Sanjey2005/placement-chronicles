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
    ctc: z.number({ error: 'Please enter the CTC/stipend' }).min(0, 'CTC must be a positive number'),
    minCGPA: z.number({ error: 'Please enter the minimum CGPA' }).min(0).max(10, 'CGPA must be between 0 and 10'),
    placementType: z.enum(['ON_CAMPUS', 'OFF_CAMPUS'], { message: 'Please select placement type' }),
    roleType: z.enum(['FULL_TIME', 'INTERNSHIP', 'SUMMER_INTERNSHIP'], { message: 'Please select role type' }),
    workModel: z.enum(['ON_SITE', 'WFH', 'HYBRID'], { message: 'Please select a work model' }),
    historyOfBacklogs: z.enum(['Allowed', 'Not Allowed'], { message: 'Please select backlog history' }),
    standingBacklogs: z.enum(['Allowed', 'Not Allowed'], { message: 'Please select standing backlogs' }),
});

// ============================================================================
// STEP 2: Round Builder Schema (Discriminated Unions)
// ============================================================================

// Online Test Round — topics & studySources are plain strings
export const onlineTestRoundSchema = z.object({
    type: z.literal('test'),
    roundNumber: z.number().min(1),
    topics: z.string().min(1, 'Topics are required (e.g. DSA, OS, DBMS)'),
    questions: z.array(
        z.object({
            question: z.string().optional().default(''),
            answerTip: z.string().optional().default(''),
        }).superRefine((val, ctx) => {
            if ((val.question?.trim().length || 0) === 0 && (val.answerTip?.trim().length || 0) === 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Please provide either a Question or an Answer/Tip",
                    path: ["question"],
                });
            }
        })
    ).optional().default([]),
    studySources: z.string().default(''),
});

// Hackathon Round — problemStatement & strategy
export const hackathonRoundSchema = z.object({
    type: z.literal('hackathon'),
    roundNumber: z.number().min(1),
    problemStatement: z.string().min(5, 'Please describe the problem statement'),
    strategy: z.string().min(5, 'Please describe your approach/strategy'),
    links: z.array(z.object({
        type: z.enum(['youtube', 'github', 'drive', 'other']),
        // http(s) only: z.url() alone also accepts javascript: and data: links
        url: z.string().url({ protocol: /^https?$/, message: 'Please enter a valid URL' })
    })).optional().default([]),
});

// Group Discussion Round — topics & tips
export const groupDiscussionRoundSchema = z.object({
    type: z.literal('gd'),
    roundNumber: z.number().min(1),
    topics: z.string().min(5, 'Please describe the GD topic(s)'),
    tips: z.string().default(''),
});

// Interview Round — interviewType, questions, notes, duration
export const interviewRoundSchema = z.object({
    type: z.literal('interview'),
    roundNumber: z.number().min(1),
    interviewType: z.enum(['technical', 'hr', 'managerial', 'mixed']).default('technical'),
    questions: z.array(
        z.object({
            question: z.string().optional().default(''),
            answerTip: z.string().optional().default(''),
        }).superRefine((val, ctx) => {
            if ((val.question?.trim().length || 0) === 0 && (val.answerTip?.trim().length || 0) === 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Please provide either a Question or an Answer/Tip",
                    path: ["question"],
                });
            }
        })
    ).optional().default([]),
    notes: z.string().default(''),
    duration: z.string().default(''),
}).superRefine((val, ctx) => {
    // Need at least one valid question OR some notes
    const hasValidQuestions = val.questions && val.questions.length > 0;
    const hasNotes = val.notes.trim().length > 0;

    if (!hasValidQuestions && !hasNotes) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Please add at least one Question or provide Additional Notes for this interview round.",
            path: ["questions"], // Attach to questions for UI
        });
    }
});

// Discriminated Union for all round types
export const roundSchema = z.discriminatedUnion('type', [
    onlineTestRoundSchema,
    hackathonRoundSchema,
    interviewRoundSchema,
    groupDiscussionRoundSchema,
]);

// Step 2 Schema: Array of rounds + global resume flag
export const roundBuilderSchema = z.object({
    rounds: z.array(roundSchema).min(1, 'At least one round is required'),
    resumeShortlisting: z.boolean().default(false),
});

// ============================================================================
// STEP 3: Conclusion Schema
// ============================================================================
export const conclusionSchema = z.object({
    finalVerdict: z.enum(['selected', 'rejected'], { error: 'Please select an outcome' }),
    tipsForJuniors: z.string().default(''),
    overallExperience: z.string().optional(),
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
export type GroupDiscussionRound = z.infer<typeof groupDiscussionRoundSchema>;
export type Round = z.infer<typeof roundSchema>;
export type RoundBuilder = z.infer<typeof roundBuilderSchema>;
export type Conclusion = z.infer<typeof conclusionSchema>;
export type ExperienceFormData = z.infer<typeof experienceFormSchema>;

// ============================================================================
// Helper: Default Round Templates
// ============================================================================
export const getDefaultRound = (type: 'test' | 'hackathon' | 'interview' | 'gd', roundNumber: number): Round => {
    switch (type) {
        case 'test':
            return {
                type: 'test',
                roundNumber,
                topics: '',
                questions: [],
                studySources: '',
            };
        case 'hackathon':
            return {
                type: 'hackathon',
                roundNumber,
                problemStatement: '',
                strategy: '',
                links: [],
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
        case 'gd':
            return {
                type: 'gd',
                roundNumber,
                topics: '',
                tips: '',
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
