import { APIErrorCode, APIResponseError, type Client } from "@notionhq/client";
import { describe, expect, it, vi } from "vitest";
import type { AppConfig } from "../src/config.js";
import { UserFacingError } from "../src/notion/errors.js";
import {
  createNotionPage,
  readNotionPage,
  searchNotion,
} from "../src/notion/service.js";
import { makePage, makeSearchResponse } from "./fixtures.js";

const PARENT = "11111111-1111-1111-1111-111111111111";
const OTHER_PARENT = "22222222-2222-2222-2222-222222222222";

const config: AppConfig = {
  notionToken: "ntn_test",
  defaultParentPageId: PARENT,
  notionVersion: "2026-03-11",
};

describe("searchNotion", () => {
  it("searches by title and formats page results", async () => {
    const search = vi.fn().mockResolvedValue(makeSearchResponse([makePage()]));
    const notion = { search } as unknown as Client;

    const text = await searchNotion(notion, {
      query: "Alpha",
      limit: 5,
      object: "page",
    });

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "Alpha",
        page_size: 5,
        filter: { property: "object", value: "page" },
        sort: { direction: "descending", timestamp: "last_edited_time" },
      }),
    );
    expect(text).toContain("Project Alpha");
    expect(text).toContain("11111111-1111-1111-1111-111111111111");
  });

  it("omits the query and filter when not provided", async () => {
    const search = vi.fn().mockResolvedValue(makeSearchResponse([]));
    const notion = { search } as unknown as Client;

    const text = await searchNotion(notion, {
      query: "  ",
      limit: 10,
      object: "any",
    });

    const args = search.mock.calls[0][0];
    expect(args).not.toHaveProperty("query");
    expect(args).not.toHaveProperty("filter");
    expect(text).toContain("No Notion results");
    expect(text).toContain("shared with it");
  });

  it("notes when more results are available", async () => {
    const search = vi
      .fn()
      .mockResolvedValue(makeSearchResponse([makePage()], true));
    const notion = { search } as unknown as Client;

    const text = await searchNotion(notion, {
      limit: 1,
      object: "any",
    });

    expect(text).toContain("More results are available");
  });
});

describe("readNotionPage", () => {
  it("reads metadata, properties, and markdown content", async () => {
    const retrieve = vi.fn().mockResolvedValue(makePage());
    const retrieveMarkdown = vi.fn().mockResolvedValue({
      object: "page_markdown",
      id: PARENT,
      markdown: "## Notes\n\nHello from Notion.",
      truncated: true,
      unknown_block_ids: ["block-1"],
      warnings: [{ code: "unsupported_tag", message: "Ignored a tag." }],
    });
    const notion = {
      pages: { retrieve, retrieveMarkdown },
    } as unknown as Client;

    const text = await readNotionPage(notion, {
      page: "https://app.notion.com/p/11111111111111111111111111111111",
      includeContent: true,
      includeProperties: true,
      includeTranscript: false,
    });

    expect(retrieve).toHaveBeenCalledWith({ page_id: PARENT });
    expect(retrieveMarkdown).toHaveBeenCalledWith({
      page_id: PARENT,
      markdown_version: "v2",
      include_transcript: false,
    });
    expect(text).toContain("# Project Alpha");
    expect(text).toContain("## Properties");
    expect(text).toContain("- **Status:** In progress");
    expect(text).toContain("## Notes");
    expect(text).toContain("Hello from Notion.");
    expect(text).toContain("Truncated");
    expect(text).toContain("unsupported_tag");
  });

  it("skips content when includeContent is false", async () => {
    const retrieve = vi.fn().mockResolvedValue(makePage());
    const retrieveMarkdown = vi.fn();
    const notion = {
      pages: { retrieve, retrieveMarkdown },
    } as unknown as Client;

    const text = await readNotionPage(notion, {
      page: PARENT,
      includeContent: false,
      includeProperties: true,
      includeTranscript: false,
    });

    expect(retrieveMarkdown).not.toHaveBeenCalled();
    expect(text).not.toContain("## Content");
    expect(text).toContain("## Properties");
  });
});

describe("createNotionPage", () => {
  it("creates a page under the configured inbox and strips a duplicate H1", async () => {
    const create = vi.fn().mockResolvedValue({
      object: "page",
      id: "page-1",
      url: "https://app.notion.com/p/page-1",
    });
    const notion = { pages: { create } } as unknown as Client;

    const text = await createNotionPage(notion, config, {
      title: "Hello",
      markdown: "# Hello\n\nBody",
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        parent: { type: "page_id", page_id: PARENT },
        markdown: "Body",
        markdown_version: "v2",
      }),
    );
    expect(text).toContain('Created Notion page "Hello"');
    expect(text).toContain("https://app.notion.com/p/page-1");
    expect(text).toContain("omitted from the body");
  });

  it("uses an explicit parent override and normalizes the URL", async () => {
    const create = vi.fn().mockResolvedValue({
      object: "page",
      id: "page-2",
      url: "https://app.notion.com/p/page-2",
    });
    const notion = { pages: { create } } as unknown as Client;

    await createNotionPage(notion, config, {
      title: "Override",
      parentPageId:
        "https://app.notion.com/p/22222222222222222222222222222222",
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        parent: { type: "page_id", page_id: OTHER_PARENT },
      }),
    );
  });

  it("fails clearly when no parent is configured or provided", async () => {
    const notion = {
      pages: { create: vi.fn() },
    } as unknown as Client;

    await expect(
      createNotionPage(
        notion,
        { ...config, defaultParentPageId: null },
        { title: "No parent" },
      ),
    ).rejects.toBeInstanceOf(UserFacingError);
  });

  it("adds guidance when Notion rejects oversized markdown", async () => {
    const create = vi.fn().mockRejectedValue(
      new APIResponseError({
        code: APIErrorCode.ValidationError,
        status: 400,
        message: "Content would create more than 5,000 blocks.",
        headers: {},
        rawBodyText: "",
        additional_data: undefined,
        request_id: "req-large",
      }),
    );
    const notion = { pages: { create } } as unknown as Client;

    await expect(
      createNotionPage(notion, config, {
        title: "Large",
        markdown: "large content",
      }),
    ).rejects.toThrow(/shortening the content/i);
  });
});
