import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICompany extends Document {
    canonicalName: string;
    aliases: string[];
    createdAt: Date;
    updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>(
    {
        canonicalName: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
        },
        aliases: {
            type: [String],
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

const Company: Model<ICompany> =
    mongoose.models.Company || mongoose.model<ICompany>('Company', CompanySchema);

export default Company;
