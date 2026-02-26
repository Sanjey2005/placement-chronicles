'use server';

import { revalidatePath } from 'next/cache';
import dbConnect from '@/lib/db';
import Experience, { IExperience } from '@/models/Experience';
import Company from '@/models/Company';
import ExperienceChunk from '@/models/ExperienceChunk';
import { getEmbedding, generateExperienceSummary, chunkExperience } from '@/lib/vector';

interface CreateExperienceData {
    studentId: string;
    company: string;
    role: string;
    ctc: number;
    placementType: 'ON_CAMPUS' | 'OFF_CAMPUS';
    roleType: 'FULL_TIME' | 'INTERNSHIP' | 'SUMMER_INTERNSHIP';
    historyOfBacklogs: string;
    standingBacklogs: string;
    batch?: string;
    courseBranch?: string;
    minCGPA?: number;
    tipsForJuniors?: string;
    overallExperience?: string;
    finalVerdict?: 'selected' | 'rejected';
    resumeShortlisting?: boolean;
    rounds?: Array<{
        roundNumber: number;
        roundType: string;
        questions: string[];
        description?: string;
        duration?: string;
    }>;
    tags?: string[];
    year?: number;
}

interface CreateExperienceResponse {
    success: boolean;
    data?: IExperience;
    error?: string;
}

/**
 * Server action to create a new experience with vector embeddings
 * @param data - Experience data
 * @returns Response with created experience or error
 */
export async function createExperience(
    data: CreateExperienceData
): Promise<CreateExperienceResponse> {
    try {
        // Validate required fields
        if (!data.studentId || !data.company || !data.role || !data.ctc) {
            return {
                success: false,
                error: 'Missing required fields: studentId, company, role, and ctc are required',
            };
        }

        // Connect to database
        await dbConnect();

        // Legacy mechanism: generate full experience embedding for backwards mapping/compatibility
        // (Optional, can be removed in future if we solely rely on chunks)
        const summary = generateExperienceSummary({
            company: data.company,
            role: data.role,
            ctc: data.ctc,
            rounds: data.rounds,
            tags: data.tags,
        });

        let embedding: number[] | null = null;
        try {
            embedding = await getEmbedding(summary);
        } catch (embeddingError) {
            // Silently skip embedding context on failure
        }

        const derivedVerdict = data.finalVerdict === 'rejected' ? 'REJECTED' : 'ACCEPTED';

        // Save base experience explicitly filtering allowed fields (Mass Assignment Fix)
        const experience = new Experience({
            studentId: data.studentId,
            company: data.company,
            role: data.role,
            ctc: data.ctc,
            placementType: data.placementType,
            roleType: data.roleType,
            verdict: derivedVerdict,
            historyOfBacklogs: data.historyOfBacklogs,
            standingBacklogs: data.standingBacklogs,
            batch: data.batch,
            courseBranch: data.courseBranch,
            minCGPA: data.minCGPA,
            tipsForJuniors: data.tipsForJuniors,
            overallExperience: data.overallExperience,
            finalVerdict: data.finalVerdict,
            resumeShortlisting: data.resumeShortlisting || false,
            rounds: data.rounds || [],
            ...(embedding && { embedding }),
            tags: data.tags || [],
            year: data.year,
            status: 'PENDING', // Force pending status, ignore any incoming status
        });

        const savedExperience = await experience.save();

        // Step 2: NEW PIPELINE - Semantic Chunking
        try {
            const chunks = chunkExperience({
                companyName: data.company,
                roleType: data.roleType,
                studentName: data.studentId, // Fallback if name is unavailable during creation
                ctc: data.ctc,
                placementType: data.placementType,
                workModel: (data as any).workModel,
                minCGPA: data.minCGPA,
                batch: data.batch,
                courseBranch: data.courseBranch,
                verdict: derivedVerdict,
                finalVerdict: data.finalVerdict,
                rounds: data.rounds,
                tags: data.tags,
                tipsForJuniors: data.tipsForJuniors,
                overallExperience: data.overallExperience,
                historyOfBacklogs: data.historyOfBacklogs,
                standingBacklogs: data.standingBacklogs,
            });

            const dbChunks = [];
            for (const chunk of chunks) {
                const chunkEmbedding = await getEmbedding(chunk.text);
                dbChunks.push({
                    experienceId: savedExperience._id,
                    metadata: chunk.metadata,
                    text: chunk.text,
                    embedding: chunkEmbedding,
                });
            }

            if (dbChunks.length > 0) {
                await ExperienceChunk.insertMany(dbChunks);
            }
        } catch (chunkError) {
            // Non-critical: If vector creation goes down, continue with regular save
        }

        // Step 4: Revalidate cache
        revalidatePath('/');

        return {
            success: true,
            data: {
                ...savedExperience.toObject(),
                _id: savedExperience._id.toString()
            } as any,
        };
    } catch (error) {
        if (error instanceof Error && error.name === 'ZodError') {
            return {
                success: false,
                error: 'Validation failed'
            };
        }

        return {
            success: false,
            error: 'An internal server error occurred while creating experience'
        };
    }
}

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
            .limit(50) // Reduced from 100 for faster loading
            .lean()
            .exec();

        // Serialize _id and handle serialization for client components
        const serializedExperiences = experiences.map(exp => ({
            ...exp,
            _id: (exp._id as any).toString(),
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
            if ((c as any).link) {
                companyLinks[(c as any).canonicalName] = (c as any).link;
            }
            if ((c as any).isHidden) {
                hiddenCompanies.add((c as any).canonicalName);
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
            _id: (exp._id as any).toString(),
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
        // IDOR Fix: Check if user is an admin before allowing delete
        const cookieStore = await cookies();
        const rawToken = cookieStore.get('auth-token')?.value;

        if (!rawToken || !rawToken.startsWith('admin|')) {
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

        revalidatePath('/');

        return {
            success: true,
        };
    } catch (error) {
        return { success: false, error: 'An internal server error occurred while deleting experience' };
    }
}
