import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServerDeps } from "../deps.js";
import { readNotionPage } from "../notion/service.js";
import { errorResult, textResult } from "./result.js";

export function registerReadPageTool(server: McpServer, deps: ServerDeps): void {
  server.registerTool(
    "notion_read_page",
    {
      title: "Read Notion page",
      description: [
        "Read a Notion page by URL or ID.",
        "Returns page metadata, properties, and body content as Notion-flavored Markdown (v2).",
        "The page must be shared with the integration.",
      ].join(" "),
      inputSchema: {
        page: z
          .string()
          .min(1)
          .describe("Notion page URL or 32-character page ID."),
        include_content: z
          .boolean()
          .default(true)
          .describe("Include the page body as markdown (default true)."),
        include_properties: z
          .boolean()
          .default(true)
          .describe("Include property values such as status, dates, and people (default true)."),
        include_transcript: z
          .boolean()
          .default(false)
          .describe("Include meeting-note transcripts when present (default false)."),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
      },
    },
    async ({ page, include_content, include_properties, include_transcript }) => {
      try {
        return textResult(
          await readNotionPage(deps.notion, {
            page,
            includeContent: include_content ?? true,
            includeProperties: include_properties ?? true,
            includeTranscript: include_transcript ?? false,
          }),
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
