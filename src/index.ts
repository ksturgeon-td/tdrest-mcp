import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { RestClient } from "./rest-client.js";
import { SyntaxHelpRegistry } from "./syntax-help.js";
import { AuthConfig, ProxyConfig, RestRequestPayload } from "./types.js";
import {
  expandGlob,
  listDirectory,
  validateFile,
  formatFileSize,
  filterByExtension,
} from "./file-utils.js";

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

let sessionAuth: AuthConfig | null = null;
let sessionProxy: ProxyConfig | null = null;

// Initialize syntax help entries from swagger specs
function initializeSyntaxHelp(): void {
  syntaxHelp.register({
    endpoint: "/clusters",
    method: "GET",
    description: "List all compute engine clusters for a site",
    parameters: [
      {
        name: "site_id",
        type: "string",
        required: true,
        description: "Teradata site identifier (e.g., TDICAM33431DV45)",
      },
      {
        name: "page",
        type: "integer",
        required: false,
        description: "Page number for pagination (default: 1)",
      },
      {
        name: "page_size",
        type: "integer",
        required: false,
        description: "Number of results per page (default: 50, max: 1000)",
      },
    ],
    requestTemplate: undefined,
    responseExample: JSON.stringify(
      {
        items: [
          {
            component_id: "comp_SheDvQaMDNs6MqiSX4gJD",
            name: "test-cluster21",
            status: "RUNNING",
            desired_status: "RUNNING",
            manifest_version: "0.0.1",
          },
        ],
        total: 1,
        limit: 50,
        offset: 0,
      },
      null,
      2
    ),
    notes: [
      "Requires Bearer token authentication with valid JWT",
      "Site ID is required as a query parameter",
      "Supports pagination for large result sets",
    ],
  });

  syntaxHelp.register({
    endpoint: "/clusters",
    method: "POST",
    description: "Create a new compute engine cluster",
    parameters: [
      {
        name: "config_id",
        type: "string",
        required: true,
        description: "Configuration ID for the cluster",
      },
    ],
    requestTemplate: JSON.stringify({ config_id: "CEAMGPSCTEAM0006U" }),
    responseExample: JSON.stringify(
      {
        component_id: "comp_SheDvQaMDNs6MqiSX4gJD",
        name: "test-cluster",
        status: "PROVISIONING",
        desired_status: "RUNNING",
      },
      null,
      2
    ),
    notes: [
      "Returns 202 Accepted; cluster creation is asynchronous",
      "Check status with GET /clusters/{id} to monitor progress",
    ],
  });

  syntaxHelp.register({
    endpoint: "/clusters/{id}",
    method: "GET",
    description: "Retrieve details of a specific cluster",
    parameters: [
      {
        name: "id",
        type: "string",
        required: true,
        description: "Cluster configuration ID",
      },
    ],
    notes: [
      "Returns full cluster details including status and connectivity info",
    ],
  });

  syntaxHelp.register({
    endpoint: "/clusters/{id}",
    method: "DELETE",
    description: "Delete a compute engine cluster",
    parameters: [
      {
        name: "id",
        type: "string",
        required: true,
        description: "Cluster configuration ID",
      },
    ],
    notes: [
      "Returns 202 Accepted; deletion is asynchronous",
      "This operation cannot be undone",
    ],
  });

  syntaxHelp.register({
    endpoint: "/configs",
    method: "GET",
    description: "List all compute engine configurations",
    parameters: [
      {
        name: "site_id",
        type: "string",
        required: false,
        description: "Filter by site ID",
      },
    ],
    notes: ["Configurations define the template for cluster creation"],
  });

  syntaxHelp.register({
    endpoint: "/configs",
    method: "POST",
    description: "Create a new compute engine configuration",
    parameters: [
      {
        name: "name",
        type: "string",
        required: true,
        description: "Configuration name",
      },
      {
        name: "site_id",
        type: "string",
        required: true,
        description: "Associated site ID",
      },
      {
        name: "compute",
        type: "object",
        required: true,
        description:
          'Compute specification (type: DEDICATED or POOLED, size: 1x-16x)',
      },
    ],
    notes: [
      "DEDICATED: fixed resource allocation per cluster",
      "POOLED: shared resource pool with auto-scaling",
    ],
  });

  // Vector Store API endpoints
  syntaxHelp.register({
    endpoint: "/data-insights/api/v2/collections",
    method: "GET",
    description: "List all available vector collections",
    parameters: [
      {
        name: "authorized",
        type: "boolean",
        required: false,
        description: "Filter to only show authorized collections",
      },
      {
        name: "page",
        type: "integer",
        required: false,
        description: "Page number for pagination (default: 1)",
      },
      {
        name: "page_size",
        type: "integer",
        required: false,
        description: "Number of results per page",
      },
    ],
    responseExample: JSON.stringify(
      {
        collection_count: 2,
        page: 1,
        page_size: 20,
        collection_list: [
          {
            collection_name: "documents",
            collection_status: "READY",
            collection_type: "FILE-CONTENT-BASED",
            target_database: "vector_db",
            permission: "USER",
          },
        ],
      },
      null,
      2
    ),
    notes: [
      "Collections are virtual search indexes over your data",
      "Supports CONTENT-BASED and EMBEDDING-BASED collection types",
    ],
  });

  syntaxHelp.register({
    endpoint: "/data-insights/api/v2/collections/{collection_name}",
    method: "POST",
    description: "Create a new vector collection",
    parameters: [
      {
        name: "collection_name",
        type: "string",
        required: true,
        description: "Unique name for the collection",
      },
      {
        name: "collection_type",
        type: "string",
        required: true,
        description:
          "Type: CONTENT-BASED, EMBEDDING-BASED, FILE-CONTENT-BASED, FILE-EMBEDDING-BASED",
      },
      {
        name: "target_database",
        type: "string",
        required: false,
        description: "Target database (defaults to logged-in database)",
      },
    ],
    notes: [
      "CONTENT-BASED: Generates embeddings from content columns automatically",
      "EMBEDDING-BASED: Uses pre-computed embedding columns",
      "FILE variants work with uploaded documents",
    ],
  });

  syntaxHelp.register({
    endpoint: "/data-insights/api/v2/collections/{collection_name}/ingest",
    method: "PUT",
    description: "Upload and ingest documents into a collection",
    parameters: [
      {
        name: "collection_name",
        type: "string",
        required: true,
        description: "Target collection name",
      },
      {
        name: "files",
        type: "file",
        required: true,
        description: "Files to upload (CSV, JSON, PDF, etc.)",
      },
    ],
    responseExample: JSON.stringify(
      {
        collection_name: "documents",
        collection_status: "ingesting",
        message: "Files uploaded successfully and ingestion in progress.",
      },
      null,
      2
    ),
    notes: [
      "Supports multipart file upload",
      "Returns 202 Accepted; check status endpoint for progress",
      "Can specify chunk_size, overlap, and extraction schema in request",
    ],
  });

  syntaxHelp.register({
    endpoint: "/data-insights/api/v2/collections/{collection_name}/similarity-search",
    method: "POST",
    description: "Search for similar documents in a collection",
    parameters: [
      {
        name: "collection_name",
        type: "string",
        required: true,
        description: "Target collection name",
      },
      {
        name: "question",
        type: "string",
        required: true,
        description: "Query text (will be embedded for similarity matching)",
      },
      {
        name: "top_k",
        type: "integer",
        required: false,
        description: "Number of top results to return (default: 10)",
      },
    ],
    responseExample: JSON.stringify(
      {
        similar_objects_count: 3,
        page: 1,
        page_size: 20,
        similar_objects_list: [
          {
            score: 0.92,
            DataBaseName: "vector_db",
            TableName: "documents",
            TD_ID: 1,
            data_col: "This is a relevant document...",
          },
        ],
      },
      null,
      2
    ),
    notes: [
      "Uses semantic similarity (not keyword matching)",
      "Scores range from 0-1 (higher = more similar)",
      "Can filter results by metadata columns",
    ],
  });

  syntaxHelp.register({
    endpoint: "/data-insights/api/v2/collections/{collection_name}/ask",
    method: "POST",
    description:
      "Ask a question and get a natural language response based on collection data",
    parameters: [
      {
        name: "collection_name",
        type: "string",
        required: true,
        description: "Target collection name",
      },
      {
        name: "question",
        type: "string",
        required: true,
        description: "Question to ask about the collection",
      },
      {
        name: "chat_model",
        type: "object",
        required: false,
        description: "AI model to use for response (uses default if omitted)",
      },
    ],
    responseExample: JSON.stringify(
      {
        message:
          "Based on the documents, the analysis shows that efficiency improved by 23% after implementing the recommended changes.",
      },
      null,
      2
    ),
    notes: [
      "Combines semantic search + LLM generation",
      "Supports custom guardrails and safety settings",
      "Can specify embedding model, ranking model, and search strategy",
    ],
  });

  syntaxHelp.register({
    endpoint: "/data-insights/api/v2/permissions/{collection_name}",
    method: "GET",
    description: "Get user permissions for a collection",
    parameters: [
      {
        name: "collection_name",
        type: "string",
        required: true,
        description: "Target collection name",
      },
    ],
    responseExample: JSON.stringify(
      {
        users_count: 3,
        page: 1,
        page_size: 20,
        users_list: [
          { user_name: "alice", permission: "USER" },
          { user_name: "bob", permission: "ADMIN" },
        ],
      },
      null,
      2
    ),
    notes: ["Permission levels: USER (read), ADMIN (read/write), NO_ACCESS"],
  });

  syntaxHelp.register({
    endpoint: "/data-insights/api/v2/permissions/{collection_name}",
    method: "PUT",
    description: "Grant or revoke user permissions on a collection",
    parameters: [
      {
        name: "collection_name",
        type: "string",
        required: true,
        description: "Target collection name",
      },
      {
        name: "user_names",
        type: "array",
        required: true,
        description: "List of user names to modify permissions for",
      },
      {
        name: "action",
        type: "string",
        required: true,
        description: "GRANT or REVOKE",
      },
      {
        name: "permission",
        type: "string",
        required: true,
        description: "USER or ADMIN",
      },
    ],
    responseExample: JSON.stringify(
      {
        message: "USER permission for collection documents has been granted.",
      },
      null,
      2
    ),
    notes: [
      "ADMIN can create, update, and delete the collection",
      "USER can search and view but cannot modify",
    ],
  });
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
              description: "Custom HTTP headers",
              additionalProperties: { type: "string" },
            },
            body: {
              oneOf: [
                { type: "string" },
                { type: "object" },
              ],
              description: "Request body (JSON object or string)",
            },
            files: {
              type: "object",
              description:
                "Files to upload (multipart). Key is field name, value has path property",
              additionalProperties: {
                type: "object",
                properties: {
                  path: { type: "string" },
                },
                required: ["path"],
              },
            },
            filePattern: {
              type: "string",
              description:
                "Glob pattern to match files (e.g., /tmp/*.pdf, ~/docs/**/*.csv). Alternative to explicit files.",
            },
            formData: {
              type: "object",
              description: "Form fields (application/x-www-form-urlencoded)",
              additionalProperties: {
                oneOf: [
                  { type: "string" },
                  { type: "number" },
                  { type: "boolean" },
                ],
              },
            },
            auth: {
              type: "object",
              description:
                "Authentication config. Omit to use session auth if set.",
              properties: {
                type: {
                  type: "string",
                  enum: ["bearer", "basic", "custom", "none"],
                },
                token: {
                  type: "string",
                },
                username: {
                  type: "string",
                },
                password: {
                  type: "string",
                },
                headerName: {
                  type: "string",
                },
                headerValue: {
                  type: "string",
                },
              },
            },
            proxy: {
              type: "object",
              description: "Proxy config. Omit to use session proxy if set.",
              properties: {
                type: {
                  type: "string",
                  enum: ["socks5", "http", "https", "none"],
                },
                host: {
                  type: "string",
                },
                port: {
                  type: "number",
                },
                username: {
                  type: "string",
                },
                password: {
                  type: "string",
                },
              },
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
