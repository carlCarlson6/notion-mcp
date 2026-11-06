import type {
  PageMarkdownResponse,
  PageObjectResponse,
  SearchResponse,
} from "@notionhq/client";
import {
  formatParent,
  getPageTitle,
  oneLine,
  plainText,
  renderPageProperties,
} from "./properties.js";

export interface FormatSearchOptions {
  query?: string;
}

export function formatSearchResults(
  response: SearchResponse,
  options: FormatSearchOptions = {},
): string {
  const results = response.results ?? [];
  const queryLabel = options.query?.trim()
    ? ` for "${options.query.trim()}"`
    : "";

  if (results.length === 0) {
    return [
      `No Notion results${queryLabel}.`,
      "",
      "Reminder: the integration only sees pages and data sources that were explicitly shared with it.",
      "Open the page in Notion → ••• → Connections → add your integration, then retry.",
    ].join("\n");
  }

  const lines: string[] = [
    `Found ${results.length} result${results.length === 1 ? "" : "s"}${queryLabel}.`,
    "",
  ];

  results.forEach((result, index) => {
    lines.push(`${index + 1}. ${formatSearchResult(result)}`);
  });

  if (response.has_more) {
    lines.push(
      "",
      "More results are available. Raise `limit` or make the query more specific.",
    );
  }

  return lines.join("\n");
}

function formatSearchResult(result: SearchResponse["results"][number]): string {
  if (result.object === "page") {
    const page = result as PageObjectResponse;
    const title = page.properties ? getPageTitle(page) || "(untitled)" : "(untitled)";
    const details = [
      `id: \`${result.id}\``,
      "url" in page && page.url ? `url: ${page.url}` : null,
      "last_edited_time" in page ? `last edited: ${page.last_edited_time}` : null,
      "parent" in page && page.parent ? `parent: ${formatParent(page.parent)}` : null,
    ].filter(Boolean);

    return [`**${oneLine(title)}** — page`, ...details.map((line) => `   ${line}`)].join(
      "\n",
    );
  }

  if (result.object === "data_source") {
    const title = "title" in result ? plainText(result.title).trim() : "";
    const details = [
      `id: \`${result.id}\``,
      "url" in result && result.url ? `url: ${result.url}` : null,
      "last_edited_time" in result
        ? `last edited: ${result.last_edited_time}`
        : null,
    ].filter(Boolean);

    return [
      `**${oneLine(title || "(untitled)")}** — data source`,
      ...details.map((line) => `   ${line}`),
    ].join("\n");
  }

  const unknown = result as { id?: string };
  return `**Unknown result** — \`${unknown.id ?? "unknown"}\``;
}

export interface FormatPageReadInput {
  page: PageObjectResponse;
  markdown: PageMarkdownResponse | null;
  includeContent: boolean;
  includeProperties: boolean;
}

export function formatPageRead(input: FormatPageReadInput): string {
  const { page, markdown, includeContent, includeProperties } = input;
  const title = getPageTitle(page) || "(untitled)";
  const lines: string[] = [`# ${oneLine(title)}`, ""];

  lines.push(`- **ID:** \`${page.id}\``);
  lines.push(
    `- **URL:** ${"url" in page && page.url ? page.url : `https://app.notion.com/p/${page.id}`}`,
  );
  if ("created_time" in page) lines.push(`- **Created:** ${page.created_time}`);
  if ("last_edited_time" in page) {
    lines.push(`- **Last edited:** ${page.last_edited_time}`);
  }
  if ("parent" in page && page.parent) {
    lines.push(`- **Parent:** ${formatParent(page.parent)}`);
  }
  if ("in_trash" in page && page.in_trash) {
    lines.push("- **In trash:** yes");
  }

  if (includeProperties && "properties" in page) {
    const properties = renderPageProperties(page);
    if (properties.length > 0) {
      lines.push("", "## Properties", "", ...properties);
    }
  }

  if (includeContent) {
    lines.push("", "## Content", "");
    const content = markdown?.markdown?.trim();
    lines.push(content ? content : "_(This page has no content.)_");

    if (markdown?.truncated) {
      lines.push(
        "",
        "> **Truncated:** Notion returned only part of this page (very large page, or some child content is not shared with the integration).",
      );
      if (markdown.unknown_block_ids.length > 0) {
        lines.push(
          `> ${markdown.unknown_block_ids.length} block(s) could not be loaded. Read the relevant child page directly, or open the page in Notion.`,
        );
      }
    }

    if (markdown?.warnings?.length) {
      lines.push("", "> **Notion warnings:**");
      for (const warning of markdown.warnings) {
        lines.push(`> - ${warning.code}: ${warning.message}`);
      }
    }
  }

  return lines.join("\n");
}
