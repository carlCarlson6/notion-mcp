import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServerDeps } from "../deps.js";
import { createNotionPage } from "../notion/service.js";
import { errorResult, textResult } from "./result.js";

export function registerCreatePageTool(server: McpServer, deps: ServerDeps): void {
  server.registerTool(
    "notion_create_page",
    {
      title: "Create Notion page",
      description: [
        "Create a new Notion page with a title and optional body.",
        "The body is written as Notion-flavored Markdown (v2): headings, lists, to-dos, quotes, code fences, tables, images, and Notion block tags are supported.",
        "If parent_page_id is omitted, the page is created under NOTION_PARENT_PAGE_ID (the configured inbox).",
        "This tool only creates content; it never deletes or archives anything.",
      ].join(" "),
      inputSchema: {
        title: z
          .string()
          .min(1)
          .max(2000)
          .describe("Page title (1-2000 characters)."),
        markdown: z
          .string()
          .max(500_000)
          .optional()
          .describe(
            "Optional page body in Notion-flavored Markdown (v2). Separate blocks with blank lines. Notion rejects content that would create more than 5,000 blocks.",
          ),
        parent_page_id: z
          .string()
          .optional()
          .describe(
            "Optional parent page URL or ID. Falls back to NOTION_PARENT_PAGE_ID. The parent must be shared with the integration.",
          ),
        icon: z
          .string()
          .min(1)
          .max(16)
          .optional()
          .describe("Optional emoji to use as the page icon."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ title, markdown, parent_page_id, icon }) => {
      try {
        return textResult(
          await createNotionPage(deps.notion, deps.config, {
            title,
            markdown,
            parentPageId: parent_page_id,
            icon,
          }),
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
