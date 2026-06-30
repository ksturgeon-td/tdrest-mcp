# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**tdrest-mcp** is a lightweight MCP (Model Context Protocol) server that provides Claude and other MCP clients with tools to make REST API calls against Teradata cloud services with full support for:

- Custom authentication (Bearer JWT, Basic, custom headers)
- Socks5 proxy routing
- Multipart file uploads with form fields
- Session-level auth/proxy configuration
- Progressive syntax help for available endpoints

The server is designed to work with Claude Desktop, VS Code extensions, and other MCP-compatible clients. It does **not** require a separate skill; the skill layer (if needed) would be built in a companion `tdrest-skill` project.

## Architecture

```
src/
├── index.ts           # MCP server entry, tool definitions, request handlers
├── rest-client.ts     # HTTP client with auth, proxy, multipart support
├── syntax-help.ts     # Registry of endpoint docs, searchable help system
├── types.ts           # TypeScript interfaces for auth, proxy, requests
└── config.ts          # Environment config loader (base URLs, timeouts)
specs/
└── elastic-compute-api.json  # Swagger spec snapshot (source of truth for endpoints)
```

**Key modules:**
- **RestClient**: Wraps axios with Socks5 proxy injection, form-data multipart, and auth header building.
- **SyntaxHelpRegistry**: In-memory store of endpoint metadata (params, examples, notes). Tools can search by keyword.
- **MCP Server**: Exposes `execute_rest_call`, `set_auth`, `set_proxy`, and `get_syntax_help` as tools to Claude.

## Setup & Build

```bash
# Install dependencies
npm install

# Build TypeScript to dist/
npm run build

# Watch mode for development
npm run dev

# Run tests
npm test

# Run a single test file
npm test -- src/path/to/test.spec.ts

# Lint and fix
npm run lint
npm run lint:fix

# Start the MCP server (runs dist/index.js via Node)
npm start
```

## Configuration

The server reads base URLs from environment variables (or uses defaults):

```bash
export ELASTIC_COMPUTE_BASE_URL=https://preprod.globalcompute.qateradatacloud.com
export VECTOR_STORE_BASE_URL=https://api.vectorstore.qateradatacloud.com
export REQUEST_TIMEOUT=30000
```

Copy `.env.example` to `.env` and fill in your values. The server loads `.env` on startup.

## Core Concepts

### 1. RestRequestPayload

All HTTP calls go through `execute_rest_call` with this structure:

```typescript
{
  url: "https://api.example.com/clusters",
  method: "GET",
  headers: { "X-Custom": "value" },
  body: { ... },        // Optional: JSON or string
  files: {              // Optional: multipart uploads
    "document": { path: "/tmp/file.pdf" },
    "metadata": { path: "/tmp/meta.json" }
  },
  formData: {           // Optional: form fields
    "user_id": "123",
    "enabled": true
  },
  auth: {               // Optional: override session auth
    type: "bearer",
    token: "..."
  },
  proxy: {              // Optional: override session proxy
    type: "socks5",
    host: "proxy.corp.com",
    port: 1080
  },
  timeout: 30000,       // Optional: request timeout (ms)
  validateStatus: false // Optional: false = all responses succeed (default)
}
```

### 2. Session Auth & Proxy

Users call `set_auth` and `set_proxy` once per session; subsequent calls use them unless explicitly overridden:

```
User: "Set up a Bearer token for this session"
Claude: execute set_auth { type: "bearer", token: "eyJ..." }
Response: "Authentication set to bearer (JWT token stored for session)"

User: "Now list clusters"
Claude: execute execute_rest_call { 
  url: "https://preprod.globalcompute.qateradatacloud.com/clusters",
  method: "GET",
  // auth is NOT in the payload—RestClient pulls from sessionAuth
}
```

### 3. Syntax Help

- `get_syntax_help("list")` → all endpoints
- `get_syntax_help("clusters")` → endpoints matching "clusters"
- `get_syntax_help("create")` → endpoints matching "create"

Each `SyntaxHelpEntry` includes description, parameters, request template, response example, and notes.

## Adding Endpoints

### From Swagger spec:
1. Extract path, method, parameters, and examples from the Swagger JSON.
2. Add a `SyntaxHelpEntry` to `initializeSyntaxHelp()` in `index.ts`:

```typescript
syntaxHelp.register({
  endpoint: "/my-resource",
  method: "POST",
  description: "Create a resource",
  parameters: [
    { name: "id", type: "string", required: true, description: "..." }
  ],
  requestTemplate: '{ "name": "example" }',
  responseExample: '{ "id": "123", "status": "created" }',
  notes: ["Note 1", "Note 2"]
});
```

3. **Do not** hard-code endpoint logic into the MCP server. Endpoints are stateless; Claude builds the `RestRequestPayload` and the server executes it.

## Testing

- **Unit tests** go in `src/` with `.spec.ts` suffix.
- **No mocking of HTTP calls** in early stages; use real Swagger specs and test against real APIs (with read-only credentials).
- For local testing without API access, stub responses in test fixtures.

Example test:

```typescript
import { describe, it, expect } from "vitest";
import { SyntaxHelpRegistry } from "../syntax-help";

describe("SyntaxHelpRegistry", () => {
  it("searches by endpoint name", () => {
    const reg = new SyntaxHelpRegistry();
    reg.register({
      endpoint: "/clusters",
      method: "GET",
      description: "List clusters",
      parameters: []
    });
    const results = reg.getHelp("clusters");
    expect(results).toHaveLength(1);
  });
});
```

## Common Tasks

### Add Bearer auth for an API call
1. `set_auth { type: "bearer", token: "..." }`
2. All subsequent calls use that token automatically.

### Use a Socks5 proxy
1. `set_proxy { type: "socks5", host: "proxy.corp.com", port: 1080, username: "user", password: "pass" }`
2. All subsequent calls route through the proxy.

### Upload a file
```typescript
execute_rest_call {
  url: "https://api.example.com/documents/upload",
  method: "POST",
  files: {
    "document": { path: "/path/to/file.pdf" }
  },
  formData: {
    "title": "My Document"
  }
}
```

The server builds a `FormData` object and sends it as `multipart/form-data`.

### Search for an endpoint
```
User: "What endpoints are available for managing users?"
Claude: execute get_syntax_help { query: "user" }
```

## Deployment

The MCP server runs as a **stdio-transport** process. To integrate with Claude Desktop or VS Code:

1. Build the project: `npm run build`
2. Reference it in your MCP configuration (e.g., `.claude/mcp.json`):

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

3. Restart Claude Desktop / reload VS Code.

The server will appear as a set of tools available to Claude.

## Gotchas & Limits

1. **No request/response templating yet** — that's a Phase 2 feature. Currently, users pass raw JSON bodies.
2. **Swagger auto-parsing is not implemented** — endpoints are hand-curated in `initializeSyntaxHelp()`. A future loader can parse `specs/*.json` and auto-generate entries.
3. **Short-lived tokens** — the server does NOT refresh JWTs. If a token expires mid-session, the next call will fail with a 401. Users need to re-run `set_auth` with a fresh token.
4. **No request/response logging** — the server does not log HTTP payloads for security. Use your browser DevTools or a proxy tool (e.g., Burp, mitmproxy) to inspect calls.
5. **File uploads are blocking** — large files will pause until upload completes. No streaming or progress callbacks yet.

## Future Enhancements

- [ ] Handlebars templating for request bodies (e.g., `{{user_id}}` → prompt user)
- [ ] Swagger spec auto-parser to generate `SyntaxHelpEntry` from `specs/*.json`
- [ ] Request/response body validation against schemas
- [ ] Built-in jq-like query language for response parsing
- [ ] Companion `tdrest-skill` for Claude Code CLI with curated markdown docs
- [ ] HTTP request/response cache for read-only operations (with TTL)
- [ ] Vector Store API stub endpoints (currently only Elastic Compute is wired)

## File Structure Notes

- **Never modify `dist/`** — it's generated from `src/`.
- **`.env` is not committed**; use `.env.example` as the template.
- **`specs/*.json` are snapshots** of Swagger specs; update them when the API changes.
- **`src/types.ts` is the single source of truth for API contracts** — keep it in sync with MCP tool schemas in `index.ts`.
