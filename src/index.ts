import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { RestClient } from "./rest-client.js";
import { SyntaxHelpRegistry } from "./syntax-help.js";
import { AuthConfig, ProxyConfig, RestRequestPayload } from "./types.js";
import { loadConfig } from "./config.js";
import { generateSyntaxHelpFromSwagger } from "./swagger-parser.js";
import {
  expandGlob,
  listDirectory,
  validateFile,
  formatFileSize,
  filterByExtension,
} from "./file-utils.js";
import path from "path";
import { fileURLToPath } from "url";

const server = new Server(
  {
    name: "tdrest-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const restClient = new RestClient();
const syntaxHelp = new SyntaxHelpRegistry();
const appConfig = loadConfig();

let sessionAuth: AuthConfig | null = null;
let sessionProxy: ProxyConfig | null = appConfig.defaultProxy;

// Initialize syntax help entries from swagger specs
function initializeSyntaxHelp(): void {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Parse Global Compute API spec
  const globalComputeSpecPath = path.join(
    __dirname,
    "../specs/global-compute-api.json"
  );
  const gcEntries = generateSyntaxHelpFromSwagger(globalComputeSpecPath);
  gcEntries.forEach((entry) => syntaxHelp.register(entry));

  // Parse Vector Store API spec
  const vectorStoreSpecPath = path.join(
    __dirname,
    "../specs/vector-store-api.json"
  );
  const vsEntries = generateSyntaxHelpFromSwagger(vectorStoreSpecPath);
  vsEntries.forEach((entry) => syntaxHelp.register(entry));

  console.log(
    `Loaded ${gcEntries.length} endpoints from Global Compute API spec`
  );
  console.log(
    `Loaded ${vsEntries.length} endpoints from Vector Store API spec`
  );
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_files",
        description:
          "List files in a directory with optional filtering by extension",
        inputSchema: {
          type: "object",
          properties: {
            directory: {
              type: "string",
              description:
                "Directory path (e.g., /tmp, ~/Documents). Use ~ for home directory.",
            },
            extension: {
              type: "string",
              description:
                'Optional file extension filter (e.g., ".pdf", ".csv"). Comma-separated for multiple.',
            },
            recursive: {
              type: "boolean",
              description:
                "Whether to include subdirectories in listing (default: false)",
            },
          },
          required: ["directory"],
        },
      },
      {
        name: "find_files",
        description:
          "Find files matching a glob pattern (e.g., /tmp/*.pdf, ~/Documents/**/*.csv)",
        inputSchema: {
          type: "object",
          properties: {
            pattern: {
              type: "string",
              description:
                "Glob pattern to search for files (e.g., /tmp/*.pdf, ~/data/**/*.csv)",
            },
          },
          required: ["pattern"],
        },
      },
      {
        name: "execute_rest_call",
        description:
          "Execute a REST API call with support for custom auth, Socks5 proxy, and multipart uploads",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "Full URL to the REST endpoint",
            },
            method: {
              type: "string",
              enum: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
              description: "HTTP method",
            },
            headers: {
              type: "object",
              description: "Custom HTTP headers (e.g., {\"X-API-Key\": \"value\"})",
              additionalProperties: { type: "string" },
            },
            body: {
              description: "Request body (JSON object or string)",
            },
            files: {
              type: "object",
              description:
                "Files to upload (multipart). Key is field name, value is {\"path\": \"/path/to/file\"}",
              additionalProperties: {
                type: "object",
              },
            },
            filePattern: {
              type: "string",
              description:
                "Glob pattern to match files (e.g., /tmp/*.pdf, ~/docs/**/*.csv). Alternative to explicit files.",
            },
            formData: {
              type: "object",
              description: "Form fields as key-value pairs (string, number, or boolean values)",
              additionalProperties: true,
            },
            auth: {
              type: "object",
              description:
                "Authentication config. Omit to use session auth if set. Example: {\"type\": \"bearer\", \"token\": \"...\"} or {\"type\": \"basic\", \"username\": \"...\", \"password\": \"...\"}",
              additionalProperties: true,
            },
            proxy: {
              type: "object",
              description: "Proxy config. Example: {\"type\": \"socks5\", \"host\": \"localhost\", \"port\": 1080}",
              additionalProperties: true,
            },
            timeout: {
              type: "number",
              description: "Request timeout in milliseconds (default: 30000)",
            },
            validateStatus: {
              type: "boolean",
              description:
                "If true, non-2xx responses throw error. If false (default), all responses succeed.",
            },
          },
          required: ["url", "method"],
        },
      },
      {
        name: "set_auth",
        description:
          "Set session-level authentication for subsequent requests",
        inputSchema: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["bearer", "basic", "custom", "none"],
              description: "Authentication type",
            },
            token: {
              type: "string",
              description: "Bearer token (for bearer auth)",
            },
            username: {
              type: "string",
              description: "Username (for basic auth)",
            },
            password: {
              type: "string",
              description: "Password (for basic auth)",
            },
            headerName: {
              type: "string",
              description: "Custom header name (for custom auth)",
            },
            headerValue: {
              type: "string",
              description: "Custom header value (for custom auth)",
            },
          },
          required: ["type"],
        },
      },
      {
        name: "set_proxy",
        description: "Set session-level proxy for subsequent requests",
        inputSchema: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["socks5", "http", "https", "none"],
              description: "Proxy type",
            },
            host: {
              type: "string",
              description: "Proxy host",
            },
            port: {
              type: "number",
              description: "Proxy port",
            },
            username: {
              type: "string",
              description: "Proxy username (optional)",
            },
            password: {
              type: "string",
              description: "Proxy password (optional)",
            },
          },
          required: ["type"],
        },
      },
      {
        name: "get_syntax_help",
        description:
          "Get help and syntax for available Elastic Compute API endpoints",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description:
                'Search query (endpoint name, method, or keyword). Use "list" to see all endpoints.',
            },
          },
          required: ["query"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const toolInput = request.params.arguments as Record<string, unknown>;

  try {
    if (toolName === "list_files") {
      const directory = toolInput.directory as string;
      const extension = toolInput.extension as string | undefined;
      const recursive = (toolInput.recursive as boolean | undefined) || false;

      const listing = listDirectory(directory, recursive);

      let text = `Directory: ${listing.directory}\n`;
      text += `Total items: ${listing.total}\n\n`;

      if (listing.files.length > 0) {
        text += "FILES:\n";
        for (const file of listing.files) {
          text += `  ${file.name} (${formatFileSize(file.size)}) - Modified: ${file.modifiedAt}\n`;
        }
      }

      if (listing.subdirectories.length > 0) {
        text += "\nSUBDIRECTORIES:\n";
        for (const dir of listing.subdirectories) {
          text += `  ${dir.name}/\n`;
        }
      }

      if (listing.files.length === 0 && listing.subdirectories.length === 0) {
        text += "(empty directory)\n";
      }

      return {
        content: [{ type: "text", text }],
      };
    } else if (toolName === "find_files") {
      const pattern = toolInput.pattern as string;

      const matchedFiles = expandGlob(pattern);

      let text = `Found ${matchedFiles.length} file(s) matching pattern: ${pattern}\n\n`;

      for (const filePath of matchedFiles) {
        const file = validateFile(filePath);
        text += `${file.path} (${formatFileSize(file.size)})\n`;
      }

      return {
        content: [{ type: "text", text }],
      };
    } else if (toolName === "execute_rest_call") {
      const payload = toolInput as unknown as RestRequestPayload;

      // Use session auth if not specified in request
      if (!payload.auth && sessionAuth) {
        payload.auth = sessionAuth;
      }

      // Use session proxy if not specified in request
      if (!payload.proxy && sessionProxy) {
        payload.proxy = sessionProxy;
      }

      const response = await restClient.execute(payload);

      return {
        content: [
          {
            type: "text",
            text: `Status: ${response.status} ${response.statusText}\n\nHeaders:\n${JSON.stringify(response.headers, null, 2)}\n\nBody:\n${response.body}`,
          },
        ],
      };
    } else if (toolName === "set_auth") {
      const auth = toolInput as unknown as AuthConfig;
      sessionAuth = auth;

      restClient.setAuth(auth);

      let msg = `Authentication set to ${auth.type}`;
      if (auth.type === "bearer") {
        msg += " (JWT token stored for session)";
      } else if (auth.type === "basic") {
        msg += " (username/password stored for session)";
      }

      return {
        content: [{ type: "text", text: msg }],
      };
    } else if (toolName === "set_proxy") {
      const proxy = toolInput as unknown as ProxyConfig;
      sessionProxy = proxy;

      restClient.setProxy(proxy);

      let msg = `Proxy set to ${proxy.type}`;
      if (proxy.type !== "none" && proxy.host) {
        msg += ` (${proxy.host}:${proxy.port})`;
      }

      return {
        content: [{ type: "text", text: msg }],
      };
    } else if (toolName === "get_syntax_help") {
      const query = (toolInput.query as string) || "list";

      let helpText: string;
      if (query.toLowerCase() === "list") {
        helpText = syntaxHelp.listAllEndpoints();
      } else {
        helpText = syntaxHelp.getHelpText(query);
      }

      return {
        content: [{ type: "text", text: helpText }],
      };
    }

    return {
      content: [{ type: "text", text: `Unknown tool: ${toolName}` }],
      isError: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

async function main() {
  initializeSyntaxHelp();

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("tdrest-mcp server running on stdio");
}

main().catch(console.error);
