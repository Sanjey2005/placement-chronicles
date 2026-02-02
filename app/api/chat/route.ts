import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Experience from '@/models/Experience';
import { getEmbedding, cosineSimilarity } from '@/lib/vector';
import { getGeminiModel } from '@/lib/gemini';
import { chatRateLimiter } from '@/lib/redis';

export async function POST(request: NextRequest) {
    try {
        // Parse request body
        const body = await request.json();
        const { message } = body;

        if (!message || typeof message !== 'string') {
            return NextResponse.json(
                { error: 'Message is required and must be a string' },
                { status: 400 }
            );
        }

        // Rate limiting
        if (chatRateLimiter) {
            const identifier = request.headers.get('x-forwarded-for') ||
                request.headers.get('x-real-ip') ||
                'anonymous';
            const { success, limit, remaining, reset } = await chatRateLimiter.limit(identifier);

            if (!success) {
                return NextResponse.json(
                    {
                        error: 'Rate limit exceeded. Please try again later.',
                        limit,
                        remaining,
                        reset,
                    },
                    { status: 429 }
                );
            }
        }

        // Connect to database
        await dbConnect();

        // Step 1: Generate embedding for user's message
        const queryEmbedding = await getEmbedding(message);

        // Step 2: Vector search - Find top 3 matching experiences
        // Note: MongoDB Atlas Vector Search would be more efficient, but we'll use
        // a manual approach for compatibility
        const allExperiences = await Experience.find({
            embedding: { $exists: true, $ne: null },
        })
            .select('studentId company role ctc rounds tags year embedding')
            .lean();

        // Calculate similarity scores
        const scoredExperiences = allExperiences
            .map((exp: any) => ({
                ...exp,
                similarity: exp.embedding
                    ? cosineSimilarity(queryEmbedding, exp.embedding)
                    : 0,
            }))
            .sort((a: any, b: any) => b.similarity - a.similarity)
            .slice(0, 3); // Top 3 results

        // Step 3: Build context from retrieved experiences
        const context = scoredExperiences
            .map((exp: any, index: number) => {
                const roundsText = exp.rounds
                    ?.map(
                        (round: any) =>
                            `${round.roundType}: ${round.questions?.join(', ') || 'No questions listed'}`
                    )
                    .join('; ');

                return `
Experience ${index + 1}:
Company: ${exp.company}
Role: ${exp.role}
CTC: ${exp.ctc} LPA
Year: ${exp.year || 'Not specified'}
Interview Rounds: ${roundsText || 'No rounds listed'}
Skills/Tags: ${exp.tags?.join(', ') || 'None'}
        `.trim();
            })
            .join('\n\n---\n\n');

        // Step 4: Generate response using Gemini Pro
        const model = getGeminiModel();

        const prompt = `You are an AI assistant helping students prepare for job interviews. You have access to a database of interview experiences from previous students.

Based on the following interview experiences, answer the user's question. Be specific, helpful, and cite the companies/roles when relevant.

INTERVIEW EXPERIENCES:
${context || 'No relevant experiences found in the database.'}

USER QUESTION:
${message}

INSTRUCTIONS:
- Provide a helpful, detailed answer based on the experiences above
- If the experiences don't contain relevant information, say so politely
- Mention specific companies and roles when citing examples
- Be encouraging and supportive
- If asked about interview questions, list them clearly
- Format your response in a clear, readable way

ANSWER:`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const answer = response.text();

        // Return response with sources
        return NextResponse.json({
            success: true,
            answer,
            sources: scoredExperiences.map((exp: any) => ({
                company: exp.company,
                role: exp.role,
                similarity: exp.similarity,
            })),
            context: context ? true : false,
        });
    } catch (error) {
        console.error('Error in chat API:', error);
        return NextResponse.json(
            {
                error: 'Failed to process chat message',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
    return NextResponse.json(
        {},
        {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        }
    );
}
