import fs from "fs";
import path from "path";
import { SyntaxHelpEntry } from "./types.js";

interface SwaggerParameter {
  name: string;
  in: string;
  required?: boolean;
  description?: string;
  schema?: { type?: string };
  type?: string;
}

interface SwaggerOperation {
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: SwaggerParameter[];
  requestBody?: {
    description?: string;
    required?: boolean;
    content?: {
      "application/json"?: {
        schema?: Record<string, unknown>;
      };
      [key: string]: unknown;
    };
  };
  responses?: Record<string, { description?: string }>;
  tags?: string[];
}

interface SwaggerPath {
  [method: string]: SwaggerOperation;
}

interface SwaggerSpec {
  info?: {
    title?: string;
    version?: string;
    description?: string;
  };
  paths?: Record<string, SwaggerPath>;
}

export function parseSwaggerSpec(filePath: string): SyntaxHelpEntry[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const spec: SwaggerSpec = JSON.parse(content);

  const entries: SyntaxHelpEntry[] = [];

  if (!spec.paths) {
    return entries;
  }

  for (const [pathKey, pathItem] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (method === "parameters") continue; // Skip non-operation keys

      const op = operation as SwaggerOperation;
      if (!op.operationId && !op.summary) continue;

      // Extract parameters (path and query)
      const parameters = (op.parameters || [])
        .filter((p) => p.in === "query" || p.in === "path")
        .map((p) => ({
          name: p.name,
          type: p.schema?.type || p.type || "string",
          required: p.required || false,
          description: p.description || "",
        }));

      // Extract request body schema properties
      const jsonContent = op.requestBody?.content?.["application/json"];
      const bodySchema = jsonContent?.schema as Record<string, unknown> | undefined;
      if (bodySchema && bodySchema.properties) {
        const props = bodySchema.properties as Record<string, Record<string, unknown>>;
        const required = (bodySchema.required as string[]) || [];
        for (const [propName, propSchema] of Object.entries(props)) {
          parameters.push({
            name: propName,
            type: (propSchema.type as string) || "object",
            required: required.includes(propName),
            description: (propSchema.description as string) || "",
          });
        }
      }

      // Build response example
      const successResponse = op.responses?.["200"] || op.responses?.["201"];
      const responseExample = successResponse?.description || "Success";

      // Build request template hint
      let requestTemplate: string | undefined;
      if (op.requestBody) {
        requestTemplate = op.requestBody.description || "Request body required";
      }

      const entry: SyntaxHelpEntry = {
        endpoint: pathKey,
        method: method.toUpperCase() as
          | "GET"
          | "POST"
          | "PUT"
          | "PATCH"
          | "DELETE",
        description: op.summary || op.description || `${method.toUpperCase()} ${pathKey}`,
        parameters,
        requestTemplate,
        responseExample,
        notes: [
          op.description ? `Details: ${op.description.substring(0, 100)}...` : null,
          op.tags?.length ? `Tags: ${op.tags.join(", ")}` : null,
        ].filter((n) => n !== null) as string[],
      };

      entries.push(entry);
    }
  }

  return entries;
}

export function generateSyntaxHelpFromSwagger(
  specPath: string
): SyntaxHelpEntry[] {
  try {
    return parseSwaggerSpec(specPath);
  } catch {
    return [];
  }
}
