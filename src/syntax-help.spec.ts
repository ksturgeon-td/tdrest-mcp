import { describe, it, expect } from "vitest";
import { SyntaxHelpRegistry } from "./syntax-help.js";

describe("SyntaxHelpRegistry", () => {
  it("registers and retrieves endpoints", () => {
    const registry = new SyntaxHelpRegistry();

    registry.register({
      endpoint: "/clusters",
      method: "GET",
      description: "List all clusters",
      parameters: [
        {
          name: "site_id",
          type: "string",
          required: true,
          description: "Site ID",
        },
      ],
    });

    const results = registry.getHelp("clusters");
    expect(results).toHaveLength(1);
    expect(results[0].endpoint).toBe("/clusters");
  });

  it("searches by method", () => {
    const registry = new SyntaxHelpRegistry();

    registry.register({
      endpoint: "/items",
      method: "POST",
      description: "Create an item",
      parameters: [],
    });

    registry.register({
      endpoint: "/items",
      method: "GET",
      description: "List items",
      parameters: [],
    });

    const postResults = registry.getHelp("POST");
    expect(postResults.length).toBeGreaterThanOrEqual(1);
  });

  it("generates help text", () => {
    const registry = new SyntaxHelpRegistry();

    registry.register({
      endpoint: "/clusters",
      method: "GET",
      description: "List clusters",
      parameters: [
        {
          name: "site_id",
          type: "string",
          required: true,
          description: "Site ID",
        },
      ],
      responseExample: JSON.stringify({ items: [] }),
      notes: ["Supports pagination"],
    });

    const helpText = registry.getHelpText("clusters");
    expect(helpText).toContain("GET /clusters");
    expect(helpText).toContain("List clusters");
    expect(helpText).toContain("site_id");
    expect(helpText).toContain("Supports pagination");
  });

  it("lists all endpoints", () => {
    const registry = new SyntaxHelpRegistry();

    registry.register({
      endpoint: "/a",
      method: "GET",
      description: "Endpoint A",
      parameters: [],
    });

    registry.register({
      endpoint: "/b",
      method: "POST",
      description: "Endpoint B",
      parameters: [],
    });

    const allText = registry.listAllEndpoints();
    expect(allText).toContain("GET /a");
    expect(allText).toContain("POST /b");
  });
});
