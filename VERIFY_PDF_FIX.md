# 🚨 PDF Upload Fix - Verification Guide

## What I Fixed
1. **Server Configuration**: added `pdf-parse` to `serverComponentsExternalPackages` in `next.config.ts`. This prevents bundling issues.
2. **Client Logging**: Enhanced `UploadTab.tsx` to log the exact error from the server to the **Browser Console**.
3. **Server Logging**: Added detailed logs in `api/ingest/route.ts` to show exactly where processing fails.

## 🛠️ How to Debug Now

### 1. Restart your Server (Important!)
Since we changed `next.config.ts`, you **MUST** restart the server.

```bash
# In your terminal
Ctrl+C (to stop)
npm run dev
```

### 2. Inspect the Browser Console
If the upload fails again:
1. Right-click the page -> **Inspect**
2. Go to **Console** tab
3. Upload the PDF
4. Look for red error messages. You might see:
   - `Upload failed with status: 413` (File too large)
   - `Upload failed with status: 500` (Server error - check terminal)
   - `Error response body: ...` (Detailed error message)

### 3. Check the Terminal
Look at your VS Code terminal where `npm run dev` is running.
You should see:
```
📤 PDF Upload started
📄 File received: yourfile.pdf
...
```
If you see logs stopping at a specific point (e.g. before "🤖 Starting Gemini extraction"), that identifies the issue!

## Common Error Codes

- **413 Payload Too Large**: The PDF is larger than 4MB (Next.js default).
  *Fix*: We can increase body size limit if needed.
- **500 Internal Server Error**: Check terminal logs.
  *Fix*: Likely Gemini API key or `pdf-parse` issue (should be fixed now).
- **404 Not Found**: API route path is wrong.
  *Fix*: Use `/api/ingest`.

## If Fallback Works
If Gemini fails, you should now see a form with empty fields instead of a generic error. This means the **fallback system is working**!
