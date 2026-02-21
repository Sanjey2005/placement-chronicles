import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Company from '@/models/Company';
import Experience from '@/models/Experience';
import { requireAdmin } from '@/lib/auth-check';

export async function GET(request: NextRequest) {
    if (!requireAdmin(request)) {
        return NextResponse.json({ success: false, error: 'Forbidden: Admin access only' }, { status: 403 });
    }

    try {
        await dbConnect();

        // Aggregate experiences to count per company
        const companyCounts = await Experience.aggregate([
            { $group: { _id: "$company", count: { $sum: 1 } } }
        ]);

        // Create a map for O(1) lookup
        const countMap = new Map(companyCounts.map(c => [c._id, c.count]));

        // Fetch all companies
        const companies = await Company.find().sort({ canonicalName: 1 }).lean();

        // Merge counts
        const data = companies.map(company => ({
            _id: company._id,
            name: company.canonicalName,
            aliases: company.aliases || [],
            experienceCount: countMap.get(company.canonicalName) || 0,
            createdAt: company.createdAt,
        }));

        // Sort by experience count (descending), then name
        data.sort((a, b) => b.experienceCount - a.experienceCount || a.name.localeCompare(b.name));

        return NextResponse.json({
            success: true,
            data
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'An internal server error occurred while fetching companies' },
            { status: 500 }
        );
    }
}

export const dynamic = 'force-dynamic';
