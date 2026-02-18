import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Experience from '@/models/Experience';

export async function GET(request: NextRequest) {
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
        console.error('Error fetching admin stats:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch stats' },
            { status: 500 }
        );
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
