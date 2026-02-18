import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import dbConnect from '@/lib/db';
import Experience from '@/models/Experience';
import { getEmbedding, cosineSimilarity } from '@/lib/vector';
import { chatRateLimiter } from '@/lib/redis';

// Initialize Groq client
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: NextRequest) {
    try {
        // Parse request body
        const body = await request.json();
        const { messages } = body;

        // Support both single message (legacy) and messages array format
        let userMessage: string;
        if (Array.isArray(messages)) {
            const lastMessage = messages[messages.length - 1];
            userMessage = lastMessage?.content || lastMessage?.message || '';
        } else if (body.message) {
            userMessage = body.message;
        } else {
            return NextResponse.json(
                { error: 'Messages array or message string is required' },
                { status: 400 }
            );
        }

        if (!userMessage || typeof userMessage !== 'string') {
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

        // Step 1: Generate embedding for user's message (still using Gemini for embeddings)
        let queryEmbedding: number[] = [];
        try {
            queryEmbedding = await getEmbedding(userMessage);
        } catch (embeddingError) {
            console.warn('⚠️ Embedding generation failed, using fallback search:', embeddingError);
        }

        // Step 2: Vector search OR fallback to text search
        let scoredExperiences: any[] = [];

        if (queryEmbedding.length > 0) {
            // Vector search
            const allExperiences = await Experience.find({
                embedding: { $exists: true, $ne: null },
            })
                .select('studentId company role ctc rounds tags year embedding')
                .lean();

            scoredExperiences = allExperiences
                .map((exp: any) => ({
                    ...exp,
                    similarity: exp.embedding
                        ? cosineSimilarity(queryEmbedding, exp.embedding)
                        : 0,
                }))
                .sort((a: any, b: any) => b.similarity - a.similarity)
                .slice(0, 3);
        } else {
            // Fallback: Get recent experiences without vector search
            const recentExperiences = await Experience.find({})
                .select('studentId company role ctc rounds tags year')
                .sort({ createdAt: -1 })
                .limit(3)
                .lean();

            scoredExperiences = recentExperiences.map((exp: any) => ({
                ...exp,
                similarity: 0.5, // Neutral score for fallback
            }));
        }

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

        // Step 4: Generate STREAMING response using Groq (Llama 3.2)
        const systemPrompt = `You are an AI assistant helping students prepare for job interviews. You have access to a database of interview experiences from previous students.

Based on the following interview experiences, answer the user's question. Be specific, helpful, and cite the companies/roles when relevant.

INTERVIEW EXPERIENCES:
${context || 'No relevant experiences found in the database.'}

INSTRUCTIONS:
- Provide a helpful, detailed answer based on the experiences above
- If the experiences don't contain relevant information, say so politely
- Mention specific companies and roles when citing examples
- Be encouraging and supportive
- If asked about interview questions, list them clearly
- Format your response in a clear, readable way`;

        // Use Groq streaming API with Llama 3.2
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ],
            model: 'llama-3.3-70b-versatile', // Current model (3.2 is decommissioned)
            temperature: 0.7,
            max_tokens: 1024,
            stream: true,
        });

        // Create a readable stream
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    // Stream text chunks as they arrive from Groq
                    for await (const chunk of chatCompletion) {
                        const text = chunk.choices[0]?.delta?.content || '';
                        if (text) {
                            const data = `data: ${JSON.stringify({ text })}\n\n`;
                            controller.enqueue(encoder.encode(data));
                        }
                    }

                    // Send sources and completion signal
                    const sources = scoredExperiences.map((exp: any) => ({
                        company: exp.company,
                        role: exp.role,
                        similarity: exp.similarity,
                    }));

                    const finalData = `data: ${JSON.stringify({
                        sources,
                        done: true
                    })}\n\n`;
                    controller.enqueue(encoder.encode(finalData));

                    controller.close();
                } catch (error) {
                    console.error('Streaming error:', error);
                    controller.error(error);
                }
            },
        });

        // Return streaming response
        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
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
