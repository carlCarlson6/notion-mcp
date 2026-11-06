const PREFIX = "[notion-mcp]";

export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * MCP servers must never write to stdout: it carries JSON-RPC frames.
 * All diagnostics go to stderr.
 */
export function log(level: LogLevel, message: string, details?: unknown): void {
  const line = `${PREFIX} ${level.toUpperCase()} ${message}`;
  if (details === undefined) {
    console.error(line);
  } else {
    console.error(line, details);
  }
}
