import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Feedback from '@/models/Feedback';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const authToken = request.cookies.get('auth-token')?.value;
        if (authToken !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        await connectToDatabase();

        const feedbacks = await Feedback.find().sort({ createdAt: -1 });

        return NextResponse.json({ success: true, data: feedbacks });
    } catch (error) {
        console.error('Error fetching feedbacks:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch feedbacks' },
            { status: 500 }
        );
    }
}
