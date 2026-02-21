import mongoose, { Schema, Document, Model } from 'mongoose';

// ============================================================================
// ExperienceChunk Document Interface
// ============================================================================
export interface IExperienceChunk extends Document {
    experienceId: mongoose.Types.ObjectId;
    text: string;
    embedding: number[];
    metadata: {
        companyName: string;
        roleType: string;
        studentName: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

// ============================================================================
// Mongoose Schema
// ============================================================================
const ExperienceChunkSchema = new Schema<IExperienceChunk>(
    {
        experienceId: {
            type: Schema.Types.ObjectId,
            ref: 'Experience',
            required: true,
            index: true,
        },
        text: {
            type: String,
            required: true,
        },
        embedding: {
            type: [Number],
            required: true,
        },
        metadata: {
            companyName: {
                type: String,
                required: true,
                index: true,
            },
            roleType: {
                type: String,
                required: true,
            },
            studentName: {
                type: String,
                required: true,
            },
        },
    },
    {
        timestamps: true,
    }
);

// ============================================================================
// Indexes
// ============================================================================
// Useful if we fall back to manual text scraping filters
ExperienceChunkSchema.index({ 'metadata.companyName': 1 });

// ============================================================================
// Model Export
// ============================================================================
const ExperienceChunk: Model<IExperienceChunk> =
    mongoose.models.ExperienceChunk ||
    mongoose.model<IExperienceChunk>('ExperienceChunk', ExperienceChunkSchema);

export default ExperienceChunk;
