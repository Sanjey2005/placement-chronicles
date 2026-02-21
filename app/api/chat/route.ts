import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import dbConnect from '@/lib/db';
import ExperienceChunk from '@/models/ExperienceChunk';
import { getEmbedding, cosineSimilarity } from '@/lib/vector';
import { chatRateLimiter } from '@/lib/redis';
import { stripHtmlTags } from '@/lib/sanitize';

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

        // SECURITY: Sanitize user message to prevent XSS/injection
        userMessage = stripHtmlTags(userMessage);

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

        // Step 1: LLM Entity Extraction for Metadata Pre-filtering (Phase 2)
        let extractedCompany: string | null = null;
        try {
            const extractResponse = await groq.chat.completions.create({
                messages: [
                    {
                        role: 'system',
                        content: `Extract the company name the user is asking about. Return ONLY a JSON object: {"companyName": "extracted_name"}. If no specific company is mentioned, return {"companyName": null}.`
                    },
                    { role: 'user', content: userMessage }
                ],
                model: 'llama-3.3-70b-versatile',
                temperature: 0,
                response_format: { type: 'json_object' }
            });

            const content = extractResponse.choices[0]?.message?.content;
            if (content) {
                const parsed = JSON.parse(content);
                extractedCompany = parsed.companyName;
                console.log('🔍 Extracted entity:', extractedCompany);
            }
        } catch (extractErr) {
            console.error('⚠️ Entity extraction failed:', extractErr);
        }

        // Step 2: Generate embedding for user's message
        let queryEmbedding: number[] = [];
        try {
            queryEmbedding = await getEmbedding(userMessage);
        } catch (embeddingError) {
            console.warn('⚠️ Embedding generation failed, skipping vector search:', embeddingError);
        }

        // Step 3: Hybrid Retrieval against ExperienceChunk (Phase 2)
        let scoredChunks: any[] = [];

        if (queryEmbedding.length > 0) {
            // Build base filter based on extracted metadata
            const queryFilter: any = { embedding: { $exists: true, $ne: null } };

            if (extractedCompany) {
                // Perform a case-insensitive regex match against companyName
                queryFilter['metadata.companyName'] = { $regex: new RegExp(extractedCompany, 'i') };
            }

            // Fetch candidate chunks
            const candidateChunks = await ExperienceChunk.find(queryFilter)
                .select('text metadata embedding')
                .lean()
                .limit(100); // Limit pool size for in-memory cosine sim

            // Strict similarity thresholding
            const SIMILARITY_THRESHOLD = 0.50; // Increased threshold to drop hallucinated matches

            scoredChunks = candidateChunks
                .map((chunk: any) => ({
                    ...chunk,
                    similarity: chunk.embedding
                        ? cosineSimilarity(queryEmbedding, chunk.embedding)
                        : 0,
                }))
                .filter((chunk: any) => chunk.similarity >= SIMILARITY_THRESHOLD)
                .sort((a: any, b: any) => b.similarity - a.similarity)
                .slice(0, 5); // Return Top-5 chunks (K=5)
        }

        // Step 4: Build Context (Phase 3 Prep)
        const context = scoredChunks
            .map((chunk: any, index: number) => {
                return `[Source ${index + 1}] (Student: ${chunk.metadata.studentName} | Company: ${chunk.metadata.companyName} | Role: ${chunk.metadata.roleType.replace('_', ' ')}):
${chunk.text}`.trim();
            })
            .join('\n\n');

        // Step 5: Strict Citation Prompt Generation (Phase 3)
        const systemPrompt = `You are the Placement Chronicles Assistant, an AI helping students prepare for job interviews based strictly on collected student experiences.

CONTEXT (Retrieved Interview Experiences):
${context || 'No specific experiences matching the query were found.'}

INSTRUCTIONS:
1. You MUST ONLY answer using the provided context.
2. If the context does not contain the answer or is empty, say: "I don't have enough specific experiences about that yet in my database. Please check back later or try rephrasing." DO NOT guess or hallucinate.
3. You MUST cite your sources at the end of every claim using the metadata provided (e.g., "According to [studentName]'s experience at [companyName]...").
4. Be helpful but rigidly adhere to only providing information present in the Context.`;

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
                    const sources = scoredChunks.map((chunk: any) => ({
                        company: chunk.metadata.companyName,
                        role: chunk.metadata.roleType,
                        similarity: chunk.similarity,
                    }));

                    const finalData = `data: ${JSON.stringify({
                        sources,
                        done: true
                    })}\n\n`;
                    controller.enqueue(encoder.encode(finalData));

                    controller.close();
                } catch (error) {
                    console.error('Streaming error occurred');
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
        console.error('Chat API error occurred');
        return NextResponse.json(
            {
                error: 'Failed to process chat message',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

// CORS is handled by Next.js middleware — no wildcard Access-Control-Allow-Origin
