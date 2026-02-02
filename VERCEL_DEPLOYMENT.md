# Vercel Deployment Guide for Placement Chronicles

## ✅ Git Push Complete!

Your code has been successfully pushed to:
**https://github.com/Sanjey2005/placement-chronicles.git**

---

## 🚀 Vercel Deployment Steps

### 1. Import Project to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Select **"Import Git Repository"**
4. Choose your GitHub repository: `Sanjey2005/placement-chronicles`
5. Click **"Import"**

### 2. Configure Build Settings

Vercel should auto-detect Next.js. Verify these settings:

- **Framework Preset**: Next.js
- **Root Directory**: `./` (leave as default)
- **Build Command**: `next build`
- **Output Directory**: `.next` (auto-detected)
- **Install Command**: `npm install`

### 3. Environment Variables

⚠️ **CRITICAL**: Add these environment variables in Vercel:

```env
# MongoDB (Required)
MONGODB_URI=your_mongodb_atlas_connection_string

# Gemini AI (Required)
GEMINI_API_KEY=your_gemini_api_key

# Scraper Service (Required for login)
SCRAPER_URL=your_scraper_service_url

# Upstash Redis (Optional - for rate limiting)
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
```

**How to add in Vercel:**
1. In project settings, go to **"Environment Variables"**
2. Add each variable with its value
3. Select **"Production"**, **"Preview"**, and **"Development"** environments
4. Click **"Save"**

### 4. Deploy

Click **"Deploy"** and wait for the build to complete.

---

## ⚠️ Known Deployment Issues & Fixes

### Issue 1: PDF-Parse Build Error

**Problem**: `pdf-parse` is a CommonJS module that may cause build errors.

**Status**: ✅ Already fixed in `app/api/ingest/route.ts` using `require()`

**If you still see errors**, add to `next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse'],
  },
};

export default nextConfig;
```

### Issue 2: MongoDB Connection in Serverless

**Problem**: MongoDB connections in serverless functions.

**Status**: ✅ Already handled with connection pooling in `lib/db.ts`

**Ensure**: Your MongoDB Atlas allows connections from `0.0.0.0/0` (all IPs) or add Vercel's IP ranges.

### Issue 3: Scraper Service URL

**Problem**: Your scraper service needs to be accessible from Vercel.

**Options**:
1. **Deploy scraper to Vercel/Railway/Render** (recommended)
2. Use ngrok/tunneling (not for production)
3. Deploy to a cloud provider with public URL

### Issue 4: Three.js Bundle Size

**Problem**: Three.js is large and may cause warnings.

**Status**: ⚠️ May see warnings but won't break deployment

**Optional optimization** - Add to `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  webpack: (config) => {
    config.externals = [...(config.externals || []), { canvas: 'canvas' }];
    return config;
  },
};
```

---

## 🔍 Pre-Deployment Checklist

### Required Services

- [ ] **MongoDB Atlas** - Database is accessible
- [ ] **Gemini API Key** - Valid and has quota
- [ ] **Scraper Service** - Deployed and accessible via HTTPS
- [ ] **Upstash Redis** (Optional) - For rate limiting

### Code Checks

- [x] All dependencies installed
- [x] TypeScript errors fixed
- [x] Environment variables documented
- [x] Git repository pushed
- [x] `.env.local` in `.gitignore` (security)

### MongoDB Setup

- [ ] Vector Search index created (see `MONGODB_VECTOR_SETUP.md`)
- [ ] Database connection string uses `+srv` format
- [ ] Network access allows Vercel IPs

---

## 🎯 Deployment Strategy

### Option A: Full Deployment (Recommended)

Deploy everything to Vercel:
1. **Main App** (this repo)
2. **Scraper Service** (separate Vercel project)

### Option B: Hybrid Deployment

- **Frontend + API Routes**: Vercel
- **Scraper Service**: Railway/Render/Fly.io
- **MongoDB**: Atlas (cloud)

---

## 🐛 Troubleshooting Vercel Deployment

### Build Fails with "Module not found"

**Fix**: Ensure all imports use correct paths with `@/` alias

```bash
# Check tsconfig.json has:
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### "Cannot find module 'pdf-parse'"

**Fix**: Already handled with `require()`. If persists, add to `package.json`:

```json
{
  "browser": {
    "pdf-parse": false
  }
}
```

### MongoDB Connection Timeout

**Fix**: 
1. Check MongoDB Atlas network access
2. Verify connection string format
3. Ensure `retryWrites=true&w=majority` in connection string

### Scraper Service Unreachable

**Fix**:
1. Deploy scraper to a public URL
2. Update `SCRAPER_URL` environment variable
3. Ensure HTTPS (not HTTP)

### Rate Limiting Not Working

**Fix**: This is optional. If Upstash Redis env vars are missing, rate limiting is disabled (see `lib/redis.ts`)

---

## 📊 Post-Deployment Verification

After deployment, test these URLs:

1. **Homepage**: `https://your-app.vercel.app/`
   - Should show experience feed
   - StarField background visible

2. **Login**: `https://your-app.vercel.app/login`
   - Form should render
   - Try logging in

3. **Dashboard**: `https://your-app.vercel.app/dashboard`
   - Upload tab should work
   - Chat tab should respond

4. **API Health Check**: Test in browser console:
   ```javascript
   // Test chat API
   fetch('/api/chat', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ message: 'test' })
   }).then(r => r.json()).then(console.log)
   ```

---

## 🚨 Current Deployment Readiness

### ✅ Ready for Deployment

- Frontend code complete
- TypeScript errors fixed
- Git repository pushed
- Environment variables documented
- MongoDB integration ready
- API routes functional

### ⚠️ Requires Action

1. **Scraper Service**: Must be deployed separately and accessible
2. **Environment Variables**: Must be added in Vercel dashboard
3. **MongoDB Vector Index**: Must be created (see `MONGODB_VECTOR_SETUP.md`)

### 🔧 Optional Improvements

- Add authentication middleware for protected routes
- Implement error boundaries
- Add loading states for server components
- Set up monitoring (Vercel Analytics, Sentry)

---

## 📝 Deployment Commands (Alternative)

If you prefer Vercel CLI:

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

---

## 🎉 Expected Result

After successful deployment:

- **Homepage**: Beautiful dark theme with 3D stars
- **Login**: Glassmorphism login form
- **Dashboard**: Upload PDFs and chat with AI
- **Experience Feed**: Grid of placement experiences

---

## 📞 Support Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [MongoDB Atlas](https://www.mongodb.com/docs/atlas/)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

## 🔐 Security Notes

- ✅ `.env.local` is in `.gitignore`
- ✅ No secrets in code
- ⚠️ Ensure MongoDB network access is restricted
- ⚠️ Add CORS headers if needed for API routes
- ⚠️ Consider adding rate limiting to all API routes

---

**Your app is ready to deploy!** 🚀

Just add the environment variables in Vercel and click deploy!
