import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import AdminLog from '@/models/AdminLog';

export async function GET(request: NextRequest) {
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');

        const logs = await AdminLog.find()
            .sort({ timestamp: -1 })
            .limit(limit)
            .lean();

        const serialized = logs.map(log => ({
            ...log,
            _id: (log._id as any).toString(),
        }));

        return NextResponse.json({
            success: true,
            data: serialized,
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'An internal server error occurred while fetching admin logs' },
            { status: 500 }
        );
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
