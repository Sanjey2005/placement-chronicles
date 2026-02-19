import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Experience from '@/models/Experience';
import AdminLog from '@/models/AdminLog';

// GET: Fetch experiences with optional status filter
export async function GET(request: NextRequest) {
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');

        const query: any = {};
        if (status && status !== 'ALL') {
            query.status = status;
        }

        const [experiences, total] = await Promise.all([
            Experience.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Experience.countDocuments(query),
        ]);

        const serialized = experiences.map(exp => ({
            ...exp,
            _id: (exp._id as any).toString(),
        }));

        return NextResponse.json({
            success: true,
            data: serialized,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error('Error fetching admin experiences:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch experiences' },
            { status: 500 }
        );
    }
}

// PATCH: Update experience status (approve/reject)
export async function PATCH(request: NextRequest) {
    try {
        const { id, action } = await request.json();

        if (!id || !action) {
            return NextResponse.json(
                { success: false, error: 'id and action are required' },
                { status: 400 }
            );
        }

        const statusMap: Record<string, string> = {
            APPROVE: 'APPROVED',
            REJECT: 'REJECTED',
        };

        const newStatus = statusMap[action.toUpperCase()];
        if (!newStatus) {
            return NextResponse.json(
                { success: false, error: 'Invalid action. Use APPROVE or REJECT.' },
                { status: 400 }
            );
        }

        await dbConnect();

        const experience = await Experience.findByIdAndUpdate(
            id,
            { status: newStatus },
            { new: true }
        ).lean();

        if (!experience) {
            return NextResponse.json(
                { success: false, error: 'Experience not found' },
                { status: 404 }
            );
        }

        // Create admin log entry
        await AdminLog.create({
            action: action.toUpperCase(),
            adminId: 'sanjey$12',
            targetId: id,
            details: `${action.toUpperCase()} experience by ${(experience as any).studentName || 'Unknown'} at ${(experience as any).company || 'Unknown'}`,
            rollNumber: (experience as any).studentId, // Capture student roll number
        });

        return NextResponse.json({
            success: true,
            data: { ...experience, _id: (experience._id as any).toString() },
        });
    } catch (error) {
        console.error('Error updating experience status:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update experience' },
            { status: 500 }
        );
    }
}

// DELETE: Delete an experience
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'id is required' },
                { status: 400 }
            );
        }

        await dbConnect();

        const experience = await Experience.findById(id).lean();
        if (!experience) {
            return NextResponse.json(
                { success: false, error: 'Experience not found' },
                { status: 404 }
            );
        }

        await Experience.findByIdAndDelete(id);

        // Create admin log entry
        await AdminLog.create({
            action: 'DELETE',
            adminId: 'sanjey$12',
            targetId: id,
            details: `Deleted experience by ${(experience as any).studentName || 'Unknown'} at ${(experience as any).company || 'Unknown'}`,
            rollNumber: (experience as any).studentId, // Capture student roll number
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting experience:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete experience' },
            { status: 500 }
        );
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
