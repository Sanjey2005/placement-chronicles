# Privacy Policy – Placement Chronicles

**Last Updated:** February 2026

## Data We Collect

When you use Placement Chronicles, we collect the following types of information:

| Category | Examples | Purpose |
|----------|----------|---------|
| **Academic Info** | Student name, batch year, course/branch | Identify the experience author |
| **Interview Data** | Company name, role, CTC, interview rounds, questions | Power the experience feed and search |
| **Uploaded PDFs** | Interview experience documents | Auto-extract structured data via AI |

## What We Do NOT Collect

- Email addresses or phone numbers (login is via institutional roll number only)
- Passwords (institutional credentials are verified against PSG eCampus servers and never stored)
- Biometric or location data

### Visit statistics

When you're signed in, the site records which page you opened, roughly how long you stayed, the kind of device and browser you used, an approximate location (from your internet connection), and the site that sent you, if any. This powers an admin-only page that shows how many students use the site.

- Your roll number and IP address are **not stored** with these records.
- Each record carries a code that is derived one-way from your roll number and changes every day. It lets us count each student once per day without keeping a list of who visited, and visits can't be linked from one day to the next.
- Records are deleted automatically after 13 months.

### Helpful votes

When you mark an experience as helpful, we store a one-way code instead of your roll number, so each student counts once and can take the vote back. Only the total is shown to anyone.

## How We Process Your Data with AI

### PDF Extraction
When you upload a PDF, the document text is:
1. Extracted server-side using `pdf-parse`
2. Sent to **Groq (GPT-OSS)** for structured data extraction
3. **Immediately discarded from server memory** after processing — we do not store the raw PDF

### Chat / RAG
When you ask a question in the chatbot:
1. Your message is converted to a vector embedding via **Hugging Face** (sentence-transformers)
2. Relevant interview experiences are retrieved from our database
3. Your question and the retrieved context are sent to **Groq (GPT-OSS)** for answer generation
4. **We do not store chat messages** — they exist only for the duration of your session

### Third-Party AI Providers
We use the following external AI services to process data:
- **Groq** (groq.com) — LLM inference for data extraction and chat
- **Hugging Face** (huggingface.co) — Vector embeddings for semantic search

Data sent to these providers is governed by their respective privacy policies. We send only the minimum data necessary (interview text excerpts, not personal identifiers) and do not opt into any training programs.

## Data Storage

- Interview experiences are stored in **MongoDB Atlas** (cloud-hosted, encrypted at rest)
- Vector embeddings (384-dimension numeric arrays) are stored alongside experiences for search
- No raw PDF files are retained

## Data Retention & Deletion

- Experiences remain in the database indefinitely unless deleted by an administrator
- To request deletion of your data, contact the platform administrator

## Security Measures

- All API endpoints that handle user data require authentication
- User inputs are sanitized to prevent XSS and injection attacks
- AI prompts include anti-injection defenses
- PDF buffers are zeroed from memory immediately after processing
- Rate limiting is applied to prevent abuse

## Changes to This Policy

We may update this policy from time to time. Material changes will be communicated via the platform.

---

*For questions about this policy, contact the Placement Chronicles development team.*
