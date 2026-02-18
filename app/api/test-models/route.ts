import { NextResponse } from 'next/server';

export async function GET() {
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

        return NextResponse.json({
            apiKeyPrefix: process.env.GEMINI_API_KEY?.substring(0, 12) + '...',
            results
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
