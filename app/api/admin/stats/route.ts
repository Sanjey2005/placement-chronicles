import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Experience from '@/models/Experience';
import { requireAdmin } from '@/lib/auth-check';

export async function GET(request: NextRequest) {
    if (!(await requireAdmin(request))) {
        return NextResponse.json({ success: false, error: 'Forbidden: Admin access only' }, { status: 403 });
    }

    try {
        await dbConnect();

        const [total, pending, flagged, approved, rejected] = await Promise.all([
            Experience.countDocuments(),
            Experience.countDocuments({ status: 'PENDING' }),
            Experience.countDocuments({ status: 'FLAGGED' }),
            Experience.countDocuments({ status: 'APPROVED' }),
            Experience.countDocuments({ status: 'REJECTED' }),
        ]);

        return NextResponse.json({
            success: true,
            data: { total, pending, flagged, approved, rejected },
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'An internal server error occurred while fetching admin stats' },
            { status: 500 }
        );
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
