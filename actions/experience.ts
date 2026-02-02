'use server';

import { revalidatePath } from 'next/cache';
import dbConnect from '@/lib/db';
import Experience, { IExperience } from '@/models/Experience';
import { getEmbedding, generateExperienceSummary } from '@/lib/vector';

interface CreateExperienceData {
    studentId: string;
    company: string;
    role: string;
    ctc: number;
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

        // Step 1: Generate text summary from experience data
        const summary = generateExperienceSummary({
            company: data.company,
            role: data.role,
            ctc: data.ctc,
            rounds: data.rounds,
            tags: data.tags,
        });

        // Step 2: Generate vector embedding from summary
        const embedding = await getEmbedding(summary);

        // Step 3: Create and save the experience document
        const experience = new Experience({
            studentId: data.studentId,
            company: data.company,
            role: data.role,
            ctc: data.ctc,
            rounds: data.rounds || [],
            embedding: embedding,
            tags: data.tags || [],
            year: data.year,
        });

        const savedExperience = await experience.save();

        // Step 4: Revalidate cache
        revalidatePath('/');

        return {
            success: true,
            data: savedExperience.toObject(),
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

        const experiences = await Experience.find({})
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        return {
            success: true,
            data: experiences as IExperience[],
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

        const experiences = await Experience.find({ company })
            .sort({ createdAt: -1 })
            .lean();

        return {
            success: true,
            data: experiences as IExperience[],
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
