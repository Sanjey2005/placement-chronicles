import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { GROQ_MODELS } from '@/lib/ai-models';
import dbConnect from '@/lib/db';
import type { FilterQuery, Types } from 'mongoose';
import ExperienceChunk, { type IExperienceChunk } from '@/models/ExperienceChunk';
import Company from '@/models/Company';
import { getEmbedding, cosineSimilarity, loadModel } from '@/lib/vector';
import { chatRateLimiter } from '@/lib/redis';
import { stripHtmlTags } from '@/lib/sanitize';
import { formatCompensation } from '@/lib/utils';
import { keywordScores, spreadAcross, terms } from '@/lib/retrieval';

// Initialize Groq client
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// A broad question (no company named) draws on this many experiences, one excerpt each, trimmed
// to this many characters: ~3K tokens of context, inside Groq's 8K tokens a minute alongside
// the 2048-token answer.
const BROAD_LIMIT = 16;
const BROAD_EXCERPT_CHARS = 700;

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

// Honest no-data reply. A hidden company gets the same one, so hidden is
// indistinguishable from absent.
function noDataReply(companyName: string | null): Response {
    return sseText(
        companyName
            ? `I don't have any experiences for **${companyName}** in my database yet. Try asking about another company, or check back later as more experiences are added.`
            : `I don't have specific experiences about that in my database yet. Try asking about a specific company or topic covered on the site.`
    );
}

type ChatMessage = { role: string; content: string };

// The fields retrieval reads off a chunk; `.lean<ChunkDoc[]>()` narrows each
// query to this shape (embedding is only selected on the vector path).
type ChunkDoc = {
    _id: Types.ObjectId;
    experienceId: Types.ObjectId;
    text: string;
    metadata: IExperienceChunk['metadata'];
    embedding?: number[];
};
type ScoredChunk = ChunkDoc & { similarity: number };

export async function POST(request: NextRequest) {
    try {
        // Parse request body
        const body = await request.json();
        const { messages } = body;

        let userMessage: string;
        let conversationHistory: ChatMessage[] = [];

        if (Array.isArray(messages)) {
            const lastMessage = messages[messages.length - 1];
            userMessage = lastMessage?.content || lastMessage?.message || '';
            // Capture conversation history (up to last 10 messages) for multi-turn context
            conversationHistory = messages
                .slice(-10)
                .filter((m): m is ChatMessage => typeof m?.role === 'string' && typeof m?.content === 'string')
                .map((m) => ({ role: m.role, content: m.content }));
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
        // ponytail: 2,000 characters, the same cap getEmbedding applies; bounds what one request costs in Groq tokens
        userMessage = stripHtmlTags(userMessage).slice(0, 2000);

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

        // Start loading the embedding model now (a no-op once warm), so after an idle spell it
        // loads while the DB connects and the extractor runs; getEmbedding awaits the same load.
        // A failure surfaces there and drops chat to keyword search.
        loadModel().catch(() => {});

        // Connect to database
        await dbConnect();

        // Step 1: Entity extraction + query rewriting in a single 8b call.
        // The conversation context lets follow-ups like "what about the HR round?"
        // resolve into a standalone search query mentioning the company.
        let extractedCompany: string | null = null;
        let extractedRole: string | null = null;
        let extractedVerdict: string | null = null;
        let extractedTopic: string | null = null;
        let extractedKeywords: string[] = [];
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
  "searchQuery": "the current question restated as a standalone search query, with any company/topic/pronoun references resolved from the conversation",
  "keywords": ["3 to 8 search keywords or short phrases"]
}
For companyName: if the question refers to one of the companies listed above — even via an abbreviation, initials, ticker, or misspelling (e.g. "jpm"/"jpmc" -> "J.P. Morgan", "aws" -> "Amazon") — return that company's name EXACTLY as written in the list. If it refers to a company not in the list, return your best normalized guess. Otherwise set it to null.
For roleType/verdict/topic: only set a value if it is explicit in the question or clearly carried over from the conversation. Otherwise set it to null.
For keywords: the words a student's write-up would use for what is asked, with acronyms spelled out, close synonyms and the specific subtopics a write-up might list (e.g. "DSA" -> "DSA", "data structures", "algorithms", "arrays", "strings", "trees", "graphs", "dynamic programming"; "CP" -> "competitive programming", "coding"). Fix misspellings. Leave out company names and filler words.`
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
                if (Array.isArray(parsed.keywords)) {
                    extractedKeywords = parsed.keywords.filter((k: unknown): k is string => typeof k === 'string').slice(0, 10);
                }
            }
        } catch {
            // Silently fail entity extraction — retrieval continues on the raw message
        }

        // Step 2: Embed the (rewritten) search query
        let queryEmbedding: number[] = [];
        try {
            queryEmbedding = await getEmbedding(searchQuery);
        } catch {
            console.log('⚠️ Embedding generation failed, will use text fallback');
        }

        // Step 3: Retrieval against ExperienceChunk, ranked best-first
        let ranked: ScoredChunk[] = [];

        // Only use company name as a hard filter (it exists on all chunks).
        // Verdict and roleType are used as re-ranking boosts, not hard filters,
        // because existing chunks may not have these metadata fields.
        // Resolve the extracted name against the Company collection (canonical
        // name or alias) and match exactly — no partial-prefix false positives.
        // Hidden companies never reach the chatbot, in either retrieval path.
        const hidden = await Company.distinct('canonicalName', { isHidden: true });
        const companyFilter: FilterQuery<IExperienceChunk> = { 'metadata.companyName': { $nin: hidden } };
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
            if (known?.isHidden) {
                console.log(`🙈 ${companyName} is hidden — returning no-data reply`);
                return noDataReply(companyName);
            }
            companyFilter['metadata.companyName'] = { $regex: exactMatch(companyName), $nin: hidden };
        }

        const broad = !companyName; // no company named: the question spans companies

        console.log(`🔍 RAG Query: "${userMessage}" → search: "${searchQuery}"`);
        console.log(`🏢 Extracted: company=${extractedCompany}→${companyName}, role=${extractedRole}, verdict=${extractedVerdict}, topic=${extractedTopic}`);

        if (queryEmbedding.length > 0) {
            // Vector-based retrieval with cosine similarity.
            // ponytail: brute-force cosine over all embedded chunks — corpus is
            // FIFO-capped (~5k experiences). Upgrade to Atlas $vectorSearch
            // (see mongodb-vector-index.json) if chunk count outgrows that.
            const vectorFilter = { ...companyFilter, 'embedding.0': { $exists: true } };

            const candidateChunks = await ExperienceChunk.find(vectorFilter)
                .select('text metadata embedding experienceId')
                .lean<ChunkDoc[]>();

            console.log(`📦 Vector candidates found: ${candidateChunks.length} (filter: ${JSON.stringify(vectorFilter)})`);

            // MiniLM cosine scores cluster narrowly; 0.30 admits noise. A broad question
            // matches each company's write-ups loosely (a DSA question puts ~8 chunks over
            // 0.45 but ~28 companies over 0.35), and the spread below still takes each
            // company's best, so it gets the wider bar.
            const SIMILARITY_THRESHOLD = broad ? 0.35 : 0.45;

            ranked = candidateChunks
                .map((chunk): ScoredChunk => {
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
                .filter((chunk) => chunk.similarity >= SIMILARITY_THRESHOLD)
                .sort((a, b) => b.similarity - a.similarity);

            console.log(`✅ Vector results after threshold: ${ranked.length}`);
            if (ranked.length > 0) {
                console.log(`   Top score: ${ranked[0].similarity.toFixed(3)}, Company: ${ranked[0].metadata.companyName}`);
            }
        }

        // Step 3b: Keyword fallback ONLY when embedding is unavailable (HF outage,
        // no credits, missing key), never to pad vector results. BM25 over every
        // chunk in the company filter, fed by the extractor's keywords so "DSA"
        // also finds "data structures"; similarity is relative to the best match.
        if (queryEmbedding.length === 0) {
            const queryTerms = terms([searchQuery, extractedTopic, ...extractedKeywords].filter(Boolean).join(' '));
            const chunks = await ExperienceChunk.find(companyFilter)
                .select('text metadata experienceId')
                .lean<ChunkDoc[]>();
            const scores = keywordScores(queryTerms, chunks.map((c) => c.text));
            const best = Math.max(0, ...scores);
            // One company: all its chunks stay candidates, the company match is the
            // signal ("How was X's process?" has no other words to rank by). Across
            // companies, generic-word matches stay out.
            ranked = chunks
                .map((chunk, i): ScoredChunk => ({ ...chunk, similarity: best ? scores[i] / best : 0 }))
                .filter((chunk) => !broad || chunk.similarity >= 0.2)
                .sort((a, b) => b.similarity - a.similarity);

            console.log(`📝 Keyword fallback: terms=[${queryTerms.join(', ')}] → ${ranked.length} matches`);
        }

        // No company named: one excerpt per experience, spread across companies, so
        // a broad question hears from many students rather than the top chunks of two
        // write-ups. One company: its best matches, at most 3 from any one write-up.
        const keyOf = (c: ScoredChunk) => ({ company: c.metadata.companyName, experience: String(c.experienceId) });
        const scoredChunks = broad ? spreadAcross(ranked, BROAD_LIMIT, keyOf) : spreadAcross(ranked, 8, keyOf, 3);

        // Step 3c: Nothing relevant found — say so honestly instead of feeding
        // arbitrary chunks to a context-only prompt.
        if (scoredChunks.length === 0) {
            console.log('🚫 No relevant chunks — returning honest no-data reply');
            return noDataReply(companyName);
        }

        console.log(`📊 Final chunk count for LLM: ${scoredChunks.length}${broad ? ' (broad: spread across companies)' : ''}`);

        // Step 4: Build Rich Context
        const context = scoredChunks
            .map((chunk, index) => {
                const m = chunk.metadata;
                const headerParts = [
                    `Student: ${m.studentName}`,
                    `Company: ${m.companyName}`,
                    `Role: ${(m.roleType || '').replace('_', ' ')}`,
                ];
                if (m.verdict) headerParts.push(`Outcome: ${m.verdict}`);
                // Internships store a monthly stipend, full-time roles LPA
                if (m.ctc) headerParts.push(`CTC: ₹${formatCompensation(m.ctc, m.roleType)}`);
                if (m.batch) headerParts.push(`Batch: ${m.batch}`);
                if (m.workModel) headerParts.push(`Work Model: ${(m.workModel || '').replace('_', ' ')}`);
                if (m.placementType) headerParts.push(`Type: ${(m.placementType || '').replace('_', ' ')}`);

                // ponytail: chunks built before the stipend fix in lib/vector.ts say
                // "Offered CTC: 70000 LPA." for internships too; rewritten here until
                // scripts/backfill-chunks.ts re-chunks them
                let text = m.ctc
                    ? chunk.text.replace(/Offered CTC: [\d.]+ LPA\./, `Offered CTC: ₹${formatCompensation(m.ctc, m.roleType)}.`)
                    : chunk.text;
                if (broad && text.length > BROAD_EXCERPT_CHARS) text = `${text.slice(0, BROAD_EXCERPT_CHARS)}…`;

                return `[Source ${index + 1}] (${headerParts.join(' | ')}):
${text}`.trim();
            })
            .join('\n\n---\n\n');

        // Step 5: System prompt. The aspects are there to draw on, not a template to
        // fill: answers lead with what was asked and skip what the question didn't need.
        const experienceCount = new Set(scoredChunks.map((c) => String(c.experienceId))).size;
        const companyCount = new Set(scoredChunks.map((c) => c.metadata.companyName)).size;
        const systemPrompt = `You are the **Placement Chronicles Assistant**, helping PSG Tech students prepare for placements. You answer STRICTLY from the interview experiences below, which real students shared.

EXPERIENCES (${scoredChunks.length} excerpts from ${experienceCount} experiences across ${companyCount} ${companyCount === 1 ? 'company' : 'companies'}):
${context}

INSTRUCTIONS:
1. **Only use these experiences.** Never fill gaps with general knowledge: no topics, example problems or figures that aren't in the excerpts. If they don't cover the question, say: "I don't have specific experiences about that in my database yet." If they cover part of it, answer that part and say in one line what isn't covered.
2. **Answer the question that was asked, directly**, starting with the answer itself. Fit the length to the question: a narrow question gets a short answer.
3. **Cite where each point comes from**, by student and company or as [Source N].
4. **Worth covering only when it helps answer this question:** the process and rounds, questions that were asked, preparation tips and resources, eligibility (CGPA, backlogs), and, only when asked, the outcome and pay. Skip everything else silently: no section or note about what wasn't asked or isn't mentioned.
5. **Be specific**: quote real questions, topics and advice instead of generic tips.
6. Format for easy reading: short paragraphs and lists, **bold** for key terms, ### headings only when a longer answer needs sections. Do not use emoji.${broad ? `
7. **This question spans companies.** Bring together what students across the companies said: lead with what came up most, say how widely out of the ${experienceCount} experiences above (e.g. "in 5 of ${experienceCount}"), and name the companies. Count an experience only where its excerpt says so, and list only what the excerpts name: if students mostly wrote just "DSA", say that, then give the specific topics the others named; don't break a topic down further yourself, and don't add "implied" topics or a study plan beyond what the excerpts name.` : ''}`;

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
                        // The final chunk reports usage; the account allows 8K tokens a minute
                        const usage = chunk.x_groq?.usage;
                        if (usage) console.log(`🧮 Groq tokens: ${usage.prompt_tokens} prompt + ${usage.completion_tokens} completion`);
                    }

                    // Send sources and completion signal
                    const sources = scoredChunks.map((chunk) => ({
                        company: chunk.metadata.companyName,
                        role: chunk.metadata.roleType,
                        student: chunk.metadata.studentName,
                        experienceId: String(chunk.experienceId), // the chat links each source to it
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
    } catch {
        return NextResponse.json(
            {
                error: 'An internal server error occurred while processing your chat message.',
            },
            { status: 500 }
        );
    }
}

// CORS is handled by Next.js middleware — no wildcard Access-Control-Allow-Origin

