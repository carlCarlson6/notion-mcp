import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServerDeps } from "../deps.js";
import { searchNotion } from "../notion/service.js";
import { errorResult, textResult } from "./result.js";

export function registerSearchTool(server: McpServer, deps: ServerDeps): void {
  server.registerTool(
    "notion_search",
    {
      title: "Search Notion",
      description: [
        "Search pages and data sources by title across content shared with the integration.",
        "Returns IDs and URLs that can be passed to notion_read_page.",
        "Notion's search API matches titles only, not page bodies.",
      ].join(" "),
      inputSchema: {
        query: z
          .string()
          .optional()
          .describe("Title text to search for. Omit to list recently edited shared items."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(10)
          .describe("Maximum number of results (1-100, default 10)."),
        object: z
          .enum(["any", "page", "data_source"])
          .default("any")
          .describe("Restrict results to pages, data sources, or both."),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
      },
    },
    async ({ query, limit, object }) => {
      try {
        return textResult(
          await searchNotion(deps.notion, {
            query,
            limit: limit ?? 10,
            object: object ?? "any",
          }),
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
