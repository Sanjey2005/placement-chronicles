import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAdminLog extends Document {
    action: string;       // 'APPROVE' | 'REJECT' | 'DELETE' | 'FLAG'
    adminId: string;      // Admin identifier
    targetId: string;     // Experience ID that was acted upon
    details?: string;     // Additional context (e.g., company name, student)
    rollNumber?: string;  // Roll number of the person who performed the action (if pertinent)
    timestamp: Date;
}

const AdminLogSchema = new Schema<IAdminLog>(
    {
        action: {
            type: String,
            required: true,
            index: true,
        },
        adminId: {
            type: String,
            required: true,
        },
        targetId: {
            type: String,
            required: true,
        },
        details: {
            type: String,
        },
        rollNumber: {
            type: String,
        },
        timestamp: {
            type: Date,
            default: Date.now,
            index: true,
        },
    }
);

// Sort by most recent first
AdminLogSchema.index({ timestamp: -1 });

const AdminLog: Model<IAdminLog> =
    mongoose.models.AdminLog ||
    mongoose.model<IAdminLog>('AdminLog', AdminLogSchema);

export default AdminLog;
