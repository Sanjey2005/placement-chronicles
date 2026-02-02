# Placement Chronicles - Backend Data Layer

This is the backend data layer for the Placement Chronicles application, built with Next.js 15 App Router.

## 🚀 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: MongoDB (with Mongoose ODM)
- **AI**: Google Gemini 1.5 Flash
- **PDF Processing**: pdf-parse
- **HTTP Client**: Axios

## 📁 Project Structure

```
placement-chronicles/
├── actions/
│   ├── auth.ts                 # Server actions for authentication
│   └── experience.ts           # Server actions for experiences (with embeddings)
├── app/
│   └── api/
│       ├── ingest/
│       │   └── route.ts        # PDF ingestion endpoint
│       └── chat/
│           └── route.ts        # RAG-powered chat API
├── lib/
│   ├── db.ts                   # MongoDB connection utility
│   ├── gemini.ts               # Gemini AI client
│   ├── redis.ts                # Upstash Redis & rate limiting
│   └── vector.ts               # Vector embeddings & similarity
├── models/
│   └── Experience.ts           # Experience schema with vector embeddings
├── .env.local.example          # Environment variables template
├── mongodb-vector-index.json   # MongoDB Atlas Vector Search config
├── RAG_IMPLEMENTATION.md       # RAG pipeline documentation
└── MONGODB_VECTOR_SETUP.md     # Vector index setup guide
```

## 🛠️ Setup Instructions

### 1. Install Dependencies

Dependencies are already installed. If you need to reinstall:

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.local.example .env.local
```

Then update the following variables:

- `MONGODB_URI`: Your MongoDB connection string
- `GEMINI_API_KEY`: Your Google Gemini API key ([Get it here](https://makersuite.google.com/app/apikey))
- `SCRAPER_URL`: URL of your scraper microservice

### 3. Run the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## 📚 API Documentation

### PDF Ingestion Endpoint

**Endpoint**: `POST /api/ingest`

**Description**: Accepts a PDF file, extracts text, and uses Gemini AI to extract structured interview experience data.

**Request**:
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: Form data with `file` field containing the PDF

**Response**:
```json
{
  "success": true,
  "data": {
    "studentId": "string",
    "company": "string",
    "role": "string",
    "ctc": number,
    "year": number,
    "rounds": [
      {
        "roundNumber": number,
        "roundType": "string",
        "questions": ["string"],
        "description": "string",
        "duration": "string"
      }
    ],
    "tags": ["string"]
  },
  "rawText": "string"
}
```

## 🔐 Authentication

### Login Server Action

**Function**: `login(formData: FormData)`

**Description**: Authenticates users via the scraper microservice.

**Usage**:
```typescript
import { login } from '@/actions/auth';

const formData = new FormData();
formData.append('username', 'user@example.com');
formData.append('password', 'password123');

const result = await login(formData);
```

**Alternative**:
```typescript
import { loginWithCredentials } from '@/actions/auth';

const result = await loginWithCredentials('user@example.com', 'password123');
```

## 🗄️ Database Schema

### Experience Model

```typescript
{
  studentId: string;          // Student identifier
  company: string;            // Company name
  role: string;               // Job role/position
  ctc: number;                // Compensation in lakhs
  rounds: [                   // Interview rounds
    {
      roundNumber: number;
      roundType: string;      // e.g., "Technical", "HR", "Coding"
      questions: string[];
      description?: string;
      duration?: string;
    }
  ];
  embedding?: number[];       // Vector embedding for semantic search
  tags?: string[];            // Categorization tags
  year?: number;              // Year of placement
  createdAt: Date;            // Auto-generated
  updatedAt: Date;            // Auto-generated
}
```

## 🧠 Data Layer Components

### MongoDB Connection (`lib/db.ts`)

Implements a singleton pattern to prevent connection pooling issues in Next.js development:

```typescript
import dbConnect from '@/lib/db';

// Use in API routes or server components
await dbConnect();
```

### Gemini AI Client (`lib/gemini.ts`)

Provides utilities for AI-powered data extraction:

```typescript
import { extractWithGemini } from '@/lib/gemini';

const data = await extractWithGemini(text, prompt);
```

## 📝 Notes

- This is the **backend data layer only**. UI components are handled separately.
- Vector embeddings are prepared for future semantic search implementation.
- All database operations use Mongoose for type safety and validation.
- Error handling is implemented throughout the API routes and server actions.

## 🔗 Related Services

- **Scraper Microservice**: Handles PSG Tech Student Zone authentication
- **Frontend**: Next.js UI components (handled by Agent 3)

## 📄 License

This project is part of the Placement Chronicles application.
