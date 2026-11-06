import {
  APIResponseError,
  type Client,
  type PageMarkdownResponse,
  type PageObjectResponse,
} from "@notionhq/client";
import type { AppConfig } from "../config.js";
import { formatPageRead, formatSearchResults } from "./format.js";
import { normalizeNotionId } from "./ids.js";
import { UserFacingError } from "./errors.js";
import { buildCreatePageParams } from "./page-markdown.js";

export type SearchObject = "any" | "page" | "data_source";

export interface SearchNotionInput {
  query?: string;
  limit: number;
  object: SearchObject;
}

export async function searchNotion(
  notion: Client,
  input: SearchNotionInput,
): Promise<string> {
  const query = input.query?.trim();
  const response = await notion.search({
    ...(query ? { query } : {}),
    page_size: input.limit,
    sort: { direction: "descending", timestamp: "last_edited_time" },
    ...(input.object === "any"
      ? {}
      : { filter: { property: "object", value: input.object } }),
  });

  return formatSearchResults(response, { query });
}

export interface ReadNotionPageInput {
  page: string;
  includeContent: boolean;
  includeProperties: boolean;
  includeTranscript: boolean;
}

export async function readNotionPage(
  notion: Client,
  input: ReadNotionPageInput,
): Promise<string> {
  const pageId = normalizeNotionId(input.page);
  const page = (await notion.pages.retrieve({
    page_id: pageId,
  })) as PageObjectResponse;

  let markdown: PageMarkdownResponse | null = null;
  if (input.includeContent) {
    markdown = await notion.pages.retrieveMarkdown({
      page_id: pageId,
      markdown_version: "v2",
      include_transcript: input.includeTranscript,
    });
  }

  return formatPageRead({
    page,
    markdown,
    includeContent: input.includeContent,
    includeProperties: input.includeProperties,
  });
}

export interface CreateNotionPageInput {
  title: string;
  markdown?: string;
  parentPageId?: string;
  icon?: string;
}

export async function createNotionPage(
  notion: Client,
  config: AppConfig,
  input: CreateNotionPageInput,
): Promise<string> {
  const parentPageId = input.parentPageId
    ? normalizeNotionId(input.parentPageId)
    : config.defaultParentPageId;

  if (!parentPageId) {
    throw new UserFacingError(
      [
        "No parent page was provided and NOTION_PARENT_PAGE_ID is not set.",
        "Pass `parent_page_id` (a page URL or ID), or set NOTION_PARENT_PAGE_ID in .env to a shared inbox page.",
      ].join(" "),
    );
  }

  const payload = buildCreatePageParams({
    parentPageId,
    title: input.title,
    markdown: input.markdown,
    icon: input.icon,
  });

  let page;
  try {
    page = await notion.pages.create(payload.params);
  } catch (error) {
    if (
      error instanceof APIResponseError &&
      error.status === 400 &&
      /5,000 blocks|too large|too many blocks|block limit|payload too large/i.test(
        error.message,
      )
    ) {
      throw new UserFacingError(
        [
          "Notion could not create the page from this markdown.",
          error.message,
          "Try shortening the content, removing large tables or deeply nested blocks, or creating the page first and adding content in smaller pieces.",
        ].join(" "),
      );
    }
    throw error;
  }

  const pageId = page.id;
  const url =
    "url" in page && page.url
      ? page.url
      : `https://app.notion.com/p/${pageId}`;

  const lines = [
    `Created Notion page "${input.title}".`,
    "",
    `- **ID:** \`${pageId}\``,
    `- **URL:** ${url}`,
    `- **Parent:** \`${parentPageId}\``,
    payload.params.markdown
      ? `- **Content:** ${payload.bodyCharacters.toLocaleString()} characters of Notion-flavored Markdown (v2).`
      : "- **Content:** no body content.",
  ];

  if (payload.strippedTitleHeading) {
    lines.push(
      "- **Note:** the leading H1 matched the page title, so it was omitted from the body.",
    );
  }

  return lines.join("\n");
}
