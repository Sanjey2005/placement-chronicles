# PDF Upload Debugging Guide

## Changes Made to Fix PDF Upload

### 1. Fixed Route Configuration
**File**: `app/api/ingest/route.ts`

**Problem**: Old Pages Router `export const config` syntax doesn't work in App Router

**Fix**: Replaced with proper App Router configuration:
```typescript
// Old (doesn't work in App Router)
export const config = {
    api: {
        bodyParser: false,
    },
};

// New (App Router)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout
```

### 2. Added Detailed Logging
Added console logs at each step to track where the upload fails:

```typescript
console.log('📤 PDF Upload started');
console.log('📄 File received:', file?.name, file?.type, file?.size);
console.log('✅ File validation passed');
console.log('📦 Buffer created, size:', buffer.length);
console.log('🔍 Starting PDF text extraction...');
console.log('📝 Text extracted, length:', extractedText?.length);
console.log('🤖 Starting Gemini extraction...');
console.log('✅ Gemini extraction complete:', extractedData);
```

### 3. Enhanced Error Reporting
Added detailed error information:
```typescript
{
    error: 'Failed to process PDF',
    details: error.message,
    type: error.name  // NEW: Shows error type
}
```

---

## How to Debug PDF Upload Issues

### Step 1: Check Server Console
When you upload a PDF, watch the terminal where `npm run dev` is running.

You should see logs like:
```
📤 PDF Upload started
📄 File received: interview.pdf application/pdf 245678
✅ File validation passed
📦 Buffer created, size: 245678
🔍 Starting PDF text extraction...
📝 Text extracted, length: 1234
🤖 Starting Gemini extraction...
✅ Gemini extraction complete: { company: "Google", ... }
```

### Step 2: Identify Where It Fails
If the upload fails, check which emoji appears last:

- **📤** - Request not reaching server
- **📄** - File not being sent properly
- **✅** - File validation failed (wrong type)
- **📦** - Buffer creation failed
- **🔍** - PDF parsing failed
- **📝** - No text extracted from PDF
- **🤖** - Gemini API call failed
- **✅** (last) - Success!

### Step 3: Common Issues & Solutions

#### Issue: "No file uploaded"
**Symptom**: Only see 📤, then error
**Cause**: File not being sent in FormData
**Fix**: Check UploadTab.tsx - ensure file is appended to FormData

#### Issue: "Only PDF files are supported"
**Symptom**: See 📄 but not ✅
**Cause**: File type is not application/pdf
**Fix**: Ensure you're uploading a .pdf file

#### Issue: "No text could be extracted"
**Symptom**: See 🔍 and 📝 but text length is 0
**Cause**: PDF is image-based or encrypted
**Fix**: Use a text-based PDF or OCR the images first

#### Issue: Gemini extraction fails
**Symptom**: See 🤖 but then error
**Possible Causes**:
1. Invalid GEMINI_API_KEY
2. API quota exceeded
3. Network issue
4. Malformed prompt

**Fix**:
1. Check `.env.local` has valid `GEMINI_API_KEY`
2. Check Gemini API console for quota
3. Check internet connection
4. Review extraction prompt

---

## Testing the Fix

### Test 1: Upload a Simple PDF
1. Create a simple text PDF with interview experience
2. Upload via dashboard
3. Watch console for logs
4. Should see all emojis through to ✅

### Test 2: Check Error Response
1. Upload a non-PDF file
2. Should see error: "Only PDF files are supported"

### Test 3: Check Gemini Integration
1. Upload a valid PDF
2. Watch for "🤖 Starting Gemini extraction..."
3. Should see extracted JSON data in console

---

## Environment Variables Required

Ensure `.env.local` has:
```env
GEMINI_API_KEY=your_gemini_api_key_here
MONGODB_URI=your_mongodb_connection_string
```

---

## API Route Configuration

The route now has proper App Router config:

```typescript
export const runtime = 'nodejs';        // Use Node.js runtime (not Edge)
export const dynamic = 'force-dynamic';  // Don't cache responses
export const maxDuration = 60;          // 60 second timeout
```

This allows:
- Large file uploads
- Long-running Gemini API calls
- Proper error handling

---

## Next Steps

1. **Restart dev server** if it's still running
2. **Try uploading a PDF** and watch the console
3. **Share the console output** if it still fails
4. **Check the error type** in the response

---

## Quick Test Command

To test the API directly:
```bash
curl -X POST http://localhost:3000/api/ingest \
  -F "file=@path/to/your/interview.pdf"
```

Should return:
```json
{
  "success": true,
  "data": {
    "company": "...",
    "role": "...",
    ...
  }
}
```

---

**The PDF upload should now work! Check the console logs to see exactly where it's processing.** 📊
