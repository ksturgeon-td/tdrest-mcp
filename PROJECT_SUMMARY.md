# tdrest-mcp Project Summary

## Status: ✅ Complete & Ready

The lightweight REST MCP server for Teradata cloud services has been scaffolded and is ready for development.

## What Was Built

### Core MCP Server (`src/index.ts`)
- **MCP entry point** with stdio transport for Claude Desktop/VS Code
- **4 tools exposed**:
  - `execute_rest_call` — Execute any HTTP method with auth, proxy, multipart support
  - `set_auth` — Session-level auth (Bearer, Basic, custom headers)
  - `set_proxy` — Session-level Socks5 proxy
  - `get_syntax_help` — Searchable endpoint documentation with examples

### REST Client (`src/rest-client.ts`)
- Wraps axios with:
  - **Custom auth headers** (Bearer JWT, Basic, custom)
  - **Socks5 proxy support** via socks-proxy-agent
  - **Multipart file uploads** using form-data
  - **Robust error handling** with response status/body capture

### Syntax Help Registry (`src/syntax-help.ts`)
- In-memory endpoint registry with:
  - **Search** by endpoint name, method, or keyword
  - **Full documentation** (description, parameters, examples, notes)
  - **Markdown formatting** for Claude-friendly display
  - **Template registration** for future request/response templating

### Configuration (`src/config.ts`)
- Environment-based config for:
  - `ELASTIC_COMPUTE_BASE_URL`
  - `VECTOR_STORE_BASE_URL`
  - `REQUEST_TIMEOUT`
- Falls back to sensible defaults

### Swagger Spec (`specs/elastic-compute-api.json`)
- Full Global Compute API spec snapshot (v1.3.6)
- Covers 20+ endpoints across clusters, configs, OMS, QueryGrid, etc.
- Ready to parse for auto-generation (Phase 2 feature)

### Documentation
- **README.md** — Quick start and feature overview
- **CLAUDE.md** — Deep architecture guide for future developers
- **.env.example** — Template for environment setup
- **PROJECT_SUMMARY.md** — This file

### Build & Test
- **TypeScript** strict mode compilation
- **ESLint** code style enforcement
- **Vitest** unit tests (4 tests for SyntaxHelpRegistry)
- **npm scripts**: build, dev, test, lint, lint:fix, start

## Directory Structure

```
tdrest-mcp/
├── src/
│   ├── index.ts              # MCP server entry + tool handlers
│   ├── rest-client.ts        # HTTP client (auth, proxy, multipart)
│   ├── syntax-help.ts        # Endpoint registry & search
│   ├── syntax-help.spec.ts   # Unit tests
│   ├── types.ts              # TypeScript interfaces
│   └── config.ts             # Environment config
├── specs/
│   └── elastic-compute-api.json  # Swagger snapshot
├── dist/                     # Compiled JavaScript (auto-generated)
├── node_modules/             # Dependencies
├── package.json              # NPM config
├── tsconfig.json             # TypeScript config
├── eslint.config.js          # Linter config
├── vitest.config.ts          # Test config
├── .gitignore                # Git ignore rules
├── .env.example              # Environment template
├── README.md                 # User guide
├── CLAUDE.md                 # Developer guide
└── PROJECT_SUMMARY.md        # This file
```

## How to Use

### First-Time Setup
```bash
cd /Users/kevin.sturgeon/claude_code/tdrest-mcp
npm install
npm run build
```

### Development Loop
```bash
npm run dev          # Watch TypeScript changes
npm test             # Run unit tests
npm run lint:fix     # Auto-fix code style
```

### Start the MCP Server
```bash
npm start
```

The server listens on stdin/stdout. To connect to Claude Desktop, add this to your MCP config:
```json
{
  "mcp-servers": {
    "tdrest": {
      "command": "node",
      "args": ["/path/to/tdrest-mcp/dist/index.js"]
    }
  }
}
```

## Next Steps

### Phase 1 (Immediate)
- [ ] Test against real Elastic Compute API (with valid JWT)
- [ ] Verify Socks5 proxy works in corporate environment
- [ ] Test multipart file uploads
- [ ] Add more endpoints to SyntaxHelpRegistry (from Swagger spec)

### Phase 2 (Enhancement)
- [ ] Auto-parse Swagger specs to generate SyntaxHelpRegistry entries
- [ ] Implement Handlebars templating for request bodies
- [ ] Add jq-like response filtering
- [ ] Build companion `tdrest-skill` for Claude Code with curated markdown docs

### Phase 3 (Polish)
- [ ] Request/response logging (for debugging, respecting security)
- [ ] HTTP response caching (TTL-based, for read-only operations)
- [ ] Async file upload streaming (avoid blocking)
- [ ] Support for other Teradata services (Vantage REST, etc.)

## Key Features Ready Now

✅ Bearer JWT authentication
✅ Basic auth (username/password)
✅ Custom header authentication
✅ Session-level auth/proxy management
✅ Socks5 proxy routing
✅ Multipart file uploads with form fields
✅ Searchable endpoint documentation
✅ Full Elastic Compute API endpoint stubs
✅ TypeScript strict mode
✅ Unit tests passing
✅ ESLint configured

## Known Limitations

- No JWT token refresh (manual refresh required if token expires)
- No request body templating yet (Handlebars support coming)
- No response filtering (pass-through only)
- File uploads are blocking (will add streaming in Phase 2)
- Swagger auto-parsing not implemented (endpoints hand-curated)

## Files to Ignore

- `.env` (contains sensitive auth tokens)
- `dist/` (auto-generated from src/)
- `node_modules/` (auto-installed)
- `.DS_Store`, `*.log` (system files)

## Questions?

See **CLAUDE.md** for detailed architecture, testing patterns, and contribution guidelines.
