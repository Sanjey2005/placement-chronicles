import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { GROQ_MODELS } from '@/lib/ai-models';
import dbConnect from '@/lib/db';
import ExperienceChunk from '@/models/ExperienceChunk';
import Company from '@/models/Company';
import { getEmbedding, cosineSimilarity } from '@/lib/vector';
import { chatRateLimiter } from '@/lib/redis';
import { stripHtmlTags } from '@/lib/sanitize';

// Initialize Groq client
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

const SSE_HEADERS = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
};

// Anchored, case-insensitive exact match (avoids "Micro" matching Microsoft AND Micron)
function exactMatch(s: string): RegExp {
    return new RegExp(`^${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
}

// Static SSE response in the same two-event shape the streaming path emits,
// so the /chat client works unchanged.
function sseText(text: string): Response {
    const body =
        `data: ${JSON.stringify({ text })}\n\n` +
        `data: ${JSON.stringify({ sources: [], done: true })}\n\n`;
    return new Response(body, { headers: SSE_HEADERS });
}

export async function POST(request: NextRequest) {
    try {
        // Parse request body
        const body = await request.json();
        const { messages } = body;

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
        } else {
            return NextResponse.json(
                { error: 'Messages array is required' },
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

        // Step 1: Entity extraction + query rewriting in a single 8b call.
        // The conversation context lets follow-ups like "what about the HR round?"
        // resolve into a standalone search query mentioning the company.
        let extractedCompany: string | null = null;
        let extractedRole: string | null = null;
        let extractedVerdict: string | null = null;
        let extractedTopic: string | null = null;
        let searchQuery = userMessage;
        try {
            const recentTurns = conversationHistory
                .slice(-6)
                .map(m => `${m.role}: ${m.content.substring(0, 300)}`)
                .join('\n');

            // Give the extractor the live company roster so it can resolve
            // abbreviations/initials/misspellings ("jpm" -> "J.P. Morgan")
            // against whatever companies actually exist — no hardcoded alias
            // list to maintain as new companies get added.
            const knownCompanies = await Company.find().select('canonicalName').lean<{ canonicalName: string }[]>();
            const companyRoster = knownCompanies.map((c) => c.canonicalName).join(', ');

            const extractResponse = await groq.chat.completions.create({
                messages: [
                    {
                        role: 'system',
                        content: `Extract structured intent from a student's question about placement/interview experiences, using the conversation for context.
Companies already in our database: [${companyRoster || 'None yet.'}]
Return ONLY a JSON object with these fields:
{
  "companyName": "extracted company name or null",
  "roleType": "FULL_TIME or INTERNSHIP or SUMMER_INTERNSHIP or null",
  "verdict": "selected or rejected or null",
  "topic": "extracted technical topic like DSA, System Design, HR, etc. or null",
  "searchQuery": "the current question restated as a standalone search query, with any company/topic/pronoun references resolved from the conversation"
}
For companyName: if the question refers to one of the companies listed above — even via an abbreviation, initials, ticker, or misspelling (e.g. "jpm"/"jpmc" -> "J.P. Morgan", "aws" -> "Amazon") — return that company's name EXACTLY as written in the list. If it refers to a company not in the list, return your best normalized guess. Otherwise set it to null.
For roleType/verdict/topic: only set a value if it is explicit in the question or clearly carried over from the conversation. Otherwise set it to null.`
                    },
                    {
                        role: 'user',
                        content: recentTurns
                            ? `Conversation so far:\n${recentTurns}\n\nCurrent question: ${userMessage}`
                            : userMessage
                    }
                ],
                model: GROQ_MODELS.FAST,
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
                if (typeof parsed.searchQuery === 'string' && parsed.searchQuery.trim()) {
                    searchQuery = parsed.searchQuery.trim();
                }
            }
        } catch (extractErr) {
            // Silently fail entity extraction — retrieval continues on the raw message
        }

        // Step 2: Embed the (rewritten) search query
        let queryEmbedding: number[] = [];
        try {
            queryEmbedding = await getEmbedding(searchQuery);
        } catch (embeddingError) {
            console.log('⚠️ Embedding generation failed, will use text fallback');
        }

        // Step 3: Hybrid Retrieval against ExperienceChunk
        let scoredChunks: any[] = [];

        // Only use company name as a hard filter (it exists on all chunks).
        // Verdict and roleType are used as re-ranking boosts, not hard filters,
        // because existing chunks may not have these metadata fields.
        // Resolve the extracted name against the Company collection (canonical
        // name or alias) and match exactly — no partial-prefix false positives.
        const companyFilter: any = {};
        let companyName: string | null = null;
        if (extractedCompany) {
            // Extraction already resolved the name against the live company
            // roster (see Step 1) — this just normalizes case/whitespace
            // against the stored record.
            const rx = exactMatch(extractedCompany);
            const known = await Company.findOne({
                $or: [{ canonicalName: rx }, { aliases: rx }],
            }).lean();
            companyName = known?.canonicalName ?? extractedCompany;
            companyFilter['metadata.companyName'] = exactMatch(companyName);
        }

        console.log(`🔍 RAG Query: "${userMessage}" → search: "${searchQuery}"`);
        console.log(`🏢 Extracted: company=${extractedCompany}→${companyName}, role=${extractedRole}, verdict=${extractedVerdict}, topic=${extractedTopic}`);

        if (queryEmbedding.length > 0) {
            // Vector-based retrieval with cosine similarity.
            // ponytail: brute-force cosine over all embedded chunks — corpus is
            // FIFO-capped (~5k experiences). Upgrade to Atlas $vectorSearch
            // (see mongodb-vector-index.json) if chunk count outgrows that.
            const vectorFilter = { ...companyFilter, 'embedding.0': { $exists: true } };

            const candidateChunks = await ExperienceChunk.find(vectorFilter)
                .select('text metadata embedding')
                .lean();

            console.log(`📦 Vector candidates found: ${candidateChunks.length} (filter: ${JSON.stringify(vectorFilter)})`);

            // MiniLM cosine scores cluster narrowly; 0.30 admits noise
            const SIMILARITY_THRESHOLD = 0.45;

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

        // Step 3b: Text-based fallback ONLY when embedding is unavailable
        // (HF outage / missing key) — never to pad good vector results with
        // keyword noise. Stays scoped to the company filter.
        if (queryEmbedding.length === 0) {
            const searchTerms: string[] = [];
            if (companyName) searchTerms.push(companyName);
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

                const textFilter: any = {
                    ...companyFilter,
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

        // Step 3c: Nothing relevant found — say so honestly instead of feeding
        // arbitrary chunks to a context-only prompt.
        if (scoredChunks.length === 0) {
            console.log('🚫 No relevant chunks — returning honest no-data reply');
            return sseText(
                companyName
                    ? `I don't have any experiences for **${companyName}** in my database yet. Try asking about another company, or check back later as more experiences are added.`
                    : `I don't have specific experiences about that in my database yet. Try asking about a specific company or topic covered on the site.`
            );
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
            model: GROQ_MODELS.VERSATILE,
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
        return new Response(stream, { headers: SSE_HEADERS });
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

