import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServerDeps } from "./deps.js";
import { registerCreatePageTool } from "./tools/create-page.js";
import { registerReadPageTool } from "./tools/read-page.js";
import { registerSearchTool } from "./tools/search.js";

export const SERVER_NAME = "notion-mcp";
export const SERVER_VERSION = "0.1.0";

export function createServer(deps: ServerDeps): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  registerSearchTool(server, deps);
  registerReadPageTool(server, deps);
  registerCreatePageTool(server, deps);

  return server;
}
