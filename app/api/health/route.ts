import { NextResponse } from 'next/server';
import { getEmbedding, loadModel, modelFiles, modelSource } from '@/lib/vector';

// Public check that the embedding model works in production (middleware lists it as public;
// the global API rate limit still applies). No input, no secrets: just timings and a label.
const SENTENCE = 'Health check: how was the online test for the internship?';
let served = false;

export async function GET() {
    const coldStart = !served;
    served = true;
    const headers = { 'Cache-Control': 'no-store' };
    // Why the weights are or aren't bundled, without exposing paths: present at runtime, fetched at build
    const diag = { ...modelFiles(), buildFetchRan: process.env.MODEL_FETCHED_AT_BUILD === 'yes' };
    try {
        const warm = modelSource !== null; // loading already started in this process
        let started = Date.now();
        await loadModel();
        const loadMs = warm ? 0 : Date.now() - started;
        started = Date.now();
        const vector = await getEmbedding(SENTENCE);
        const embedMs = Date.now() - started;
        return NextResponse.json({ ok: vector.length === 384, source: modelSource, loadMs, embedMs, dims: vector.length, coldStart, ...diag }, { headers });
    } catch {
        return NextResponse.json({ ok: false, error: 'embedding model unavailable', coldStart, ...diag }, { status: 503, headers });
    }
}
