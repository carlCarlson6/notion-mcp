# notion-mcp

A local [Model Context Protocol](https://modelcontextprotocol.io) server for your personal Notion workspace. Built from scratch for learning and full control over tool behavior.

It talks to the Notion API directly over stdio and exposes three tools to OpenCode (or any MCP client):

| Tool | What it does |
| --- | --- |
| `notion_search` | Search pages and data sources **by title** |
| `notion_read_page` | Read page metadata, properties, and body as markdown |
| `notion_create_page` | Create a page with markdown under a parent page |

Writes are additive only. There is no delete, archive, schema, or property-update tool.

## Why native markdown?

The current Notion API (`2026-03-11`) can create and read page content as [Notion-flavored Markdown v2](https://developers.notion.com/guides/data-apis/notion-flavored-markdown). This server uses those endpoints instead of reimplementing Notion's block model. Benefits:

- One API call to read a page instead of walking every block and sub-block.
- Tables, nested lists, callouts, synced blocks, and child-page markers come back correctly.
- No 100-block append chunking on create.
- Notion tells us when content was truncated (`truncated`, `unknown_block_ids`).

The trade-off: the server hands Notion native markdown rather than a bespoke block dialect. The tool boundary is still fully ours.

## Requirements

- Node.js **22+** (developed on 26.5)
- A Notion **internal integration** token

## Setup

### 1. Create the Notion integration

1. Open <https://www.notion.so/my-integrations> and create a new **internal** integration.
2. Enable content capabilities: **Read content**, **Insert content**, and **Update content**.
3. Copy the token (starts with `ntn_`).

### 2. Create and share an inbox page

1. Create a normal Notion page, for example **MCP Inbox**.
2. Open it → `•••` → **Connections** → add your integration.
3. Copy the full page URL. This is your default parent for new pages.

The integration can only see content explicitly shared with it. Sharing a parent page does **not** automatically share every nested page if page-level permissions differ.

### 3. Configure the server

```bash
cp .env.example .env
chmod 600 .env
```

Edit `.env`:

```dotenv
NOTION_TOKEN=ntn_...
NOTION_PARENT_PAGE_ID=https://www.notion.so/MCP-Inbox-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

`NOTION_PARENT_PAGE_ID` is optional, but without it `notion_create_page` requires an explicit `parent_page_id`.

### 4. Install, build, and test

```bash
npm install
npm run build
npm test
```

### 5. Live smoke test

```bash
npm run smoke
```

This searches your shared pages, reads the parent, creates a page titled `MCP smoke test <timestamp>`, and reads it back as markdown. It prints the page URL. The test page is not deleted automatically.

## Register with OpenCode

Add the server to your global OpenCode config (`~/.config/opencode/opencode.json`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "notion": {
      "type": "local",
      "command": ["node", "/Users/a.d./DEV/notionmcp/dist/index.js"],
      "enabled": true
    }
  }
}
```

The server loads `.env` relative to its own location, so it does not depend on the working directory and no secrets go into the OpenCode config. Restart OpenCode after changing the config.

Then ask, for example:

- "Search my Notion for project alpha and summarize it."
- "Read the page at <URL> and list the open action items."
- "Create a page called Weekly Review with these notes…"

## Development

```bash
npm run dev        # run from TypeScript via tsx
npm run build      # compile to dist/
npm start          # run the compiled server
npm test           # vitest unit suite
npm run inspector  # MCP Inspector against dist/
```

Inspect tools manually:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## Tool reference

### `notion_search`

| Argument | Type | Default | Notes |
| --- | --- | --- | --- |
| `query` | string | — | Title text. Omit to list recently edited shared items. |
| `limit` | number | `10` | 1–100 |
| `object` | `any` \| `page` \| `data_source` | `any` | Filter result type |

Search matches **titles only**; Notion's API does not index page bodies. Use `notion_read_page` for content.

### `notion_read_page`

| Argument | Type | Default | Notes |
| --- | --- | --- | --- |
| `page` | string | — | Page URL or 32-character ID |
| `include_content` | boolean | `true` | Fetch body as markdown v2 |
| `include_properties` | boolean | `true` | Render status, dates, people, etc. |
| `include_transcript` | boolean | `false` | Include meeting-note transcripts |

Output includes the title, ID, URL, timestamps, parent, properties, and content. If Notion truncates a very large page, the response says so and reports how many blocks were unavailable.

### `notion_create_page`

| Argument | Type | Default | Notes |
| --- | --- | --- | --- |
| `title` | string | — | 1–2000 characters |
| `markdown` | string | — | Notion-flavored Markdown v2 |
| `parent_page_id` | string | `NOTION_PARENT_PAGE_ID` | Page URL or ID |
| `icon` | string | — | Emoji |

If the markdown starts with an H1 that exactly matches `title`, the duplicate heading is dropped from the body. Notion rejects content that would create more than 5,000 blocks; the tool returns guidance in that case.

## Markdown support

The body is passed to Notion as **Notion-flavored Markdown v2**. Typical content works as expected:

````markdown
# Heading

Paragraph with **bold**, *italic*, `inline code`, and [a link](https://example.com).

- Bullet
  - Nested bullet
- [ ] To-do
- [x] Done

> Quote

```ts
console.log("fenced code");
```

| Column A | Column B |
| --- | --- |
| value | value |
````

Notion-specific tags (`<callout>`, `<toggle>`, `<columns>`, `<page>`, etc.) are also accepted. See the [format reference](https://developers.notion.com/guides/data-apis/notion-flavored-markdown).

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| 401 unauthorized | Re-copy `NOTION_TOKEN`; it may be revoked or malformed |
| 404 object_not_found | Share the page/database with the integration (`•••` → Connections) |
| 403 restricted_resource | Enable Read/Insert/Update content on the integration |
| 429 rate_limited | Wait and retry; the SDK already retries with backoff |
| `NOTION_TOKEN is not set` | `.env` is missing or in the wrong directory |
| `NOTION_PARENT_PAGE_ID is not valid` | Paste the full page URL or 32-character ID |
| Create fails with 5,000 blocks | Split content across pages or reduce nested blocks |
| Search finds nothing | API search is title-only, and only shared content is visible |

Logs go to **stderr** only, because stdout is reserved for MCP JSON-RPC. The token is never logged.

## Project layout

```
src/
  index.ts              stdio entry point + shutdown handling
  server.ts             MCP server and tool registration
  config.ts             .env loading and validation
  deps.ts               injected Notion client + config
  logger.ts             stderr-only logging
  notion/
    service.ts          search / read / create handlers
    format.ts           markdown formatting for tool output
    properties.ts       Notion property rendering
    page-markdown.ts    create payload + duplicate-H1 handling
    ids.ts              URL/ID normalization
    errors.ts           actionable error messages
  tools/                MCP tool schemas and annotations
test/                   vitest unit + mocked API tests
scripts/smoke.ts        live end-to-end check
```

## Security notes

- `.env` is gitignored; keep it `chmod 600`.
- The server has no OAuth flow and no network listener. It is a child process over stdio.
- Never paste the integration token into a chat. Put it directly in `.env`.
- A leaked token can read and write everything shared with the integration; revoke it in Notion if exposed.

## Non-goals (v1)

Remote HTTP transport, OAuth, database query/mutation tools, comments, file uploads, archive/delete, webhooks, and full-text body search.
