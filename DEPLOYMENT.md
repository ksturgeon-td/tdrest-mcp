# Deployment Guide

## Claude Desktop Integration

The tdrest-mcp server can be integrated into Claude Desktop so the REST tools are available whenever you use Claude.

### Prerequisites

- Node.js 18+ installed
- tdrest-mcp built locally (`npm run build`)
- Claude Desktop installed

### Step 1: Configure Claude Desktop

Edit your Claude Desktop configuration file:

**macOS/Linux:**
```
~/.claude/config.json
```

**Windows:**
```
%APPDATA%\Claude\config.json
```

### Step 2: Add the MCP Server

Add this section to your MCP servers config:

```json
{
  "mcpServers": {
    "tdrest": {
      "command": "node",
      "args": ["/path/to/tdrest-mcp/dist/index.js"],
      "env": {
        "ELASTIC_COMPUTE_BASE_URL": "https://preprod.globalcompute.qateradatacloud.com",
        "VECTOR_STORE_BASE_URL": "https://api.vectorstore.qateradatacloud.com",
        "REQUEST_TIMEOUT": "30000"
      }
    }
  }
}
```

Replace `/path/to/tdrest-mcp` with the absolute path to your project directory.

### Step 3: Restart Claude Desktop

- Quit Claude Desktop completely
- Reopen Claude Desktop
- The tdrest REST tools should now be available

### Step 4: Verify Integration

In Claude, try:
```
Can you list the available REST tools?
```

Claude should respond with the 4 tools:
- `execute_rest_call`
- `set_auth`
- `set_proxy`
- `get_syntax_help`

## VS Code Extension Integration

To use tdrest-mcp with the Claude VS Code extension:

### Step 1: Install Extension

Install the official Claude extension from the VS Code marketplace.

### Step 2: Configure .claude/config.json

Create a `.claude/config.json` in your workspace root (or home directory):

```json
{
  "mcpServers": {
    "tdrest": {
      "command": "node",
      "args": ["/path/to/tdrest-mcp/dist/index.js"]
    }
  }
}
```

### Step 3: Reload VS Code

The extension will detect the new MCP server and make the tools available.

## Standalone Server (Advanced)

To run tdrest-mcp as a standalone service that other applications can connect to:

### Step 1: Start the Server

```bash
cd /path/to/tdrest-mcp
npm run build
npm start
```

The server listens on stdin/stdout by default. To expose it as a network service, you can use a wrapper or pipe it to an HTTP server.

### Step 2: Connect via MCP Client Library

Use an MCP client library (e.g., Node.js `@modelcontextprotocol/sdk`) to connect:

```javascript
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio");

const transport = new StdioClientTransport({
  command: "node",
  args: ["/path/to/tdrest-mcp/dist/index.js"]
});

// Use the transport to call tools
```

## Environment Variables

The server reads configuration from environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `ELASTIC_COMPUTE_BASE_URL` | `https://preprod.globalcompute.qateradatacloud.com` | Elastic Compute API base URL |
| `VECTOR_STORE_BASE_URL` | `https://api.vectorstore.qateradatacloud.com` | Vector Store API base URL |
| `REQUEST_TIMEOUT` | `30000` | HTTP request timeout in milliseconds |

You can override these by setting them before running the server:

```bash
export ELASTIC_COMPUTE_BASE_URL=https://prod.example.com
npm start
```

Or pass them in the MCP config as shown above.

## Troubleshooting

### Server Not Connecting

1. **Check the path**: Ensure `/path/to/tdrest-mcp/dist/index.js` is the absolute path to your built server.

2. **Rebuild if needed**: 
   ```bash
   npm run build
   ```

3. **Check logs**: In Claude Desktop, go to Settings → Logs to see MCP server output.

### Authentication Not Working

1. **Token expired?**: If a Bearer token expires, call `set_auth` again with a fresh token.

2. **Wrong auth type?**: Verify you're using the correct auth type (bearer, basic, custom).

3. **Missing headers?**: Some APIs require specific headers beyond auth (e.g., `x-api-key`). Pass them via `headers` in `execute_rest_call`.

### Proxy Connection Issues

1. **Check proxy details**: Verify the proxy host, port, and credentials are correct.

2. **Socks5 requirement**: Currently only Socks5 proxies are supported (not HTTP/HTTPS proxies).

3. **Firewall rules**: Ensure your firewall allows Socks5 connections to the proxy host/port.

## Security Best Practices

1. **Never commit credentials**: Use `.env` (which is in `.gitignore`) or environment variables.

2. **Rotate tokens regularly**: Short-lived JWT tokens reduce risk if compromised.

3. **Use HTTPS only**: All API calls should go to HTTPS endpoints.

4. **Restrict Socks5 access**: If using a Socks5 proxy, limit access to trusted networks only.

5. **Monitor logs**: Regularly check Claude Desktop logs for unexpected API calls.

## Performance Tuning

### Request Timeout

If you have slow network or large payloads, increase the timeout:

```json
{
  "env": {
    "REQUEST_TIMEOUT": "60000"  // 60 seconds
  }
}
```

### Connection Pooling

For high-volume scenarios, the axios client (under the hood) automatically uses HTTP keep-alive. No configuration needed.

### Proxy Overhead

If using a Socks5 proxy adds significant latency, consider:
- Using a proxy closer to your network
- Running tdrest-mcp on the corporate network (where the proxy is)
- Disabling the proxy for trusted networks (set proxy to `none`)

## Uninstalling

To remove tdrest-mcp from Claude Desktop:

1. Edit your `~/.claude/config.json`
2. Remove the `tdrest` entry from `mcpServers`
3. Restart Claude Desktop

The installation is completely local and non-invasive; no system files are modified.
