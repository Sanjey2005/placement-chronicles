import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Experience from '@/models/Experience';
import { getEmbedding } from '@/lib/vector';
import { experienceFormSchema } from '@/lib/schemas/experience-schema';

// Helper function to generate searchable text from experience data
function generateSearchText(data: any): string {
    let text = `${data.company} ${data.role} ${data.batch || ''} ${data.eligibilityCriteria || ''} ${data.tipsForJuniors || ''}`;

    // Add round-specific text
    if (data.rounds && Array.isArray(data.rounds)) {
        data.rounds.forEach((round: any) => {
            if (round.type === 'test') {
                text += ` ${round.topics?.join(' ') || ''}`;
            } else if (round.type === 'hackathon') {
                text += ` ${round.experience || ''} ${round.problemStatement || ''}`;
            } else if (round.type === 'interview') {
                round.questions?.forEach((q: any) => {
                    text += ` ${q.question || ''} ${q.answerTip || ''}`;
                });
            }
        });
    }

    return text;
}

// POST: Create new experience
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate with Zod
        const validatedData = experienceFormSchema.parse(body);

        // Connect to database
        await dbConnect();

        // Generate searchable text and try embedding (non-blocking)
        const searchText = generateSearchText(validatedData);
        let embedding: number[] | null = null;
        try {
            embedding = await getEmbedding(searchText);
            if (embedding.length === 0) embedding = null;
        } catch (embeddingError) {
            console.warn('⚠️ Embedding failed, saving without vector:', embeddingError);
        }

        // Create experience document
        const experience = new Experience({
            studentId: 'anonymous', // TODO: Get from auth session
            studentName: validatedData.studentName,
            company: validatedData.company,
            role: validatedData.role,
            ctc: validatedData.ctc,
            batch: validatedData.batch,
            eligibilityCriteria: validatedData.eligibilityCriteria,
            rounds: validatedData.rounds,
            finalVerdict: validatedData.finalVerdict,
            tipsForJuniors: validatedData.tipsForJuniors,
            overallExperience: validatedData.overallExperience,
            ...(embedding && { embedding }),
            tags: validatedData.tags || [],
            year: validatedData.year || new Date().getFullYear(),
        });

        const savedExperience = await experience.save();

        return NextResponse.json({
            success: true,
            data: savedExperience,
        });
    } catch (error) {
        console.error('Error creating experience:', error);

        if (error instanceof Error && error.name === 'ZodError') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validation failed',
                    details: error.message,
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to create experience',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

// GET: Fetch experiences with filters
export async function GET(request: NextRequest) {
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const company = searchParams.get('company');
        const batch = searchParams.get('batch');
        const search = searchParams.get('search');

        // Build query
        const query: any = {};
        if (company) query.company = company;
        if (batch) query.batch = batch;
        if (search) {
            query.$or = [
                { company: { $regex: search, $options: 'i' } },
                { role: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } },
            ];
        }

        const experiences = await Experience.find(query)
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        return NextResponse.json({
            success: true,
            data: experiences,
        });
    } catch (error) {
        console.error('Error fetching experiences:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch experiences',
            },
            { status: 500 }
        );
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
