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
// Enums & Types
// ============================================================================

export type PlacementType = 'ON_CAMPUS' | 'OFF_CAMPUS';
export type RoleType = 'FULL_TIME' | 'INTERNSHIP' | 'SUMMER_INTERNSHIP';
export type Verdict = 'ACCEPTED' | 'REJECTED';

export const PLACEMENT_TYPES = ['ON_CAMPUS', 'OFF_CAMPUS'];
export const ROLE_TYPES = ['FULL_TIME', 'INTERNSHIP', 'SUMMER_INTERNSHIP'];
export const WORK_MODELS = ['ON_SITE', 'WFH', 'HYBRID'];
export const VERDICTS = ['ACCEPTED', 'REJECTED'];

// ============================================================================
// Experience Document Interface
// ============================================================================
export interface IExperience extends Document {
    studentId: string;
    studentName?: string;
    company: string;
    role: string;
    ctc: number;
    placementType?: PlacementType;
    roleType?: RoleType;
    workModel?: 'ON_SITE' | 'WFH' | 'HYBRID';
    verdict?: Verdict;
    historyOfBacklogs?: string; // 'Allowed' | 'Not Allowed'
    standingBacklogs?: string; // 'Allowed' | 'Not Allowed'
    batch?: string;
    courseBranch?: string;
    minCGPA?: number;
    rounds: IRound[];
    finalVerdict?: 'selected' | 'rejected'; // NEW
    tipsForJuniors?: string; // NEW
    overallExperience?: string; // NEW
    status: 'PENDING' | 'APPROVED' | 'FLAGGED' | 'REJECTED' | 'ARCHIVED';
    moderationReason?: string;
    needsCompanyNormalization?: boolean;
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
        placementType: {
            type: String,
            enum: PLACEMENT_TYPES,
        },
        roleType: {
            type: String,
            enum: ROLE_TYPES,
        },
        workModel: {
            type: String,
            enum: WORK_MODELS,
        },
        verdict: {
            type: String,
            enum: VERDICTS,
        },
        historyOfBacklogs: {
            type: String,
            enum: ['Allowed', 'Not Allowed'],
        },
        standingBacklogs: {
            type: String,
            enum: ['Allowed', 'Not Allowed'],
        },
        batch: {
            type: String,
        },
        courseBranch: {
            type: String,
        },
        minCGPA: {
            type: Number,
        },
        rounds: {
            type: Schema.Types.Mixed,
            default: [],
        },
        finalVerdict: {
            type: String,
            enum: ['selected', 'rejected'],
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
        status: {
            type: String,
            enum: ['PENDING', 'APPROVED', 'FLAGGED', 'REJECTED', 'ARCHIVED'],
            default: 'PENDING',
            index: true,
        },
        moderationReason: {
            type: String,
            default: null,
        },
        needsCompanyNormalization: {
            type: Boolean,
            default: false,
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
