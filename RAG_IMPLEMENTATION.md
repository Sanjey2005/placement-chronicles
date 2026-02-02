# RAG Pipeline & Chatbot Implementation Guide

## 🎯 Overview

This document explains the complete RAG (Retrieval Augmented Generation) pipeline implementation for the Placement Chronicles chatbot.

## 📦 Components Created

### 1. **lib/redis.ts** - Rate Limiting
- Upstash Redis client initialization
- Rate limiter: 5 requests per minute per user
- Graceful fallback if Redis is not configured

### 2. **lib/vector.ts** - Vector Embeddings
- `getEmbedding(text)`: Generates 768-dimensional embeddings using Google's embedding-001 model
- `cosineSimilarity(vecA, vecB)`: Calculates similarity between vectors
- `generateExperienceSummary(data)`: Converts experience data to text for embedding

### 3. **actions/experience.ts** - Server Actions
- `createExperience(data)`: Creates experience with automatic embedding generation
- `getAllExperiences()`: Retrieves all experiences
- `getExperiencesByCompany(company)`: Filters by company
- `deleteExperience(id)`: Deletes an experience

### 4. **app/api/chat/route.ts** - RAG Chat API
- Accepts user messages
- Generates query embedding
- Performs vector similarity search
- Retrieves top 3 relevant experiences
- Generates contextual response using Gemini Pro

## 🔧 Setup Instructions

### Step 1: Install Dependencies

Already completed:
```bash
npm install @upstash/ratelimit @upstash/redis
```

### Step 2: Configure Environment Variables

Add to your `.env.local`:

```bash
# Upstash Redis (for rate limiting)
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token_here
```

Get these from: https://console.upstash.com/

### Step 3: MongoDB Atlas Vector Search Index

**IMPORTANT**: For optimal performance, create a vector search index in MongoDB Atlas.

#### How to Create the Index:

1. Go to your MongoDB Atlas Dashboard
2. Navigate to your cluster → Browse Collections
3. Select the `placement-chronicles` database
4. Click on "Search Indexes" tab
5. Click "Create Search Index"
6. Choose "JSON Editor"
7. Paste the following configuration:

```json
{
  "name": "vector_index",
  "type": "vectorSearch",
  "definition": {
    "fields": [
      {
        "type": "vector",
        "path": "embedding",
        "numDimensions": 768,
        "similarity": "cosine"
      },
      {
        "type": "filter",
        "path": "company"
      },
      {
        "type": "filter",
        "path": "role"
      },
      {
        "type": "filter",
        "path": "year"
      },
      {
        "type": "filter",
        "path": "tags"
      }
    ]
  }
}
```

8. Click "Create Search Index"

**Note**: The configuration is also saved in `mongodb-vector-index.json` for reference.

#### Index Configuration Explained:

- **name**: `vector_index` - The index name used in queries
- **type**: `vectorSearch` - Enables vector similarity search
- **embedding field**: 768 dimensions (Google embedding-001 model output)
- **similarity**: Cosine similarity (best for normalized embeddings)
- **filter fields**: Allow filtering by company, role, year, and tags

### Step 4: Fallback Behavior

If you don't create the Atlas Vector Search index, the chat API will automatically fall back to manual cosine similarity calculation. This works but is slower for large datasets.

## 🚀 How It Works

### Creating an Experience with Embeddings

```typescript
import { createExperience } from '@/actions/experience';

const result = await createExperience({
  studentId: 'STU123',
  company: 'Google',
  role: 'Software Engineer',
  ctc: 45,
  rounds: [
    {
      roundNumber: 1,
      roundType: 'Technical',
      questions: [
        'Implement a binary search tree',
        'Design a URL shortener'
      ],
      description: 'DSA and system design round',
      duration: '60 minutes'
    }
  ],
  tags: ['DSA', 'System Design', 'Python'],
  year: 2024
});
```

**What happens internally:**
1. Experience data is converted to a text summary
2. Summary is sent to Google's embedding-001 model
3. 768-dimensional vector is generated
4. Experience is saved to MongoDB with the embedding
5. Cache is revalidated

### Using the Chat API

**Request:**
```bash
POST /api/chat
Content-Type: application/json

{
  "message": "What questions were asked in Google interviews?"
}
```

**Response:**
```json
{
  "success": true,
  "answer": "Based on the interview experiences in our database, here are the questions asked in Google interviews:\n\n1. For Software Engineer role:\n   - Implement a binary search tree\n   - Design a URL shortener\n   ...",
  "sources": [
    {
      "company": "Google",
      "role": "Software Engineer",
      "similarity": 0.87
    }
  ],
  "context": true
}
```

**What happens internally:**
1. Rate limit check (5 requests/minute)
2. User message → embedding generation
3. Vector search finds top 3 similar experiences
4. Context is built from retrieved experiences
5. Gemini Pro generates answer based on context
6. Response returned with sources

## 📊 RAG Pipeline Flow

```
User Query
    ↓
[Rate Limiting]
    ↓
[Generate Query Embedding]
    ↓
[Vector Similarity Search]
    ↓
[Retrieve Top 3 Experiences]
    ↓
[Build Context]
    ↓
[Gemini Pro Generation]
    ↓
Response with Sources
```

## 🔍 Vector Search Methods

### Method 1: MongoDB Atlas Vector Search (Recommended)

```typescript
const results = await Experience.aggregate([
  {
    $vectorSearch: {
      index: 'vector_index',
      path: 'embedding',
      queryVector: queryEmbedding,
      numCandidates: 100,
      limit: 3,
    },
  },
  {
    $project: {
      company: 1,
      role: 1,
      similarity: { $meta: 'vectorSearchScore' },
    },
  },
]);
```

**Pros:**
- Very fast (optimized by MongoDB)
- Scales to millions of documents
- Built-in scoring

**Cons:**
- Requires MongoDB Atlas (not local MongoDB)
- Requires index creation

### Method 2: Manual Cosine Similarity (Fallback)

```typescript
const allExperiences = await Experience.find({
  embedding: { $exists: true }
}).lean();

const scored = allExperiences
  .map(exp => ({
    ...exp,
    similarity: cosineSimilarity(queryEmbedding, exp.embedding)
  }))
  .sort((a, b) => b.similarity - a.similarity)
  .slice(0, 3);
```

**Pros:**
- Works with any MongoDB instance
- No index required

**Cons:**
- Slower for large datasets
- Loads all documents into memory

## 🧪 Testing the Implementation

### Test 1: Create an Experience

```typescript
import { createExperience } from '@/actions/experience';

const result = await createExperience({
  studentId: 'TEST001',
  company: 'Microsoft',
  role: 'SDE Intern',
  ctc: 12,
  rounds: [
    {
      roundNumber: 1,
      roundType: 'Coding',
      questions: ['Two sum problem', 'Reverse a linked list'],
    }
  ],
  tags: ['DSA', 'C++'],
  year: 2024
});

console.log(result);
// Should show: { success: true, data: {...} }
```

### Test 2: Chat Query

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What coding questions are commonly asked?"}'
```

### Test 3: Rate Limiting

Make 6 requests within a minute - the 6th should return a 429 error.

## 📈 Performance Optimization

### Current Implementation:
- ✅ Vector embeddings for semantic search
- ✅ Rate limiting to prevent abuse
- ✅ Top-3 retrieval for relevant context
- ✅ Automatic fallback for compatibility

### Future Enhancements:
- Add caching for frequently asked questions
- Implement hybrid search (keyword + vector)
- Add re-ranking for better results
- Store embeddings in a dedicated vector database (Pinecone, Weaviate)

## 🔐 Security Considerations

1. **Rate Limiting**: 5 requests/minute prevents abuse
2. **Input Validation**: Message must be a non-empty string
3. **Error Handling**: Graceful fallbacks for all operations
4. **No PII in Logs**: Sensitive data is not logged

## 🐛 Troubleshooting

### Issue: "Failed to generate embedding"
**Solution**: Check that `GEMINI_API_KEY` is set correctly

### Issue: "Rate limit exceeded"
**Solution**: Wait 1 minute or configure Redis properly

### Issue: Vector search returns no results
**Solution**: 
1. Ensure experiences have embeddings
2. Check that MongoDB Atlas index is created
3. Verify embedding dimensions match (768)

### Issue: Slow search performance
**Solution**: Create the MongoDB Atlas Vector Search index

## 📝 API Reference

### POST /api/chat

**Request:**
```typescript
{
  message: string; // User's question
}
```

**Response:**
```typescript
{
  success: boolean;
  answer: string; // AI-generated response
  sources: Array<{
    company: string;
    role: string;
    similarity: number;
  }>;
  context: boolean; // Whether relevant context was found
}
```

**Error Responses:**
- `400`: Invalid message
- `429`: Rate limit exceeded
- `500`: Server error

## 🎓 Key Concepts

### What is RAG?
Retrieval Augmented Generation combines:
1. **Retrieval**: Finding relevant documents using vector search
2. **Augmentation**: Adding retrieved context to the prompt
3. **Generation**: Using an LLM to generate a contextual response

### Why Vector Embeddings?
- Convert text to numerical vectors
- Similar meanings = similar vectors
- Enables semantic search (not just keyword matching)
- Example: "coding interview" and "programming test" are semantically similar

### Why Cosine Similarity?
- Measures angle between vectors
- Range: -1 (opposite) to 1 (identical)
- Works well with normalized embeddings
- Efficient to compute

## ✅ Checklist

- [x] Install dependencies
- [x] Create Redis client
- [x] Implement vector embedding generation
- [x] Create experience server action
- [x] Build chat API with RAG
- [x] Add rate limiting
- [x] Create MongoDB index configuration
- [ ] Set up Upstash Redis account
- [ ] Create MongoDB Atlas Vector Search index
- [ ] Test the chat API
- [ ] Add some sample experiences

## 🔗 Resources

- [Google Generative AI Embeddings](https://ai.google.dev/tutorials/embeddings_quickstart)
- [MongoDB Atlas Vector Search](https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-overview/)
- [Upstash Redis](https://upstash.com/)
- [RAG Explained](https://www.pinecone.io/learn/retrieval-augmented-generation/)

---

**Implementation Complete!** 🎉

The RAG pipeline is ready to use. Just configure your environment variables and create the MongoDB Atlas index for optimal performance.
