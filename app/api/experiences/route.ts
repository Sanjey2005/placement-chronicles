import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Experience from '@/models/Experience';
import Company from '@/models/Company';
import { getEmbedding } from '@/lib/vector';
import { experienceFormSchema } from '@/lib/schemas/experience-schema';
import { escapeRegex, sanitizeObject } from '@/lib/sanitize';
import { moderateExperience } from '@/lib/moderation';
import { groqApiRateLimit } from '@/lib/ratelimit';
import { batchBackupAndDelete } from '@/lib/backup';

const MAX_DOCUMENTS = 5000;

// Helper function to generate searchable text from experience data
function generateSearchText(data: any): string {
    let text = `${data.company} ${data.role} ${data.batch || ''} ${data.minCGPA || ''} ${data.tipsForJuniors || ''}`;

    // Add round-specific text
    if (data.rounds && Array.isArray(data.rounds)) {
        data.rounds.forEach((round: any) => {
            if (round.type === 'test') {
                const topics = Array.isArray(round.topics) ? round.topics.join(' ') : (round.topics || '');
                text += ` ${topics}`;
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

import sanitizeHtml from 'sanitize-html';

// Helper function to sanitize user-generated HTML
// Uses sanitize-html to remove all HTML tags initially
function aggressiveSanitize(input: string): string {
    return sanitizeHtml(input, {
        allowedTags: [], // Strip all tags
        allowedAttributes: {}, // Strip all attributes
    });
}

// Helper function to process all strings in an object through sanitizeHtml
function deepSanitize(obj: any): any {
    if (typeof obj === 'string') {
        return aggressiveSanitize(obj);
    }
    if (Array.isArray(obj)) {
        return obj.map(deepSanitize);
    }
    if (obj && typeof obj === 'object') {
        return Object.fromEntries(
            Object.entries(obj).map(([k, v]) => [k, deepSanitize(v)])
        );
    }
    return obj;
}

// POST: Create new experience
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate with Zod
        const rawValidated = experienceFormSchema.parse(body);

        // SECURITY: Sanitize all string fields heavily to prevent stored XSS
        const validatedData = deepSanitize(rawValidated);

        // Connect to database
        await dbConnect();

        // ── AI Content Moderation & Normalization ───────────────────
        // Default: PENDING — only Groq can elevate to APPROVED.
        // If Groq flags it or is unavailable → FLAGGED (admin must review).
        let status: 'APPROVED' | 'FLAGGED' | 'PENDING' = 'PENDING';
        let moderationReason: string | null = null;
        let finalCompanyName = validatedData.company; // Default to user input

        // ── Check Groq Global Limit (45 RPM) ────────────────────────
        if (groqApiRateLimit) {
            try {
                // Use a single static key to enforce the global limit across all users
                const { success } = await groqApiRateLimit.limit('global_groq_throttle_key');
                if (!success) {
                    return NextResponse.json(
                        {
                            success: false,
                            error: 'AI processing is currently at capacity. Please try again in 60 seconds.',
                        },
                        { status: 429, headers: { 'Retry-After': '60' } }
                    );
                }
            } catch (limitError) {
                // Fail open on Redis failure, fall through to moderation attempt
            }
        }

        try {
            const moderationResult = await moderateExperience(validatedData);

            // 1. Handle Normalization
            if (moderationResult.canonicalCompanyName) {
                finalCompanyName = moderationResult.canonicalCompanyName;
            }

            // 2. Handle Safety
            if (moderationResult.isSafe) {
                status = 'APPROVED';
                moderationReason = null;
            } else {
                status = 'FLAGGED';
                moderationReason = moderationResult.reason;
            }
        } catch (modError) {
            // Groq unavailable → flag for manual admin review
            status = 'FLAGGED';
            moderationReason = 'AI Service Unavailable - Manual Review Required';
        }

        // ── Company Management ──────────────────────────────────────
        // Ensure company exists in DB, create if new
        try {
            const existingCompany = await Company.findOne({ canonicalName: finalCompanyName });
            if (!existingCompany) {
                await Company.create({ canonicalName: finalCompanyName });
            }
        } catch (companyError) {
            // Don't block submission, just log error conceptually
        }

        // Update data with normalized company name
        validatedData.company = finalCompanyName;

        // ── FIFO Storage Limit: Archive oldest when at limit, flush when 5+ archived ──
        const currentCount = await Experience.countDocuments({ status: { $ne: 'ARCHIVED' } });
        if (currentCount >= MAX_DOCUMENTS) {
            const oldest = await Experience.findOne({ status: { $ne: 'ARCHIVED' } }).sort({ createdAt: 1 });
            if (oldest) {
                await Experience.findByIdAndUpdate(oldest._id, { status: 'ARCHIVED' });
                const archivedCount = await Experience.countDocuments({ status: 'ARCHIVED' });
                if (archivedCount >= 5) {
                    const archivedData = await Experience.find({ status: 'ARCHIVED' }).lean();
                    const backedUpSuccessfully = await batchBackupAndDelete(archivedData);
                    if (backedUpSuccessfully) {
                        await Experience.deleteMany({ status: 'ARCHIVED' });
                    }
                }
            }
        }

        // Generate searchable text and try embedding (non-blocking)
        const searchText = generateSearchText(validatedData);
        let embedding: number[] | null = null;
        try {
            embedding = await getEmbedding(searchText);
            if (embedding.length === 0) embedding = null;
        } catch (embeddingError) {
            // Silently fail, embedding isn't required to save initially
        }

        // Derive legacy verdict field from finalVerdict
        // Default to ACCEPTED if selected, otherwise REJECTED if rejected.
        const derivedVerdict = validatedData.finalVerdict === 'rejected' ? 'REJECTED' : 'ACCEPTED';

        // Create experience document
        const experience = new Experience({
            studentId: 'anonymous', // TODO: Get from auth session
            studentName: validatedData.studentName,
            company: validatedData.company,
            role: validatedData.role,
            ctc: validatedData.ctc,
            placementType: validatedData.placementType,
            roleType: validatedData.roleType,
            verdict: derivedVerdict,
            historyOfBacklogs: validatedData.historyOfBacklogs,
            standingBacklogs: validatedData.standingBacklogs,
            batch: validatedData.batch,
            courseBranch: validatedData.courseBranch,
            minCGPA: validatedData.minCGPA,
            rounds: validatedData.rounds,
            finalVerdict: validatedData.finalVerdict,
            tipsForJuniors: validatedData.tipsForJuniors,
            overallExperience: validatedData.overallExperience,
            ...(embedding && { embedding }),
            tags: validatedData.tags || [],
            year: validatedData.year || new Date().getFullYear(),
            status, // Enforced locally, cannot be overridden by user
            moderationReason, // Enforced locally
        });

        const savedExperience = await experience.save();

        return NextResponse.json({
            success: true,
            data: savedExperience,
        });
    } catch (error) {
        if (error instanceof Error && error.name === 'ZodError') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validation failed',
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                error: 'An internal server error occurred while creating experience',
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

        // Only show APPROVED experiences to public users
        const query: any = { status: 'APPROVED' };
        if (company) query.company = company;
        if (batch) query.batch = batch;
        if (search) {
            // SECURITY: Escape regex special chars to prevent ReDoS
            const safeSearch = escapeRegex(search);
            query.$or = [
                { company: { $regex: safeSearch, $options: 'i' } },
                { role: { $regex: safeSearch, $options: 'i' } },
                { tags: { $in: [new RegExp(safeSearch, 'i')] } },
            ];
        }

        const experiences = await Experience.find(query)
            .select('-studentId -studentName -moderationReason') // Fix Data Leakage (remove PII and internal data)
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        return NextResponse.json({
            success: true,
            data: experiences,
        });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: 'An internal server error occurred while fetching experiences',
            },
            { status: 500 }
        );
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
