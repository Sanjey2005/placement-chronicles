import { NextRequest, NextResponse } from 'next/server';
import type { FilterQuery } from 'mongoose';
import dbConnect from '@/lib/db';
import Experience, { type IExperience } from '@/models/Experience';
import Company from '@/models/Company';
import AdminLog from '@/models/AdminLog';
import { requireAdmin } from '@/lib/auth-check';
import { moderateExperience } from '@/lib/moderation';
import { rebuildChunksForExperience, deleteChunksForExperience } from '@/lib/chunks';

// GET: Fetch experiences with optional status filter
export async function GET(request: NextRequest) {
    if (!(await requireAdmin(request))) {
        return NextResponse.json({ success: false, error: 'Forbidden: Admin access only' }, { status: 403 });
    }

    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');

        const query: FilterQuery<IExperience> = {};
        if (status && status !== 'ALL') {
            query.status = status;
        }

        const [experiences, total] = await Promise.all([
            Experience.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Experience.countDocuments(query),
        ]);

        const serialized = experiences.map(exp => ({
            ...exp,
            _id: String(exp._id),
        }));

        return NextResponse.json({
            success: true,
            data: serialized,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'An internal server error occurred while fetching admin experiences' },
            { status: 500 }
        );
    }
}

// PATCH: Update experience status (approve/reject)
export async function PATCH(request: NextRequest) {
    if (!(await requireAdmin(request))) {
        return NextResponse.json({ success: false, error: 'Forbidden: Admin access only' }, { status: 403 });
    }

    try {
        const { id, action } = await request.json();

        // NoSQL Injection Fix: Ensure ID is a string to prevent query object injection
        if (typeof id !== 'string' || id.trim() === '') {
            return NextResponse.json(
                { success: false, error: 'invalid id or action format' },
                { status: 400 }
            );
        }

        if (!action || typeof action !== 'string') {
            return NextResponse.json(
                { success: false, error: 'id and action are required' },
                { status: 400 }
            );
        }

        const statusMap: Record<string, string> = {
            APPROVE: 'APPROVED',
            REJECT: 'REJECTED',
        };

        const newStatus = statusMap[action.toUpperCase()];
        if (!newStatus) {
            return NextResponse.json(
                { success: false, error: 'Invalid action. Use APPROVE or REJECT.' },
                { status: 400 }
            );
        }

        await dbConnect();

        const experience = await Experience.findByIdAndUpdate(
            id,
            { status: newStatus },
            { new: true }
        ).lean();

        if (!experience) {
            return NextResponse.json(
                { success: false, error: 'Experience not found' },
                { status: 404 }
            );
        }

        // ── Re-normalize company name when approving ────────────────
        // When Groq was unavailable during submission, the raw user input
        // was saved as the company name (possibly an alias like "Buckman Labs").
        // Now that admin is approving, try to re-run Groq normalization
        // to replace the alias with the canonical name and clean up stale entries.
        if (newStatus === 'APPROVED') {
            try {
                const oldCompanyName = experience.company;

                // Fetch existing companies to guide LLM normalization
                const allCompanies = await Company.find({}).select('canonicalName').lean();
                const existingCompaniesList = allCompanies.map(c => c.canonicalName);

                const moderationResult = await moderateExperience(
                    { company: oldCompanyName, role: experience.role },
                    existingCompaniesList
                );

                const canonicalName = moderationResult.canonicalCompanyName;

                // If Groq returned a different (canonical) name, fix the data
                if (canonicalName && canonicalName !== oldCompanyName) {
                    // 1. Update the experience's company field
                    await Experience.findByIdAndUpdate(id, { company: canonicalName });

                    // 2. Remove the stale alias Company entry if no other experiences use it
                    const aliasUsageCount = await Experience.countDocuments({
                        company: oldCompanyName,
                        _id: { $ne: id },
                    });
                    if (aliasUsageCount === 0) {
                        await Company.deleteOne({ canonicalName: oldCompanyName });
                    }

                    // 3. Ensure the canonical Company entry exists
                    const canonicalExists = await Company.findOne({ canonicalName });
                    if (!canonicalExists) {
                        await Company.create({ canonicalName, link: moderationResult.companyWebsite || '' });
                    } else if (!canonicalExists.link && moderationResult.companyWebsite) {
                        // Backfill link if it was missing
                        await Company.updateOne({ canonicalName }, { $set: { link: moderationResult.companyWebsite } });
                    }

                    // Update the experience object for the response
                    experience.company = canonicalName;
                }

                // Normalization succeeded, ensure flag is cleared
                await Experience.findByIdAndUpdate(id, { needsCompanyNormalization: false });
            } catch (normError) {
                // Groq is still unavailable — mark for deferred normalization.
                // Next successful Groq call will pick this up and clean it.
                await Experience.findByIdAndUpdate(id, { needsCompanyNormalization: true });
                console.error('Re-normalization deferred (Groq unavailable):', normError);
            }
        }

        // ── RAG chunks: approved experiences enter the corpus, others leave ──
        // Re-fetch after the normalization block so chunks carry the canonical
        // company name. Non-blocking so moderation never fails on an HF outage.
        try {
            if (newStatus === 'APPROVED') {
                const fresh = await Experience.findById(id).lean();
                if (fresh) await rebuildChunksForExperience(fresh);
            } else {
                await deleteChunksForExperience(id);
            }
        } catch (chunkError) {
            console.error('Chunk sync failed (recover via backfill):', chunkError);
        }

        // Create admin log entry
        await AdminLog.create({
            action: action.toUpperCase(),
            adminId: 'admin',
            targetId: id,
            details: `${experience.studentName || 'Unknown'} uploaded an experience for ${experience.company || 'Unknown'}`,
        });

        return NextResponse.json({
            success: true,
            data: { ...experience, _id: String(experience._id) },
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'An internal server error occurred while updating experience status' },
            { status: 500 }
        );
    }
}

// DELETE: Permanently delete an experience (admin only)
export async function DELETE(request: NextRequest) {
    if (!(await requireAdmin(request))) {
        return NextResponse.json({ success: false, error: 'Forbidden: Admin access only' }, { status: 403 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        // NoSQL Injection / Validation Fix: Ensure ID is present and valid
        if (!id || typeof id !== 'string') {
            return NextResponse.json(
                { success: false, error: 'invalid id format' },
                { status: 400 }
            );
        }

        await dbConnect();

        const experience = await Experience.findById(id).lean();
        if (!experience) {
            return NextResponse.json(
                { success: false, error: 'Experience not found' },
                { status: 404 }
            );
        }

        // PERMANENT DELETE: Remove document immediately (no backups)
        await Experience.findByIdAndDelete(id);
        await deleteChunksForExperience(id);

        // Create admin log entry
        await AdminLog.create({
            action: 'DELETE',
            adminId: 'admin',
            targetId: id,
            details: `${experience.studentName || 'Unknown'} uploaded an experience for ${experience.company || 'Unknown'}`,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'An internal server error occurred while deleting experience' },
            { status: 500 }
        );
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
