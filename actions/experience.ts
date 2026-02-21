'use server';

import { revalidatePath } from 'next/cache';
import dbConnect from '@/lib/db';
import Experience, { IExperience } from '@/models/Experience';
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
            console.warn('⚠️ Embedding generation failed contextually, saving without vector:', embeddingError);
        }

        const derivedVerdict = data.finalVerdict === 'rejected' ? 'REJECTED' : 'ACCEPTED';

        // Save base experience
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
            rounds: data.rounds || [],
            ...(embedding && { embedding }),
            tags: data.tags || [],
            year: data.year,
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
                minCGPA: data.minCGPA,
                rounds: data.rounds,
                tags: data.tags,
                tipsForJuniors: data.tipsForJuniors,
                overallExperience: data.overallExperience
            });

            const dbChunks = [];
            for (const chunk of chunks) {
                const chunkEmbedding = await getEmbedding(chunk.text);

                if (chunkEmbedding && chunkEmbedding.length > 0) {
                    dbChunks.push({
                        experienceId: savedExperience._id,
                        text: chunk.text,
                        embedding: chunkEmbedding,
                        metadata: chunk.metadata
                    });
                }
            }

            if (dbChunks.length > 0) {
                await ExperienceChunk.insertMany(dbChunks);
                console.log(`✅ Saved ${dbChunks.length} semantic chunks to DB`);
            }
        } catch (chunkError) {
            console.error('⚠️ Semantic chunk creation/embedding failed:', chunkError);
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
        console.error('Error creating experience:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create experience',
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
    error?: string;
}> {
    try {
        await dbConnect();

        // Optimize query by selecting only necessary fields and limiting results
        const experiences = await Experience.find({ status: 'APPROVED' })
            .select('studentId studentName company role ctc placementType roleType verdict historyOfBacklogs standingBacklogs batch courseBranch minCGPA rounds finalVerdict tipsForJuniors overallExperience tags year createdAt')
            .sort({ createdAt: -1 })
            .limit(50) // Reduced from 100 for faster loading
            .lean()
            .exec();

        // Serialize _id and handle serialization for client components
        const serializedExperiences = experiences.map(exp => ({
            ...exp,
            _id: (exp._id as any).toString(),
            studentId: exp.studentId || '',
            company: exp.company || '',
            role: exp.role || '',
            ctc: exp.ctc || 0,
            placementType: exp.placementType || 'ON_CAMPUS',
            roleType: exp.roleType || 'FULL_TIME',
            verdict: exp.verdict || 'ACCEPTED',
            historyOfBacklogs: exp.historyOfBacklogs || 'No',
            standingBacklogs: exp.standingBacklogs || 'No',
            batch: exp.batch || '',
            minCGPA: exp.minCGPA || 0,
            courseBranch: exp.courseBranch || '',
        }));

        return {
            success: true,
            data: serializedExperiences as unknown as IExperience[],
        };
    } catch (error) {
        console.error('Error fetching experiences:', error);
        return {
            success: false,
            error: 'Failed to fetch experiences',
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
        }));

        return {
            success: true,
            data: serializedExperiences as unknown as IExperience[],
        };
    } catch (error) {
        console.error('Error fetching experiences by company:', error);
        return {
            success: false,
            error: 'Failed to fetch experiences',
        };
    }
}

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
        await dbConnect();

        await Experience.findByIdAndDelete(id);

        revalidatePath('/');

        return {
            success: true,
        };
    } catch (error) {
        console.error('Error deleting experience:', error);
        return {
            success: false,
            error: 'Failed to delete experience',
        };
    }
}
