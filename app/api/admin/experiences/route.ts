import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Experience from '@/models/Experience';
import AdminLog from '@/models/AdminLog';
import { requireAdmin } from '@/lib/auth-check';

// GET: Fetch experiences with optional status filter
export async function GET(request: NextRequest) {
    if (!requireAdmin(request)) {
        return NextResponse.json({ success: false, error: 'Forbidden: Admin access only' }, { status: 403 });
    }

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
        return NextResponse.json(
            { success: false, error: 'An internal server error occurred while fetching admin experiences' },
            { status: 500 }
        );
    }
}

// PATCH: Update experience status (approve/reject)
export async function PATCH(request: NextRequest) {
    if (!requireAdmin(request)) {
        return NextResponse.json({ success: false, error: 'Forbidden: Admin access only' }, { status: 403 });
    }

    try {
        const { id, action } = await request.json();

        // NoSQL Injection Fix: Ensure ID is a string to prevent query object injection
        if (typeof id !== 'string' || id.trim() === '') {
            return NextResponse.json(
                { success: false, error: 'invalid id or action format' },
                { status: 400 }
            );
        }

        if (!action || typeof action !== 'string') {
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
        return NextResponse.json(
            { success: false, error: 'An internal server error occurred while updating experience status' },
            { status: 500 }
        );
    }
}

// DELETE: Permanently delete an experience (admin only)
export async function DELETE(request: NextRequest) {
    if (!requireAdmin(request)) {
        return NextResponse.json({ success: false, error: 'Forbidden: Admin access only' }, { status: 403 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        // NoSQL Injection / Validation Fix: Ensure ID is present and valid
        if (!id || typeof id !== 'string') {
            return NextResponse.json(
                { success: false, error: 'invalid id format' },
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

        // PERMANENT DELETE: Remove document immediately (no backups)
        await Experience.findByIdAndDelete(id);

        // Create admin log entry
        await AdminLog.create({
            action: 'DELETE',
            adminId: 'sanjey$12',
            targetId: id,
            details: `Permanently deleted experience by ${(experience as any).studentName || 'Unknown'} at ${(experience as any).company || 'Unknown'}`,
            rollNumber: (experience as any).studentId, // Capture student roll number
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'An internal server error occurred while deleting experience' },
            { status: 500 }
        );
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
