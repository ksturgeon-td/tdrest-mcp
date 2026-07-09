import Handlebars from "handlebars";
import { SyntaxHelpEntry } from "./types.js";

export class SyntaxHelpRegistry {
  private entries: Map<string, SyntaxHelpEntry> = new Map();
  private templates: Map<string, string> = new Map();

  register(entry: SyntaxHelpEntry): void {
    const key = `${entry.method.toUpperCase()} ${entry.endpoint}`.toLowerCase();
    this.entries.set(key, entry);
  }

  registerTemplate(name: string, template: string): void {
    this.templates.set(name.toLowerCase(), template);
  }

  getHelp(query: string): SyntaxHelpEntry[] {
    const q = query.toLowerCase();
    const results: SyntaxHelpEntry[] = [];

    for (const [_key, entry] of this.entries) {
      if (
        entry.endpoint.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q) ||
        entry.method.toLowerCase().includes(q)
      ) {
        results.push(entry);
      }
    }

    return results;
  }

  getTemplate(name: string): string | null {
    return this.templates.get(name.toLowerCase()) || null;
  }

  getAllEndpoints(): SyntaxHelpEntry[] {
    return Array.from(this.entries.values());
  }

  renderTemplate(templateName: string, data: Record<string, unknown>): string {
    const template = this.getTemplate(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }
    const compiled = Handlebars.compile(template);
    return compiled(data);
  }

  getHelpText(query: string): string {
    const results = this.getHelp(query);

    if (results.length === 0) {
      return `No endpoints found matching "${query}". Use "list" to see all available endpoints.`;
    }

    let text = `Found ${results.length} endpoint(s) matching "${query}":\n\n`;
    text += `**URL Construction:** Append the endpoint path directly to the base URL (no /api/v1 prefix).\n`;
    text += `Example: https://preprod.globalcompute.qateradatacloud.com + /clusters = https://preprod.globalcompute.qateradatacloud.com/clusters\n\n`;

    for (const entry of results) {
      text += `### ${entry.method} ${entry.endpoint}\n`;
      text += `${entry.description}\n\n`;

      if (entry.parameters.length > 0) {
        text += "**Parameters:**\n";
        for (const param of entry.parameters) {
          const req = param.required ? "required" : "optional";
          text += `- \`${param.name}\` (${param.type}, ${req}): ${param.description}\n`;
        }
        text += "\n";
      }

      if (entry.requestTemplate) {
        text += "**Request Template:**\n```\n" + entry.requestTemplate + "\n```\n\n";
      }

      if (entry.responseExample) {
        text += "**Response Example:**\n```json\n" + entry.responseExample + "\n```\n\n";
      }

      if (entry.notes && entry.notes.length > 0) {
        text += "**Notes:**\n";
        for (const note of entry.notes) {
          text += `- ${note}\n`;
        }
        text += "\n";
      }
    }

    return text;
  }

  listAllEndpoints(): string {
    const endpoints = this.getAllEndpoints();

    if (endpoints.length === 0) {
      return "No endpoints registered.";
    }

    let text = `Available endpoints (${endpoints.length} total):\n\n`;
    text += `**IMPORTANT:** Append endpoint paths directly to the base URL (no /api/v1 prefix).\n`;
    text += `Example: https://preprod.globalcompute.qateradatacloud.com + /clusters = https://preprod.globalcompute.qateradatacloud.com/clusters\n\n`;

    for (const entry of endpoints) {
      text += `- **${entry.method} ${entry.endpoint}** — ${entry.description}\n`;
    }

    return text;
  }
}
