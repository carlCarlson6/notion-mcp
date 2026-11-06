import { Client } from "@notionhq/client";
import { loadConfig } from "../src/config.js";
import { describeError } from "../src/notion/errors.js";
import { log } from "../src/logger.js";

async function main(): Promise<void> {
  const config = loadConfig();

  if (!config.defaultParentPageId) {
    throw new Error(
      "NOTION_PARENT_PAGE_ID is not set. Create an MCP Inbox page, share it with the integration, and paste its URL into .env.",
    );
  }

  const notion = new Client({
    auth: config.notionToken,
    notionVersion: config.notionVersion,
    retry: { maxRetries: 2, initialRetryDelayMs: 500 },
  });

  log("info", "Searching for shared pages…");
  const search = await notion.search({
    query: process.env.SMOKE_QUERY ?? "MCP",
    page_size: 5,
    filter: { property: "object", value: "page" },
  });
  console.log(`Search returned ${search.results.length} page(s).`);

  log("info", "Reading the configured parent page…");
  const parent = await notion.pages.retrieve({
    page_id: config.defaultParentPageId,
  });
  if (!("properties" in parent)) {
    throw new Error("The parent page response was partial; retry the smoke test.");
  }
  console.log(`Parent page: ${parent.url}`);

  const title = `MCP smoke test ${new Date().toISOString()}`;
  log("info", "Creating a test page with Notion-flavored Markdown…");
  const page = await notion.pages.create({
    parent: { type: "page_id", page_id: config.defaultParentPageId },
    properties: {
      title: {
        type: "title",
        title: [{ type: "text", text: { content: title } }],
      },
    },
    markdown: [
      "# Smoke test",
      "",
      "This page was created by the local notion-mcp smoke test.",
      "",
      "- [x] Create a page",
      "- [x] Write markdown",
      "- [ ] Delete this page when done",
      "",
      "```ts",
      'console.log("hello from notion-mcp");',
      "```",
    ].join("\n"),
    markdown_version: "v2",
  });

  const url =
    "url" in page && page.url
      ? page.url
      : `https://app.notion.com/p/${page.id}`;
  console.log(`Created page: ${url}`);

  log("info", "Reading the new page back as markdown…");
  const readback = await notion.pages.retrieveMarkdown({
    page_id: page.id,
    markdown_version: "v2",
  });
  console.log("--- readback ---");
  console.log(readback.markdown.slice(0, 2_000));
  console.log("--- end readback ---");
  console.log("Smoke test passed. Delete the test page from Notion when done.");
}

main().catch((error) => {
  console.error(`Smoke test failed: ${describeError(error)}`);
  process.exit(1);
});
