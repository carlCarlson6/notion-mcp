#!/usr/bin/env node
import { Client } from "@notionhq/client";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { createServer, SERVER_NAME, SERVER_VERSION } from "./server.js";
import { describeError } from "./notion/errors.js";
import { log } from "./logger.js";

async function main(): Promise<void> {
  const config = loadConfig();

  const notion = new Client({
    auth: config.notionToken,
    notionVersion: config.notionVersion,
    retry: {
      maxRetries: 3,
      initialRetryDelayMs: 500,
      maxRetryDelayMs: 8_000,
    },
  });

  const server = createServer({ notion, config });
  const transport = new StdioServerTransport();
  await server.connect(transport);

  log(
    "info",
    `${SERVER_NAME} v${SERVER_VERSION} ready (Notion API ${config.notionVersion}; default parent ${
      config.defaultParentPageId ? "configured" : "not configured"
    })`,
  );

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log("info", `received ${signal}, shutting down`);
    try {
      await server.close();
    } finally {
      process.exit(0);
    }
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error) => {
  log("error", describeError(error));
  process.exit(1);
});
