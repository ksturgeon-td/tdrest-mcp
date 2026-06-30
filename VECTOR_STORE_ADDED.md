# Vector Store API Integration

## What Was Added

The tdrest-mcp project now includes full support for the **Teradata Enterprise Vector Store** API alongside the existing Elastic Compute API.

### New Files

- **`specs/vector-store-api.json`** — Complete OpenAPI spec for the Data Insights Service (Vector Store)
  - 13 endpoints covering collections, permissions, search, and ingestion
  - Full security schema (Bearer token, Basic auth)

### Extended Syntax Help

Added 8 new endpoints to the `SyntaxHelpRegistry`:

#### Collection Management
- **GET /data-insights/api/v2/collections** — List all vector collections
  - Filter by authorization level
  - Pagination support
  - Returns: collection names, status, types, permissions

- **POST /data-insights/api/v2/collections/{collection_name}** — Create a new collection
  - Support for CONTENT-BASED, EMBEDDING-BASED, and FILE variants
  - Custom target database specification
  - Collection type determines how data is indexed

- **PUT /data-insights/api/v2/collections/{collection_name}/ingest** — Upload documents
  - Multipart file upload (CSV, JSON, PDF, etc.)
  - Asynchronous processing (202 Accepted)
  - Custom extraction schema support
  - Chunk size and overlap configuration

#### Search & Retrieval
- **POST /data-insights/api/v2/collections/{collection_name}/similarity-search** — Semantic search
  - Text-based query with automatic embedding
  - Vector-based query support (pre-computed embeddings)
  - Configurable top-k results
  - Metadata filtering
  - Score-based relevance (0-1 scale)

- **POST /data-insights/api/v2/collections/{collection_name}/prepare-response** — Generate responses
  - Takes similarity search results
  - LLM-generated natural language answers
  - Custom guardrails and safety settings

- **POST /data-insights/api/v2/collections/{collection_name}/ask** — End-to-end Q&A
  - Combined search + response generation in one call
  - Semantic understanding of questions
  - Supports custom models (embedding, ranking, chat)
  - Configurable search strategy (semantic, hybrid, relevance-based)

#### Permissions
- **GET /data-insights/api/v2/permissions/{collection_name}** — List user permissions
  - Shows USER, ADMIN, and NO_ACCESS assignments
  - Paginated results

- **PUT /data-insights/api/v2/permissions/{collection_name}** — Modify permissions
  - GRANT or REVOKE actions
  - USER (read) and ADMIN (read/write) levels
  - Bulk user updates

### Key Features

✅ **Semantic Search** — Find similar documents without keyword matching
✅ **RAG Pattern** — Retrieve documents + generate responses with LLM
✅ **Multipart Uploads** — Upload CSV, JSON, PDF, and other formats
✅ **Access Control** — Fine-grained user permissions (ADMIN/USER)
✅ **Asynchronous Operations** — Ingestion and collection creation return 202 Accepted
✅ **Customizable Models** — Override embedding, chat, and ranking models per query
✅ **Safety Guardrails** — Content safety, topic control, jailbreak detection
✅ **Hybrid Search** — Combine semantic + keyword search strategies

### Authentication

All Vector Store endpoints support:
- **Bearer Token** (JWT) — Recommended for service accounts
- **Basic Auth** — Username/password (use with caution in production)

Set auth once with `set_auth` tool, and all subsequent Vector Store calls inherit it:

```
User: "Use Bearer token for Vector Store"
Claude: execute set_auth { type: "bearer", token: "eyJ..." }
```

### Common Usage Patterns

#### 1. Create a collection and upload documents

```
# Create collection
POST /data-insights/api/v2/collections/research_papers
{
  "collection_type": "FILE-CONTENT-BASED",
  "collection_description": "PDF documents for semantic search",
  "target_database": "vector_db"
}

# Upload files (multipart)
PUT /data-insights/api/v2/collections/research_papers/ingest
files: paper1.pdf, paper2.pdf
```

#### 2. Search and get AI-generated response

```
# One-shot ask
POST /data-insights/api/v2/collections/research_papers/ask
{
  "question": "What are the key findings on climate change?",
  "chat_model": {
    "model_id": "claude-3-haiku",
    "model_provider": "aws"
  }
}
```

#### 3. Grant collection access to team members

```
PUT /data-insights/api/v2/permissions/research_papers
{
  "user_names": ["alice@company.com", "bob@company.com"],
  "action": "GRANT",
  "permission": "USER"
}
```

### Configuration

Update `.env` to point to your Vector Store:

```bash
VECTOR_STORE_BASE_URL=https://your-vector-store.qateradatacloud.com
```

Then use in calls:

```
POST https://your-vector-store.qateradatacloud.com/data-insights/api/v2/collections/my_collection/ask
```

### Status Checking

Long-running operations (create, ingest, update) return 202 Accepted. Check status with:

```
GET /data-insights/api/v2/collections/{collection_name}/status
```

Response example:
```json
{
  "collection_name": "documents",
  "collection_status": "CREATING (GENERATING EMBEDDINGS)",
  "retry_after": 60
}
```

### Multipart File Upload Example

```typescript
// Using the execute_rest_call tool
execute_rest_call({
  url: "https://.../collections/docs/ingest",
  method: "PUT",
  files: {
    "file1": { path: "/tmp/document1.pdf" },
    "file2": { path: "/tmp/document2.csv" }
  },
  formData: {
    "extraction_schema": JSON.stringify({
      "table_name": "ingested_docs",
      "key_columns": [{ "name": "id", "datatype": "INTEGER" }],
      "data_columns": [{ "name": "content", "datatype": "VARCHAR(10000)" }]
    })
  }
})
```

### Next Steps

1. **Test the API** with real Vector Store credentials
2. **Add guardrails configuration** to your safety-critical collections
3. **Implement custom ranking models** for specialized search domains
4. **Set up permissions** for your team to access shared collections
5. **Monitor ingestion status** for large document uploads

### Limitations & Notes

- Vector Store operations are **asynchronous** (202 Accepted) — check status regularly
- **Large file uploads** may take time — consider chunking for files >100MB
- **Embedding generation** time depends on document size and model complexity
- **Search scores** are normalized 0-1 — threshold varies by use case
- **Rate limits** may apply — see Vector Store documentation for details

### Related Endpoints

The project also supports **Elastic Compute** endpoints for managing the compute infrastructure that powers Vector Store operations:

- `GET /clusters` — List compute clusters
- `POST /clusters` — Create a new cluster
- `DELETE /clusters/{id}` — Terminate a cluster
- `GET /configs` — List cluster configurations
- `POST /configs` — Create a cluster configuration

Use `get_syntax_help("vector")` or `get_syntax_help("compute")` to see all available operations.

---

**Happy embedding!** 🔍✨
