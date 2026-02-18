# Vercel Deployment Guide

## 1. Push to GitHub
I have already pushed the latest code to your repository:
[https://github.com/Sanjey2005/placement-chronicles](https://github.com/Sanjey2005/placement-chronicles)

## 2. Import Project in Vercel
1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** > **Project**
3. Find `placement-chronicles` in the list and click **Import**

## 3. Configure Environment Variables
You typically need to copy these from your `.env.local` file.
Expand the **Environment Variables** section and add:

| Key | Value Description |
|-----|-------------------|
| `MONGODB_URI` | Your MongoDB connection string (ensure Network Access allows `0.0.0.0/0`) |
| `GROQ_API_KEY` | Key for AI moderation |
| `GEMINI_API_KEY` | Key for PDF parsing |
| `ADMIN_USERNAME` | Username for admin access |
| `ADMIN_PASSWORD` | Password for admin access |
| `UPSTASH_REDIS_REST_URL` | Redis URL for rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Redis Token for rate limiting |
| `NEXT_PUBLIC_BASE_URL` | *(Optional)* Set to your Vercel URL (e.g. `https://your-app.vercel.app`) after deployment |

> **Note:** The `auth-token` cookie logic works automatically without extra config.

## 4. Build Settings
The default settings usually work automatically:
- **Framework Preset**: Next.js
- **Root Directory**: `./`
- **Build Command**: `next build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

## 5. Deploy
Click **Deploy**. Vercel will build your project.
- If you see a warning about "middleware convention", you can ignore it (build usually succeeds).
- Once deployed, you will get a live URL.

## 6. Post-Deployment (Important)
If you use a custom domain or want to ensure 100% reliable logins:
1. Go to the project **Settings** > **Environment Variables**.
2. Add/Update `NEXT_PUBLIC_BASE_URL` to your production URL (e.g. `https://placement-chronicles-xyz.vercel.app`).
3. Redeploy (or wait for next push).

> **Why?** This ensures internal API calls use the correct absolute URL. The app tries to auto-detect `VERCEL_URL` but explicitly setting `NEXT_PUBLIC_BASE_URL` is safest.
