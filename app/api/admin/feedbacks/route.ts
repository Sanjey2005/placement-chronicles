import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Feedback from '@/models/Feedback';
import { requireAdmin } from '@/lib/auth-check';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    if (!(await requireAdmin(request))) {
        return NextResponse.json({ success: false, error: 'Forbidden: Admin access only' }, { status: 403 });
    }

    try {
        await connectToDatabase();

        const feedbacks = await Feedback.find().sort({ createdAt: -1 });

        return NextResponse.json({ success: true, data: feedbacks });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'An internal server error occurred while fetching feedbacks' },
            { status: 500 }
        );
    }
}
