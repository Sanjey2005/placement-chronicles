import mongoose, { Schema, Document, Model } from 'mongoose';

// Interface for a single interview round
export interface IRound {
    roundNumber: number;
    roundType: string; // e.g., "Technical", "HR", "Aptitude", "Coding"
    questions: string[];
    description?: string;
    duration?: string;
}

// Interface for the Experience document
export interface IExperience extends Document {
    studentId: string;
    company: string;
    role: string;
    ctc: number; // Compensation in lakhs or as appropriate
    rounds: IRound[];
    embedding?: number[]; // Vector embedding for semantic search
    tags?: string[]; // Optional tags for categorization
    year?: number; // Year of placement
    createdAt: Date;
    updatedAt: Date;
}

// Schema for interview rounds
const RoundSchema = new Schema<IRound>({
    roundNumber: {
        type: Number,
        required: true,
    },
    roundType: {
        type: String,
        required: true,
    },
    questions: {
        type: [String],
        default: [],
    },
    description: {
        type: String,
    },
    duration: {
        type: String,
    },
});

// Schema for Experience
const ExperienceSchema = new Schema<IExperience>(
    {
        studentId: {
            type: String,
            required: true,
            index: true,
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
        rounds: {
            type: [RoundSchema],
            default: [],
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
        timestamps: true, // Automatically adds createdAt and updatedAt
    }
);

// Create indexes for better query performance
ExperienceSchema.index({ company: 1, role: 1 });
ExperienceSchema.index({ studentId: 1, company: 1 });

// Prevent model recompilation in development
const Experience: Model<IExperience> =
    mongoose.models.Experience ||
    mongoose.model<IExperience>('Experience', ExperienceSchema);

export default Experience;
