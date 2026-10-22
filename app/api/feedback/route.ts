import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Feedback from '@/models/Feedback';
import { getSession } from '@/lib/auth-check';

export async function POST(request: NextRequest) {
    try {
        // Identity comes from the signed session, never from a client-writable cookie
        const session = await getSession(request);
        if (!session) {
            return NextResponse.json(
                { success: false, error: 'You must be logged in to submit feedback' },
                { status: 401 }
            );
        }

        const { message } = await request.json();

        if (typeof message !== 'string' || message.trim().length === 0) {
            return NextResponse.json(
                { success: false, error: 'Feedback message cannot be empty' },
                { status: 400 }
            );
        }

        await connectToDatabase();

        await Feedback.create({
            studentId: session.sub,
            message,
        });

        return NextResponse.json({ success: true, message: 'Feedback submitted successfully' });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'An internal server error occurred while submitting feedback' },
            { status: 500 }
        );
    }
}
