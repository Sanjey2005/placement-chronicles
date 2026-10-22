import mongoose, { Schema, Model, Types } from 'mongoose';

/**
 * One student marking one experience as helpful. The unique index makes it one
 * vote per student per experience at the database level. voterId is a salted
 * one-way hash (lib/helpful.ts), so no roll number is stored.
 */
export interface IHelpfulVote {
    experienceId: Types.ObjectId;
    voterId: string;
    createdAt: Date;
}

const HelpfulVoteSchema = new Schema<IHelpfulVote>(
    {
        experienceId: { type: Schema.Types.ObjectId, ref: 'Experience', required: true },
        voterId: { type: String, required: true, index: true },
    },
    { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

HelpfulVoteSchema.index({ experienceId: 1, voterId: 1 }, { unique: true });

const HelpfulVote: Model<IHelpfulVote> =
    mongoose.models.HelpfulVote || mongoose.model<IHelpfulVote>('HelpfulVote', HelpfulVoteSchema);

export default HelpfulVote;
