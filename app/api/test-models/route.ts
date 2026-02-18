import { NextResponse } from 'next/server';

/**
 * /api/test-models — Debug endpoint. RESTRICTED to development mode only.
 * In production, this returns 403 to prevent API key leakage and quota abuse.
 */
export async function GET() {
    // SECURITY: Only allow in development
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json(
            { error: 'This endpoint is disabled in production' },
            { status: 403 }
        );
    }

    const results: any = {};

    try {
        const genAI = (await import('@/lib/gemini')).default;

        const modelsToTest = [
            'gemini-1.5-flash',
            'gemini-1.5-flash-latest',
            'gemini-1.5-pro',
            'gemini-1.5-flash-8b',
            'gemini-2.0-flash',
            'gemini-2.0-flash-exp',
            'gemini-pro',
        ];

        for (const modelName of modelsToTest) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent('Say "Hello"');
                results[modelName] = {
                    success: true,
                    response: result.response.text().substring(0, 50)
                };
            } catch (err: any) {
                results[modelName] = {
                    success: false,
                    error: err.message.substring(0, 200)
                };
            }
        }

        // SECURITY: Never expose API key prefixes
        return NextResponse.json({ results });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
