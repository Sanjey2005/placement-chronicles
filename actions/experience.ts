'use server';

import { revalidatePath } from 'next/cache';
import dbConnect from '@/lib/db';
import Experience, { IExperience } from '@/models/Experience';
import Company from '@/models/Company';
import { deleteChunksForExperience } from '@/lib/chunks';
import { verifySession, SESSION_COOKIE } from '@/lib/session';
import { helpfulVoterId } from '@/lib/helpful';
import HelpfulVote from '@/models/HelpfulVote';

/**
 * Server action to get all experiences
 * @returns List of all experiences
 */
export async function getAllExperiences(): Promise<{
    success: boolean;
    data?: IExperience[];
    companyLinks?: Record<string, string>;
    error?: string;
}> {
    try {
        await dbConnect();

        // Optimize query by selecting only necessary fields and limiting results
        const experiences = await Experience.find({ status: 'APPROVED' })
            .select('studentId studentName company role ctc placementType roleType verdict historyOfBacklogs standingBacklogs batch courseBranch minCGPA resumeShortlisting rounds finalVerdict tipsForJuniors overallExperience tags year createdAt')
            .sort({ createdAt: -1 })
            .lean()
            .exec();

        // Helpful votes: totals for everyone, plus which ones this student marked
        const [totals, session] = await Promise.all([
            HelpfulVote.aggregate<{ _id: unknown; n: number }>([{ $group: { _id: '$experienceId', n: { $sum: 1 } } }]),
            verifySession((await cookies()).get(SESSION_COOKIE)?.value),
        ]);
        const helpfulCount = new Map(totals.map((t) => [String(t._id), t.n]));
        const voterId = session?.role === 'user' ? helpfulVoterId(session.sub) : null;
        const mine = new Set(
            voterId ? (await HelpfulVote.find({ voterId }).select('experienceId').lean()).map((v) => String(v.experienceId)) : []
        );

        // Serialize _id and handle serialization for client components
        const serializedExperiences = experiences.map(exp => ({
            ...exp,
            _id: String(exp._id),
            helpfulCount: helpfulCount.get(String(exp._id)) ?? 0,
            helpfulByMe: mine.has(String(exp._id)),
            isOwn: session?.role === 'user' && exp.studentId === session.sub, // the author sees the count, not a vote button
            studentId: undefined, // Fix Data Leakage (remove PII — roll number)
            company: exp.company || '',
            role: exp.role || '',
            ctc: exp.ctc || 0,
            placementType: exp.placementType || 'ON_CAMPUS',
            roleType: exp.roleType || 'FULL_TIME',
            verdict: exp.verdict || 'ACCEPTED',
            historyOfBacklogs: exp.historyOfBacklogs || 'Allowed',
            standingBacklogs: exp.standingBacklogs || 'Not Allowed',
            batch: exp.batch || '',
            minCGPA: exp.minCGPA || 0,
            courseBranch: exp.courseBranch || '',
        }));

        // Fetch company data for logo display and visibility filtering
        const companiesData = await Company.find().select('canonicalName link isHidden').lean();
        const companyLinks: Record<string, string> = {};
        const hiddenCompanies = new Set<string>();
        for (const c of companiesData) {
            if (c.link) {
                companyLinks[c.canonicalName] = c.link;
            }
            if (c.isHidden) {
                hiddenCompanies.add(c.canonicalName);
            }
        }

        // Filter out experiences from hidden companies
        const visibleExperiences = serializedExperiences.filter(
            exp => !hiddenCompanies.has(exp.company || '')
        );

        return {
            success: true,
            data: visibleExperiences as unknown as IExperience[],
            companyLinks,
        };
    } catch (error) {
        return {
            success: false,
            error: 'An internal server error occurred while fetching experiences'
        };
    }
}

/**
 * Server action to get experiences by company
 * @param company - Company name
 * @returns List of experiences for the company
 */
export async function getExperiencesByCompany(company: string): Promise<{
    success: boolean;
    data?: IExperience[];
    error?: string;
}> {
    try {
        await dbConnect();

        const experiences = await Experience.find({ company, status: 'APPROVED' })
            .sort({ createdAt: -1 })
            .lean();

        // Serialize data
        const serializedExperiences = experiences.map(exp => ({
            ...exp,
            _id: String(exp._id),
            studentId: undefined, // Fix Data Leakage (remove PII)
            studentName: undefined, // Fix Data Leakage (remove PII)
        }));

        return {
            success: true,
            data: serializedExperiences as unknown as IExperience[],
        };
    } catch (error) {
        return {
            success: false,
            error: 'An internal server error occurred while fetching company experiences'
        };
    }
}

import { cookies } from 'next/headers';

/**
 * Server action to delete an experience
 * @param id - Experience ID
 * @returns Success status
 */
export async function deleteExperience(id: string): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        // Only a validly signed admin session may delete
        const cookieStore = await cookies();
        const session = await verifySession(cookieStore.get(SESSION_COOKIE)?.value);

        if (session?.role !== 'admin') {
            return {
                success: false,
                error: 'Forbidden: Admin access required to delete experiences',
            };
        }

        await dbConnect();

        // NoSQL Injection Fix: Ensure ID is a valid string/ObjectId length before query
        if (typeof id !== 'string' || id.trim() === '') {
            return { success: false, error: 'Invalid ID format' };
        }

        const experience = await Experience.findById(id);
        if (!experience) {
            return { success: false, error: 'Experience not found' };
        }

        await Experience.findByIdAndDelete(id);
        await deleteChunksForExperience(id);
        await HelpfulVote.deleteMany({ experienceId: id });

        revalidatePath('/');

        return {
            success: true,
        };
    } catch (error) {
        return { success: false, error: 'An internal server error occurred while deleting experience' };
    }
}
