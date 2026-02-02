# 🚀 Quick Start Guide - RAG Pipeline

## ⚡ Get Started in 5 Minutes

### Step 1: Install Dependencies ✅
Already done! Dependencies installed:
- `@upstash/ratelimit`
- `@upstash/redis`

### Step 2: Configure Environment Variables

Create/update your `.env.local` file:

```bash
# MongoDB (required)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/placement-chronicles

# Gemini AI (required)
GEMINI_API_KEY=your_gemini_api_key_here

# Scraper Service (required for auth)
SCRAPER_URL=http://localhost:3001

# Upstash Redis (optional - for rate limiting)
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token_here
```

### Step 3: Set Up MongoDB Atlas Vector Search

**Option A: Quick Setup (Recommended)**
1. Go to MongoDB Atlas → Your Cluster → Search Indexes
2. Click "Create Search Index" → JSON Editor
3. Copy-paste from `mongodb-vector-index.json`
4. Click "Create"

**Option B: Skip for Now**
- The system will work without it (slower performance)
- Uses fallback cosine similarity calculation

### Step 4: Run the Development Server

```bash
npm run dev
```

### Step 5: Test the Chat API

**Create a test experience:**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello! What can you tell me about interview experiences?"}'
```

**Expected Response:**
```json
{
  "success": true,
  "answer": "I can help you with interview experiences...",
  "sources": [],
  "context": false
}
```

---

## 🎯 Core Functionality

### 1. Create Experience with Embeddings

```typescript
import { createExperience } from '@/actions/experience';

await createExperience({
  studentId: 'STU001',
  company: 'Google',
  role: 'SDE',
  ctc: 45,
  rounds: [{
    roundNumber: 1,
    roundType: 'Technical',
    questions: ['Implement LRU Cache', 'Design Twitter']
  }],
  tags: ['DSA', 'System Design'],
  year: 2024
});
```

### 2. Query the Chat API

```typescript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'What questions are asked in Google interviews?'
  })
});

const data = await response.json();
console.log(data.answer); // AI-generated response
console.log(data.sources); // Source experiences used
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `lib/vector.ts` | Vector embeddings & similarity |
| `lib/redis.ts` | Rate limiting |
| `actions/experience.ts` | Create/manage experiences |
| `app/api/chat/route.ts` | RAG chat endpoint |
| `mongodb-vector-index.json` | Atlas vector search config |

---

## 🐛 Troubleshooting

### Chat returns empty sources
→ No experiences in database yet. Create some first!

### "Rate limit exceeded" error
→ Wait 1 minute or configure Redis properly

### "Failed to generate embedding"
→ Check `GEMINI_API_KEY` in `.env.local`

### Slow search performance
→ Create MongoDB Atlas Vector Search index

---

## 📚 Full Documentation

- **RAG_IMPLEMENTATION.md** - Complete implementation guide
- **MONGODB_VECTOR_SETUP.md** - Vector index setup
- **RAG_COMPLETE.md** - Implementation summary

---

## ✅ Checklist

- [x] Dependencies installed
- [ ] Environment variables configured
- [ ] MongoDB Atlas Vector Search index created (optional)
- [ ] Development server running
- [ ] Test experience created
- [ ] Chat API tested

---

**You're ready to go! 🎉**

Start by configuring your environment variables, then test the chat API.
