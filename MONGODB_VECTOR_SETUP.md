# MongoDB Atlas Vector Search Index Setup

## Quick Setup Guide

### Step 1: Access MongoDB Atlas Dashboard
1. Go to https://cloud.mongodb.com/
2. Log in to your account
3. Select your cluster

### Step 2: Navigate to Search Indexes
1. Click on your cluster name
2. Click on the "Search" tab (or "Atlas Search")
3. Click "Create Search Index"

### Step 3: Create Vector Search Index
1. Select "JSON Editor" (not Visual Editor)
2. Select your database: `placement-chronicles`
3. Select your collection: `experiences`
4. Paste the JSON configuration below
5. Click "Create Search Index"

### Step 4: JSON Configuration

Copy and paste this EXACT configuration:

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

### Step 5: Wait for Index Creation
- The index will take a few minutes to build
- Status will change from "Building" to "Active"
- Once active, your chat API will use it automatically

## Configuration Explained

| Field | Value | Purpose |
|-------|-------|---------|
| `name` | `vector_index` | Index identifier used in queries |
| `type` | `vectorSearch` | Enables vector similarity search |
| `path` | `embedding` | Field containing the vector embeddings |
| `numDimensions` | `768` | Google embedding-001 output size |
| `similarity` | `cosine` | Similarity metric (best for normalized vectors) |
| `filter.company` | - | Allows filtering results by company |
| `filter.role` | - | Allows filtering results by role |
| `filter.year` | - | Allows filtering results by year |
| `filter.tags` | - | Allows filtering results by tags |

## Verification

After creating the index, you can verify it's working:

1. **Check Index Status**: Should show "Active" in the Atlas dashboard
2. **Test the Chat API**: Send a query to `/api/chat`
3. **Check Logs**: Should NOT see "Atlas Vector Search not available" message

## Troubleshooting

### Issue: "Index creation failed"
- Ensure you selected the correct database and collection
- Verify the JSON is valid (no syntax errors)
- Check that you have permissions to create indexes

### Issue: "numDimensions mismatch"
- Must be 768 for Google's embedding-001 model
- If using a different model, adjust accordingly

### Issue: Index shows "Building" for too long
- Small collections: 1-2 minutes
- Large collections: Can take longer
- Refresh the page to check status

## Alternative: Using Local MongoDB

If you're using local MongoDB (not Atlas), the vector search will automatically fall back to manual cosine similarity calculation. This works but is slower for large datasets.

To use Atlas Vector Search, you MUST use MongoDB Atlas (cloud-hosted).

## Need Help?

- MongoDB Atlas Vector Search Docs: https://www.mongodb.com/docs/atlas/atlas-vector-search/
- Support: https://www.mongodb.com/support

---

**Note**: This configuration file is also saved as `mongodb-vector-index.json` in your project root for easy reference.
