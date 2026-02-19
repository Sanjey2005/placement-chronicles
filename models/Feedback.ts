import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFeedback extends Document {
    studentId: string;
    message: string;
    createdAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>(
    {
        studentId: {
            type: String,
            required: true,
            index: true,
        },
        message: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

const Feedback: Model<IFeedback> =
    mongoose.models.Feedback || mongoose.model<IFeedback>('Feedback', FeedbackSchema);

export default Feedback;
