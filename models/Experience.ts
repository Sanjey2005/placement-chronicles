import mongoose, { Schema, Document, Model } from 'mongoose';

// ============================================================================
// NEW: Round Types (Discriminated Union Support)
// ============================================================================

// Online Test Round
export interface IOnlineTestRound {
    type: 'test';
    roundNumber: number;
    topics: string;
    studySources?: string;
}

// Hackathon Round
export interface IHackathonRound {
    type: 'hackathon';
    roundNumber: number;
    problemStatement: string;
    strategy: string;
}

// Interview Round
export interface IInterviewRound {
    type: 'interview';
    roundNumber: number;
    interviewType?: 'technical' | 'hr' | 'managerial' | 'mixed';
    questions: Array<{
        question: string;
        answerTip: string;
    }>;
    notes?: string;
    duration?: string;
}

// Legacy Round (for backward compatibility)
export interface ILegacyRound {
    roundNumber: number;
    roundType: string;
    questions: string[];
    description?: string;
    duration?: string;
}

// Union type for all rounds
export type IRound = IOnlineTestRound | IHackathonRound | IInterviewRound | ILegacyRound;

// ============================================================================
// Experience Document Interface
// ============================================================================
export interface IExperience extends Document {
    studentId: string;
    studentName?: string;
    company: string;
    role: string;
    ctc: number;
    batch?: string;
    courseBranch?: string;
    internshipDuration?: string;
    eligibilityCriteria?: string; // NEW: e.g., "CGPA > 7.5"
    rounds: IRound[];
    finalVerdict?: 'selected' | 'rejected' | 'waitlisted' | 'ongoing'; // NEW
    tipsForJuniors?: string; // NEW
    overallExperience?: string; // NEW
    embedding?: number[];
    tags?: string[];
    year?: number;
    createdAt: Date;
    updatedAt: Date;
}

// ============================================================================
// Mongoose Schema
// ============================================================================

// Using Mixed type for flexible round structure (supports discriminated unions)
const ExperienceSchema = new Schema<IExperience>(
    {
        studentId: {
            type: String,
            required: true,
            index: true,
        },
        studentName: {
            type: String,
        },
        company: {
            type: String,
            required: true,
            index: true,
        },
        role: {
            type: String,
            required: true,
        },
        ctc: {
            type: Number,
            required: true,
        },
        batch: {
            type: String,
        },
        courseBranch: {
            type: String,
        },
        internshipDuration: {
            type: String,
        },
        eligibilityCriteria: {
            type: String,
        },
        rounds: {
            type: Schema.Types.Mixed,
            default: [],
        },
        finalVerdict: {
            type: String,
            enum: ['selected', 'rejected', 'waitlisted', 'ongoing'],
        },
        tipsForJuniors: {
            type: String,
        },
        overallExperience: {
            type: String,
        },
        embedding: {
            type: [Number],
            default: undefined,
        },
        tags: {
            type: [String],
            default: [],
        },
        year: {
            type: Number,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

// ============================================================================
// Indexes
// ============================================================================
ExperienceSchema.index({ company: 1, role: 1 });
ExperienceSchema.index({ studentId: 1, company: 1 });
ExperienceSchema.index({ batch: 1 });
ExperienceSchema.index({ finalVerdict: 1 });

// ============================================================================
// Model Export
// ============================================================================
const Experience: Model<IExperience> =
    mongoose.models.Experience ||
    mongoose.model<IExperience>('Experience', ExperienceSchema);

export default Experience;
