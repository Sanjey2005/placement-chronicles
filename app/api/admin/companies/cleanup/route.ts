import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Company from '@/models/Company';
import Experience from '@/models/Experience';
import { requireAdmin } from '@/lib/auth-check';
import { moderateExperience, enforceCanonicalName } from '@/lib/moderation';

/**
 * POST /api/admin/companies/cleanup
 * 
 * Scans all Company entries for duplicates/aliases and merges them.
 * Uses the local COMPANY_ALIASES map first, then falls back to Groq
 * for fuzzy matching against the existing canonical names.
 * 
 * For each alias found:
 * 1. Updates all experiences referencing the alias → canonical name
 * 2. Deletes the stale alias Company entry
 * 3. Ensures the canonical Company entry exists
 */
export async function POST(request: NextRequest) {
    if (!requireAdmin(request)) {
        return NextResponse.json({ success: false, error: 'Forbidden: Admin access only' }, { status: 403 });
    }

    try {
        await dbConnect();

        const allCompanies = await Company.find().lean();
        const companyNames = allCompanies.map((c: any) => c.canonicalName);

        const merges: { from: string; to: string }[] = [];

        // ── Phase 1: Local deterministic alias resolution ────────────
        for (const company of allCompanies) {
            const name = (company as any).canonicalName;
            const canonical = enforceCanonicalName(name);

            if (canonical !== name) {
                merges.push({ from: name, to: canonical });
            }
        }

        // ── Phase 2: Groq-based fuzzy matching ──────────────────────
        // For companies not caught by local aliases, ask Groq to identify
        // which ones are the same company with different spellings.
        const alreadyMerged = new Set(merges.map(m => m.from));
        const remainingCompanies = companyNames.filter(n => !alreadyMerged.has(n));

        if (remainingCompanies.length > 1) {
            try {
                const Groq = (await import('groq-sdk')).default;
                const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

                const completion = await groq.chat.completions.create({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        {
                            role: 'system',
                            content: `You are a data deduplication expert. Given a list of company names, identify groups that refer to the SAME company but are spelled differently (aliases, abbreviations, corporate suffixes, etc).

Return ONLY valid JSON in this format:
{
  "merges": [
    { "from": "alias name", "to": "canonical/official name" }
  ]
}

Rules:
- The "to" name should be the most official/recognizable form
- Only merge if you are VERY confident they are the same company
- If no duplicates found, return { "merges": [] }
- Do NOT merge companies that are genuinely different (e.g., "Amazon" and "Amazon Web Services" are the same, but "ICU Medical" and "ICU" are not if ICU is a different entity)`,
                        },
                        {
                            role: 'user',
                            content: `Identify duplicates in this company list:\n${JSON.stringify(remainingCompanies)}`,
                        },
                    ],
                    max_tokens: 500,
                    temperature: 0.1,
                    response_format: { type: 'json_object' },
                });

                const responseText = completion.choices[0]?.message?.content || '';
                const parsed = JSON.parse(responseText);

                if (Array.isArray(parsed.merges)) {
                    for (const merge of parsed.merges) {
                        if (merge.from && merge.to && merge.from !== merge.to) {
                            // Only add if both names actually exist in our company list
                            if (companyNames.includes(merge.from) && companyNames.includes(merge.to)) {
                                merges.push({ from: merge.from, to: merge.to });
                            }
                        }
                    }
                }
            } catch (groqError) {
                // Groq unavailable — proceed with only local alias merges
                console.error('Groq unavailable for cleanup, using local aliases only:', groqError);
            }
        }

        // ── Phase 3: Execute merges ─────────────────────────────────
        let mergedCount = 0;

        for (const { from, to } of merges) {
            // 1. Update all experiences referencing the alias
            const updateResult = await Experience.updateMany(
                { company: from },
                { $set: { company: to } }
            );

            // 2. Ensure canonical Company entry exists
            const canonicalExists = await Company.findOne({ canonicalName: to });
            if (!canonicalExists) {
                await Company.create({ canonicalName: to });
            }

            // 3. Delete the stale alias Company entry
            if (from !== to) {
                await Company.deleteOne({ canonicalName: from });
            }

            if (updateResult.modifiedCount > 0 || from !== to) {
                mergedCount++;
            }
        }

        // ── Phase 4: Clean up orphaned Company entries ──────────────
        // Remove Company entries that have 0 experiences referencing them
        const allCompaniesAfter = await Company.find().lean();
        let orphansRemoved = 0;
        for (const company of allCompaniesAfter) {
            const count = await Experience.countDocuments({ company: (company as any).canonicalName });
            if (count === 0) {
                await Company.deleteOne({ _id: company._id });
                orphansRemoved++;
            }
        }

        // ── Phase 5: Clear needsCompanyNormalization flags ──────────
        await Experience.updateMany(
            { needsCompanyNormalization: true },
            { $set: { needsCompanyNormalization: false } }
        );

        return NextResponse.json({
            success: true,
            data: {
                merges,
                mergedCount,
                orphansRemoved,
            },
            message: mergedCount > 0
                ? `Cleaned up ${mergedCount} duplicate(s) and removed ${orphansRemoved} orphan(s)`
                : `No duplicates found. Removed ${orphansRemoved} orphan(s).`,
        });
    } catch (error) {
        console.error('Company cleanup error:', error);
        return NextResponse.json(
            { success: false, error: 'An error occurred during company cleanup' },
            { status: 500 }
        );
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
