import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { toolError } from "../notion/errors.js";

export function textResult(text: string): CallToolResult {
  return {
    content: [{ type: "text", text }],
  };
}

export function errorResult(error: unknown): CallToolResult {
  const { content } = toolError(error);
  return { isError: true, content };
}
