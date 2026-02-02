import { NextRequest, NextResponse } from 'next/server';
import { extractWithGemini } from '@/lib/gemini';

// @ts-ignore - pdf-parse is a CommonJS module
const pdf = require('pdf-parse');

export async function POST(request: NextRequest) {
    try {
        console.log('📤 PDF Upload started');

        // Get the uploaded file from the request
        const formData = await request.formData();
        const file = formData.get('file') as File;
        console.log('📄 File received:', file?.name, file?.type, file?.size);

        if (!file) {
            return NextResponse.json(
                { error: 'No file uploaded' },
                { status: 400 }
            );
        }

        // Validate file type
        if (file.type !== 'application/pdf') {
            return NextResponse.json(
                { error: 'Only PDF files are supported' },
                { status: 400 }
            );
        }

        console.log('✅ File validation passed');

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        console.log('📦 Buffer created, size:', buffer.length);

        // Extract text from PDF
        console.log('🔍 Starting PDF text extraction...');
        const pdfData = await pdf(buffer);
        const extractedText = pdfData.text;
        console.log('📝 Text extracted, length:', extractedText?.length);

        if (!extractedText || extractedText.trim().length === 0) {
            return NextResponse.json(
                { error: 'No text could be extracted from the PDF' },
                { status: 400 }
            );
        }

        // Define the extraction prompt for Gemini
        const extractionPrompt = `
You are an expert at extracting structured interview experience data from text.

Extract the following information from the interview experience document:
1. Company name
2. Role/Position
3. CTC (Compensation) - extract the number only in lakhs
4. Student ID (if mentioned)
5. Year of placement (if mentioned)
6. Interview rounds - for each round extract:
   - Round number
   - Round type (e.g., Technical, HR, Aptitude, Coding, etc.)
   - Questions asked (as an array)
   - Description (if any)
   - Duration (if mentioned)

Return the data in the following JSON format:
{
  "studentId": "string or null",
  "company": "string",
  "role": "string",
  "ctc": number,
  "year": number or null,
  "rounds": [
    {
      "roundNumber": number,
      "roundType": "string",
      "questions": ["string"],
      "description": "string or null",
      "duration": "string or null"
    }
  ],
  "tags": ["string"] // relevant tags like technology stack, skills, etc.
}

If any field is not found, use null for optional fields or reasonable defaults.
    `.trim();


        // Extract structured data using Gemini
        console.log('🤖 Starting Gemini extraction...');
        const extractedData = await extractWithGemini(extractedText, extractionPrompt);
        console.log('✅ Gemini extraction complete:', JSON.stringify(extractedData, null, 2));

        // Return the extracted data
        return NextResponse.json({
            success: true,
            data: extractedData,
            rawText: extractedText.substring(0, 500) + '...', // First 500 chars for reference
        });


    } catch (error) {
        console.error('Error processing PDF:', error);

        // Detailed error logging
        if (error instanceof Error) {
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
        }

        return NextResponse.json(
            {
                error: 'Failed to process PDF',
                details: error instanceof Error ? error.message : 'Unknown error',
                type: error instanceof Error ? error.name : 'UnknownError'
            },
            { status: 500 }
        );
    }
}

// App Router configuration for handling large file uploads
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout

