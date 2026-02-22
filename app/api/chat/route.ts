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
        let conversationHistory: Array<{ role: string; content: string }> = [];

        if (Array.isArray(messages)) {
            const lastMessage = messages[messages.length - 1];
            userMessage = lastMessage?.content || lastMessage?.message || '';
            // Capture conversation history (up to last 10 messages) for multi-turn context
            conversationHistory = messages
                .slice(-10)
                .filter((m: any) => m.role && m.content)
                .map((m: any) => ({ role: m.role, content: m.content }));
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

        // Step 1: Multi-field Entity Extraction
        // Extract company, role, verdict, and topic from the user's question in one call
        let extractedCompany: string | null = null;
        let extractedRole: string | null = null;
        let extractedVerdict: string | null = null;
        let extractedTopic: string | null = null;
        try {
            const extractResponse = await groq.chat.completions.create({
                messages: [
                    {
                        role: 'system',
                        content: `Extract structured intent from a student's question about placement/interview experiences.
Return ONLY a JSON object with these fields:
{
  "companyName": "extracted company name or null",
  "roleType": "FULL_TIME or INTERNSHIP or SUMMER_INTERNSHIP or null",
  "verdict": "selected or rejected or null",
  "topic": "extracted technical topic like DSA, System Design, HR, etc. or null"
}
Only include a field value if the user explicitly mentions it. Otherwise set it to null.`
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
                extractedCompany = parsed.companyName || null;
                extractedRole = parsed.roleType || null;
                extractedVerdict = parsed.verdict || null;
                extractedTopic = parsed.topic || null;
            }
        } catch (extractErr) {
            // Silently fail entity extraction — retrieval continues without pre-filtering
        }

        // Step 2: Generate embedding for user's message
        let queryEmbedding: number[] = [];
        try {
            queryEmbedding = await getEmbedding(userMessage);
        } catch (embeddingError) {
            console.log('⚠️ Embedding generation failed, will use text fallback');
        }

        // Step 3: Hybrid Retrieval against ExperienceChunk
        let scoredChunks: any[] = [];

        // Only use company name as a hard filter (it exists on all chunks).
        // Verdict and roleType are used as re-ranking boosts, not hard filters,
        // because existing chunks may not have these metadata fields.
        const companyFilter: any = {};
        if (extractedCompany) {
            companyFilter['metadata.companyName'] = {
                $regex: new RegExp(extractedCompany.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
            };
        }

        console.log(`🔍 RAG Query: "${userMessage}"`);
        console.log(`🏢 Extracted: company=${extractedCompany}, role=${extractedRole}, verdict=${extractedVerdict}, topic=${extractedTopic}`);

        if (queryEmbedding.length > 0) {
            // Vector-based retrieval with cosine similarity
            const vectorFilter = { ...companyFilter, embedding: { $exists: true, $ne: null } };

            // Fetch candidate chunks (expanded pool for better recall)
            const candidateChunks = await ExperienceChunk.find(vectorFilter)
                .select('text metadata embedding')
                .lean()
                .limit(200);

            console.log(`📦 Vector candidates found: ${candidateChunks.length} (filter: ${JSON.stringify(vectorFilter)})`);

            // Tuned similarity threshold for better recall
            const SIMILARITY_THRESHOLD = 0.30;

            scoredChunks = candidateChunks
                .map((chunk: any) => {
                    let similarity = chunk.embedding
                        ? cosineSimilarity(queryEmbedding, chunk.embedding)
                        : 0;

                    // Boost score for metadata matches (re-ranking instead of hard filtering)
                    if (extractedVerdict && chunk.metadata.verdict &&
                        chunk.metadata.verdict.toLowerCase().includes(extractedVerdict.toLowerCase())) {
                        similarity += 0.05;
                    }
                    if (extractedRole && chunk.metadata.roleType === extractedRole) {
                        similarity += 0.03;
                    }

                    return { ...chunk, similarity };
                })
                .filter((chunk: any) => chunk.similarity >= SIMILARITY_THRESHOLD)
                .sort((a: any, b: any) => b.similarity - a.similarity)
                .slice(0, 8);

            console.log(`✅ Vector results after threshold: ${scoredChunks.length}`);
            if (scoredChunks.length > 0) {
                console.log(`   Top score: ${scoredChunks[0].similarity.toFixed(3)}, Company: ${scoredChunks[0].metadata.companyName}`);
            }
        }

        // Step 3b: Text-based fallback when vector search returns no/few results
        if (scoredChunks.length < 3) {
            const searchTerms: string[] = [];
            if (extractedCompany) searchTerms.push(extractedCompany);
            if (extractedTopic) searchTerms.push(extractedTopic);

            // Extract key words from the user message (words > 3 chars, skip stop words)
            const stopWords = new Set(['what', 'which', 'when', 'where', 'about', 'with', 'from', 'that', 'this', 'have', 'been', 'were', 'they', 'their', 'your', 'does', 'tell', 'give', 'some', 'more', 'most', 'also', 'very', 'much', 'many', 'interview', 'experience', 'placement', 'company', 'hired', 'people', 'recruit', 'process']);
            const queryWords = userMessage
                .toLowerCase()
                .replace(/[^\w\s]/g, '')
                .split(/\s+/)
                .filter(w => w.length > 3 && !stopWords.has(w));
            searchTerms.push(...queryWords.slice(0, 5));

            // De-duplicate search terms
            const uniqueTerms = [...new Set(searchTerms.filter(t => t && t.trim().length > 0))];

            if (uniqueTerms.length > 0) {
                const regexPattern = uniqueTerms
                    .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                    .join('|');

                // Text fallback does NOT use metadata filters — search broadly
                const textFilter: any = {
                    text: { $regex: new RegExp(regexPattern, 'i') }
                };

                console.log(`📝 Text fallback search: terms=[${uniqueTerms.join(', ')}]`);

                const fallbackChunks = await ExperienceChunk.find(textFilter)
                    .select('text metadata')
                    .lean()
                    .limit(10);

                console.log(`📝 Text fallback results: ${fallbackChunks.length}`);

                // Merge with existing results, avoiding duplicates
                const existingIds = new Set(scoredChunks.map((c: any) => c._id?.toString()));
                const newChunks = fallbackChunks
                    .filter((c: any) => !existingIds.has(c._id?.toString()))
                    .map((chunk: any) => ({
                        ...chunk,
                        similarity: 0,
                    }));
                scoredChunks = [...scoredChunks, ...newChunks].slice(0, 8);
            }
        }

        // Step 3c: Broadest fallback — if still nothing, grab any chunks from the DB
        if (scoredChunks.length === 0) {
            console.log('🔄 Broadest fallback: fetching any available chunks');
            const anyChunks = await ExperienceChunk.find({})
                .select('text metadata')
                .lean()
                .limit(5);

            console.log(`🔄 Broadest fallback results: ${anyChunks.length}`);
            scoredChunks = anyChunks.map((chunk: any) => ({
                ...chunk,
                similarity: 0,
            }));
        }

        console.log(`📊 Final chunk count for LLM: ${scoredChunks.length}`);

        // Step 4: Build Rich Context
        const context = scoredChunks
            .map((chunk: any, index: number) => {
                const m = chunk.metadata;
                const headerParts = [
                    `Student: ${m.studentName}`,
                    `Company: ${m.companyName}`,
                    `Role: ${(m.roleType || '').replace('_', ' ')}`,
                ];
                if (m.verdict) headerParts.push(`Outcome: ${m.verdict}`);
                if (m.ctc) headerParts.push(`CTC: ${m.ctc} LPA`);
                if (m.batch) headerParts.push(`Batch: ${m.batch}`);
                if (m.workModel) headerParts.push(`Work Model: ${(m.workModel || '').replace('_', ' ')}`);
                if (m.placementType) headerParts.push(`Type: ${(m.placementType || '').replace('_', ' ')}`);

                return `[Source ${index + 1}] (${headerParts.join(' | ')}):
${chunk.text}`.trim();
            })
            .join('\n\n---\n\n');

        // Step 5: Enhanced System Prompt with structured guidance
        const systemPrompt = `You are the **Placement Chronicles Assistant**, an AI helping students prepare for job interviews. You answer questions based STRICTLY on collected interview experiences from real students.

CONTEXT (Retrieved Interview Experiences):
${context || 'No specific experiences matching the query were found in the database.'}

INSTRUCTIONS:
1. **ONLY use the provided context.** Do NOT generate information that is not present in the sources above.
2. **If the context is empty or does not contain relevant information**, respond: "I don't have specific experiences about that in my database yet. Try asking about a specific company or topic, or check back later as more experiences are added."
3. **Cite your sources** by referring to the student's name and company in your answer (e.g., "According to [Student]'s experience at [Company]...").
4. **Structure your answers clearly** using these sections as appropriate:
   - **📋 Interview Process**: Describe the rounds, their types, and flow
   - **❓ Key Questions Asked**: List specific interview questions from the experiences
   - **💡 Tips & Preparation Advice**: Share tips the students provided
   - **✅ Outcome**: Mention if the student was selected or rejected (if available)
   - **📊 Compensation & Eligibility**: CTC, CGPA requirements, backlog policies (if available)
5. **Be specific and detailed**. Include actual questions, topics, and strategies mentioned by students rather than generic advice.
6. **If multiple experiences are available**, compare and synthesize them to give a comprehensive picture.
7. Use markdown formatting (bold, bullet points, headers) for readability.`;

        // Build the messages array for Groq, including conversation history for multi-turn
        const groqMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
            { role: 'system', content: systemPrompt },
        ];

        // Add prior conversation turns (excluding the last one which is the current question)
        if (conversationHistory.length > 1) {
            const priorMessages = conversationHistory.slice(0, -1);
            for (const msg of priorMessages) {
                if (msg.role === 'user' || msg.role === 'assistant') {
                    groqMessages.push({
                        role: msg.role as 'user' | 'assistant',
                        content: msg.content.substring(0, 500), // Truncate to save tokens
                    });
                }
            }
        }

        // Add the current user message
        groqMessages.push({ role: 'user', content: userMessage });

        // Use Groq streaming API
        const chatCompletion = await groq.chat.completions.create({
            messages: groqMessages,
            model: 'llama-3.3-70b-versatile',
            temperature: 0.5, // Slightly lower for more focused answers
            max_tokens: 2048, // Increased for more detailed answers
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
                        student: chunk.metadata.studentName,
                        similarity: chunk.similarity,
                    }));

                    const finalData = `data: ${JSON.stringify({
                        sources,
                        done: true
                    })}\n\n`;
                    controller.enqueue(encoder.encode(finalData));

                    controller.close();
                } catch (error) {
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
        return NextResponse.json(
            {
                error: 'An internal server error occurred while processing your chat message.',
            },
            { status: 500 }
        );
    }
}

// CORS is handled by Next.js middleware — no wildcard Access-Control-Allow-Origin

