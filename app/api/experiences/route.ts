import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Experience from '@/models/Experience';
import Company from '@/models/Company';
import { getEmbedding } from '@/lib/vector';
import { experienceFormSchema } from '@/lib/schemas/experience-schema';
import AdminLog from '@/models/AdminLog';
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
    const cleaned = sanitizeHtml(input, {
        allowedTags: [], // Strip all tags
        allowedAttributes: {}, // Strip all attributes
    });
    // sanitize-html encodes special chars — decode them since we want plain text
    return cleaned
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'");
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
        let companyWebsite = ''; // Will be populated by Groq

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
            // ── Fetch existing companies to guide LLM normalization ──
            let existingCompaniesList: string[] = [];
            try {
                const allCompanies = await Company.find({}).select('canonicalName').lean();
                existingCompaniesList = allCompanies.map((c: any) => c.canonicalName);
            } catch (err) {
                console.error('Failed to fetch existing companies for moderation:', err);
            }

            const moderationResult = await moderateExperience(validatedData, existingCompaniesList);

            // 1. Handle Normalization
            if (moderationResult.canonicalCompanyName) {
                finalCompanyName = moderationResult.canonicalCompanyName;
            }
            if (moderationResult.companyWebsite) {
                companyWebsite = moderationResult.companyWebsite;
            }

            // 2. Handle Safety
            if (moderationResult.isSafe) {
                status = 'APPROVED';
                moderationReason = null;
            } else {
                status = 'FLAGGED';
                moderationReason = moderationResult.reason;
            }

            // ── Deferred Normalization: Clean up pending aliases ─────
            // Groq worked for this submission, so also fix any approved
            // experiences that were waiting for re-normalization.
            try {
                const pendingExperiences = await Experience.find({
                    needsCompanyNormalization: true,
                    status: 'APPROVED',
                }).limit(5).lean(); // Process up to 5 at a time to avoid overloading Groq

                for (const pending of pendingExperiences) {
                    try {
                        const pendingId = (pending._id as any).toString();
                        const oldName = pending.company;

                        const allCompanies = await Company.find({}).select('canonicalName').lean();
                        const companyList = allCompanies.map((c: any) => c.canonicalName);

                        const normResult = await moderateExperience(
                            { company: oldName, role: pending.role },
                            companyList
                        );

                        const canonical = normResult.canonicalCompanyName;

                        if (canonical && canonical !== oldName) {
                            // Fix the experience company name
                            await Experience.findByIdAndUpdate(pendingId, {
                                company: canonical,
                                needsCompanyNormalization: false,
                            });

                            // Remove stale alias Company entry if unused
                            const aliasCount = await Experience.countDocuments({
                                company: oldName,
                                _id: { $ne: pendingId },
                            });
                            if (aliasCount === 0) {
                                await Company.deleteOne({ canonicalName: oldName });
                            }

                            // Ensure canonical Company entry exists
                            const exists = await Company.findOne({ canonicalName: canonical });
                            if (!exists) {
                                await Company.create({ canonicalName: canonical, link: normResult.companyWebsite || '' });
                            }
                        } else {
                            // Name is already correct, just clear the flag
                            await Experience.findByIdAndUpdate(pendingId, {
                                needsCompanyNormalization: false,
                            });
                        }
                    } catch (singleErr) {
                        // Skip this one, will retry on next successful call
                    }
                }
            } catch (deferredErr) {
                // Non-critical: don't block the current submission
                console.error('Deferred normalization batch error:', deferredErr);
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
                await Company.create({ canonicalName: finalCompanyName, link: companyWebsite });
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
            workModel: validatedData.workModel,
            verdict: derivedVerdict,
            historyOfBacklogs: validatedData.historyOfBacklogs,
            standingBacklogs: validatedData.standingBacklogs,
            batch: validatedData.batch,
            courseBranch: validatedData.courseBranch,
            minCGPA: validatedData.minCGPA,
            resumeShortlisting: validatedData.resumeShortlisting,
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

        // ── Activity Log: Record submission + moderation outcome ──
        try {
            const studentLabel = validatedData.studentName || 'Unknown';
            // Fallback to anonymous if studentId is not properly populated yet
            const rollNumber = experience.studentId && experience.studentId !== 'anonymous'
                ? experience.studentId
                : '(Roll Number missing)';

            await AdminLog.create({
                action: status === 'APPROVED' ? 'AUTO_APPROVE' : status === 'FLAGGED' ? 'FLAG' : 'SUBMIT',
                adminId: 'system',
                targetId: savedExperience._id.toString(),
                details: `${studentLabel} (${rollNumber}) uploaded an experience for ${validatedData.company}`,
            });
        } catch (logError) {
            // Non-critical: don't block submission if logging fails
            console.error('Failed to create activity log:', logError);
        }

        return NextResponse.json({
            success: true,
            data: savedExperience,
        });
    } catch (error) {
        console.error("EXPERIENCE API ERROR:", error);
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
                details: error instanceof Error ? error.message : String(error)
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
            .select('-studentId -moderationReason') // Fix Data Leakage (remove PII and internal data, but keep studentName visible)
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
