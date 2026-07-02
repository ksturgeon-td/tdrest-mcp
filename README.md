# tdrest-mcp

A lightweight MCP (Model Context Protocol) server for making REST API calls to **Teradata cloud services** including:
- **Elastic Compute** — Manage compute engine clusters and configurations
- **Enterprise Vector Store** — Semantic search, RAG, and document ingestion
- **OMS** — Database management and object operations
- **QueryGrid** — Multi-system fabric connectivity

Supports custom authentication (Bearer JWT, Basic), Socks5 proxy routing, multipart file uploads, and progressive endpoint documentation.

## Features

- **Universal REST Client** — Execute any HTTP method with custom headers, auth, and request bodies
- **Bearer & Basic Auth** — JWT tokens, username/password, custom headers with session persistence
- **Socks5 Proxy** — Route through corporate proxies with optional auth
- **Multipart Uploads** — Upload files combined with form fields (CSV, JSON, PDF, etc.)
- **Semantic Search** — Search Vector Store collections with natural language queries
- **RAG Pattern** — Retrieve documents + generate AI responses in one call
- **Progressive Help** — Searchable endpoint documentation with examples and parameters
- **50+ Endpoints** — Auto-generated from Swagger specs (Elastic Compute, Vector Store, OMS, QueryGrid, etc.)
- **Swagger Auto-Parser** — Endpoints loaded at startup; no hand-curation needed
- **Usage Guides** — Best practices, workflows, and examples via searchable markdown guides
- **Hot-loadable APIs** — Drop a Swagger spec in `specs/` → restart → instant access
- **Dynamic Service URLs** — Define any service via `*_BASE_URL` environment variables
- **Stateless Design** — All compute logic lives in the cloud APIs; MCP just brokers requests

## Quick Start

### Prerequisites

- Node.js 18+ with npm

### Installation

```bash
git clone <repo-url>
cd tdrest-mcp
npm install
npm run build
```

### Configuration

Copy `.env.example` to `.env` and set your API base URLs:

```bash
cp .env.example .env
# Edit .env with your values
```

### Run the MCP Server

```bash
npm start
```

The server listens on stdin/stdout and is ready to accept tool calls from Claude.

### Connect to Claude Desktop

Edit `~/.claude/config.json` (or equivalent) to include:

```json
{
  "mcp-servers": {
    "tdrest": {
      "command": "node",
      "args": ["/path/to/tdrest-mcp/dist/index.js"],
      "env": {
        "ELASTIC_COMPUTE_BASE_URL": "https://preprod.globalcompute.qateradatacloud.com"
      }
    }
  }
}
```

Restart Claude Desktop, and the tools will appear in the tool menu.

## Usage

### Authentication

**Option 1: Environment Variable (Recommended for long-lived tokens)**

Set auth once in `.env` — no context overhead for subsequent calls:

```bash
DEFAULT_AUTH_TYPE=bearer
DEFAULT_AUTH_TOKEN=eyJhbGc...
```

All requests automatically use it. Agent calls can still override per-request.

**Option 2: Session Auth (for interactive use)**

```
User: "Authenticate with my Teradata JWT token"
Claude executes: set_auth {
  type: "bearer",
  token: "eyJhbGc..."
}
```

Auth is stored for the session and applied to all subsequent requests.

### Make a REST Call

```
User: "List all clusters"
Claude executes: execute_rest_call {
  url: "https://preprod.globalcompute.qateradatacloud.com/clusters",
  method: "GET",
  // auth is applied automatically from session
}
```

### Get Help on Endpoints

```
User: "What endpoints are available for clusters?"
Claude executes: get_syntax_help {
  query: "clusters"
}
Response:
  Found 2 endpoints matching "clusters":
  - GET /clusters — List all compute engine clusters for a site
  - POST /clusters — Create a new compute engine cluster
  ...
```

### Get Usage Guides

```
User: "How do I set up a cluster?"
Claude executes: get_usage_guide {
  query: "cluster"
}
Response:
  Creating and Managing Clusters guide showing:
  - Step-by-step workflow
  - Config vs cluster distinction
  - Lifecycle management
  - Common errors and fixes
```

### Upload a File

```
User: "Upload a document to the vector store"
Claude executes: execute_rest_call {
  url: "https://api.vectorstore.qateradatacloud.com/documents",
  method: "POST",
  files: {
    "document": { path: "/tmp/document.pdf" }
  },
  formData: {
    "collection_id": "my-collection"
  }
}
```

## Project Structure

```
src/
├── index.ts              # MCP server + tool handlers
├── rest-client.ts        # HTTP client (axios + auth + proxy)
├── syntax-help.ts        # Endpoint registry and search
├── usage-guide.ts        # Usage guide registry
├── guide-loader.ts       # Auto-load guides from guides/ directory
├── swagger-parser.ts     # Swagger spec parser (auto-generates endpoints)
├── file-utils.ts         # File discovery and glob expansion
├── types.ts              # TypeScript interfaces
└── config.ts             # Environment config

specs/
├── global-compute-api.json        # Global Compute API (37 endpoints)
├── global-consumption-api.json    # Global Consumption API (3 endpoints)
└── vector-store-api.json          # Vector Store API (13 endpoints)

guides/
├── getting-started.md       # Quick introduction and basic workflows
├── clusters-setup.md        # Step-by-step cluster provisioning
└── error-handling.md        # Error codes and troubleshooting

tests/
└── ...                  # Unit tests

CLAUDE.md              # Detailed developer guide
```

## Development

```bash
# Watch for TypeScript changes
npm run dev

# Run tests
npm test

# Run a single test
npm test -- src/path/to/test.spec.ts

# Lint
npm run lint
npm run lint:fix
```

## Authentication & Security

- **Bearer Tokens**: Tokens are stored in memory for the session and not persisted to disk.
- **Basic Auth**: Username/password stored in memory; not logged.
- **Custom Headers**: Any header can be set per-request or per-session.
- **HTTPS Only**: All connections are HTTPS by default; HTTP is not enforced but discouraged.

**Important**: Do not commit credentials to the repository. Use environment variables or `.env` files (which are in `.gitignore`).

## Proxy Support

```
User: "Route through a Socks5 proxy at proxy.corp.com:1080"
Claude executes: set_proxy {
  type: "socks5",
  host: "proxy.corp.com",
  port: 1080,
  username: "user",      // optional
  password: "pass"       // optional
}
```

All subsequent requests route through the proxy until `set_proxy { type: "none" }` is called.

## Adding New API Specs

The server auto-loads endpoints from Swagger/OpenAPI specs. To add a new API:

1. **Place the Swagger spec** in `specs/my-api.json`
2. **Restart the server** — endpoints load automatically at startup
3. **Search with `get_syntax_help`** — all endpoints are immediately searchable

No code changes needed! Example:

```bash
# Copy your Swagger spec
cp /path/to/new-api-swagger.json specs/new-api.json

# Restart the server
npm start

# Now Claude can search and use all endpoints from new-api.json
```

The parser extracts:
- Endpoint path and HTTP method
- Parameter names, types, and requirements
- Request body schema properties
- Operation summary and description
- Response descriptions and examples
- Tags for better discoverability

## Adding Usage Guides

Create markdown guides in `guides/` to document best practices and workflows:

1. **Create a new file** — `guides/my-guide.md`
2. **Add YAML frontmatter** (optional):
   ```yaml
   ---
   title: My Guide Title
   description: One-line description
   tags: [tag1, tag2]
   ---
   ```
3. **Write markdown content** — Guidelines, workflows, examples
4. **Restart the server** — Guides auto-load at startup
5. **Search with `get_usage_guide`** — Guides are immediately discoverable

No code changes needed! Users can then search by:
- Guide name: `get_usage_guide("my-guide")`
- Keyword: `get_usage_guide("cluster")`
- List all: `get_usage_guide("list")`

## Limitations

- **No auto token refresh** — If a JWT expires, call `set_auth` again with a fresh token
- **No request templating (yet)** — Request bodies are literal; Handlebars templating planned
- **No response filtering (yet)** — Full responses returned; jq-like queries planned
- **Blocking uploads** — Large files block the connection; chunking coming in Phase 2

## Documentation

- **[README.md](README.md)** — This file; user-facing feature overview
- **[CLAUDE.md](CLAUDE.md)** — Deep architecture guide for developers
- **[DEPLOYMENT.md](DEPLOYMENT.md)** — Claude Desktop and VS Code integration
- **[VECTOR_STORE_ADDED.md](VECTOR_STORE_ADDED.md)** — Vector Store API reference
- **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** — Project structure and roadmap

## Supported APIs

| Service | Status | Endpoints | Auth |
|---------|--------|-----------|------|
| **Global Compute** | ✅ Complete | 37 (clusters, configs, OMS, QueryGrid, site-settings) | Bearer, Basic |
| **Vector Store** | ✅ Complete | 13 (collections, search, ingest, permissions, health) | Bearer, Basic |
| **Any REST API** | ✅ Supported | Unlimited (universal client) | Bearer, Basic, Custom |

## Contributing

See `CLAUDE.md` for architectural details, testing patterns, and guidelines for adding endpoints.

## License

MIT

## Support

- **Bug reports** — GitHub Issues
- **Feature requests** — GitHub Discussions
- **Architecture questions** — See `CLAUDE.md` Q&A section
- **Deployment help** — See `DEPLOYMENT.md` troubleshooting
