import { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { Client } from "@notionhq/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppConfig } from "../src/config.js";
import { createServer } from "../src/server.js";
import { makePage, makeSearchResponse } from "./fixtures.js";

const config: AppConfig = {
  notionToken: "ntn_test",
  defaultParentPageId: "11111111-1111-1111-1111-111111111111",
  notionVersion: "2026-03-11",
};

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) {
    await cleanup();
  }
});

async function connect(notion: Client) {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const server = createServer({ notion, config });
  await server.connect(serverTransport);

  const client = new McpClient({ name: "test-client", version: "1.0.0" });
  await client.connect(clientTransport);

  cleanups.push(async () => {
    await client.close();
    await server.close();
  });

  return client;
}

describe("MCP server", () => {
  it("registers the three v1 tools with read-only/destructive hints", async () => {
    const notion = {} as Client;
    const client = await connect(notion);

    const { tools } = await client.listTools();
    const byName = new Map(tools.map((tool) => [tool.name, tool]));

    expect([...byName.keys()].sort()).toEqual([
      "notion_create_page",
      "notion_read_page",
      "notion_search",
    ]);
    expect(byName.get("notion_search")?.annotations?.readOnlyHint).toBe(true);
    expect(byName.get("notion_read_page")?.annotations?.readOnlyHint).toBe(true);
    expect(byName.get("notion_create_page")?.annotations?.readOnlyHint).toBe(
      false,
    );
    expect(
      byName.get("notion_create_page")?.annotations?.destructiveHint,
    ).toBe(false);
  });

  it("calls notion_search over the MCP protocol", async () => {
    const search = vi.fn().mockResolvedValue(makeSearchResponse([makePage()]));
    const notion = { search } as unknown as Client;
    const client = await connect(notion);

    const result = await client.callTool({
      name: "notion_search",
      arguments: { query: "Alpha", limit: 5 },
    });

    expect(result.isError).not.toBe(true);
    expect(result.content).toEqual([
      expect.objectContaining({
        type: "text",
        text: expect.stringContaining("Project Alpha"),
      }),
    ]);
  });

  it("returns tool errors as content instead of throwing", async () => {
    const search = vi.fn().mockRejectedValue(new Error("backend exploded"));
    const notion = { search } as unknown as Client;
    const client = await connect(notion);

    const result = await client.callTool({
      name: "notion_search",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      expect.objectContaining({
        type: "text",
        text: expect.stringContaining("backend exploded"),
      }),
    ]);
  });
});
