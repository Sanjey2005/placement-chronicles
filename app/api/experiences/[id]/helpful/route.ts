import { NextRequest, NextResponse } from 'next/server';
import { isValidObjectId } from 'mongoose';
import dbConnect from '@/lib/db';
import { getSession } from '@/lib/auth-check';
import { helpfulVoterId } from '@/lib/helpful';
import Experience from '@/models/Experience';
import HelpfulVote from '@/models/HelpfulVote';

const fail = (status: number, error: string) => NextResponse.json({ success: false, error }, { status });

/**
 * PUT { helpful: boolean } sets the signed-in student's vote on one experience.
 * It sets a state rather than toggling one, so double taps and retries can't
 * double-count. Returns the new total.
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession(request);
    if (!session || session.role !== 'user') return fail(403, 'Only signed-in students can mark experiences as helpful');

    const { id } = await params;
    if (!isValidObjectId(id)) return fail(400, 'Unknown experience');

    let helpful: unknown;
    try {
        ({ helpful } = await request.json());
    } catch {
        return fail(400, 'Expected { helpful: true | false }');
    }
    if (typeof helpful !== 'boolean') return fail(400, 'Expected { helpful: true | false }');

    const voterId = helpfulVoterId(session.sub);
    if (!voterId) return fail(500, 'Voting is not configured');

    try {
        await dbConnect();
        const experience = await Experience.findOne({ _id: id, status: 'APPROVED' }).select('studentId').lean();
        if (!experience) return fail(404, 'Unknown experience');
        if (experience.studentId === session.sub) return fail(403, "You can't mark your own experience as helpful");

        if (helpful) {
            try {
                await HelpfulVote.updateOne({ experienceId: id, voterId }, { $setOnInsert: { experienceId: id, voterId } }, { upsert: true });
            } catch (error) {
                // Two simultaneous upserts: the unique index already holds the vote
                if ((error as { code?: number }).code !== 11000) throw error;
            }
        } else {
            await HelpfulVote.deleteOne({ experienceId: id, voterId });
        }

        const count = await HelpfulVote.countDocuments({ experienceId: id });
        return NextResponse.json({ success: true, helpful, count });
    } catch (error) {
        console.error('[helpful] vote failed:', error instanceof Error ? error.message : String(error));
        return fail(500, 'Could not save your vote');
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
