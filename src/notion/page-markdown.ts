import type { CreatePageParameters } from "@notionhq/client";

export interface BuildCreatePageInput {
  parentPageId: string;
  title: string;
  markdown?: string;
  icon?: string;
}

export interface CreatePagePayload {
  params: CreatePageParameters;
  strippedTitleHeading: boolean;
  bodyCharacters: number;
}

export function normalizeMarkdown(markdown: string): string {
  return markdown
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/^\n+/, "")
    .replace(/\n+$/, "");
}

/**
 * When we set an explicit page title AND the body starts with the same H1,
 * Notion would render the title twice. Drop the duplicate heading.
 */
export function stripLeadingTitleHeading(
  markdown: string,
  title: string,
): { markdown: string; stripped: boolean } {
  const normalized = normalizeMarkdown(markdown);
  const lines = normalized.split("\n");

  let firstContentLine = 0;
  while (firstContentLine < lines.length && lines[firstContentLine].trim() === "") {
    firstContentLine += 1;
  }
  if (firstContentLine >= lines.length) {
    return { markdown: normalized, stripped: false };
  }

  const match = lines[firstContentLine].match(/^\s*#\s+(.+?)\s*#*\s*$/);
  if (!match || match[1].trim() !== title.trim()) {
    return { markdown: normalized, stripped: false };
  }

  const rest = lines.slice(firstContentLine + 1);
  while (rest.length > 0 && rest[0].trim() === "") rest.shift();

  return {
    markdown: rest.join("\n").replace(/\n+$/, ""),
    stripped: true,
  };
}

export function buildCreatePageParams(input: BuildCreatePageInput): CreatePagePayload {
  const params: CreatePageParameters = {
    parent: {
      type: "page_id",
      page_id: input.parentPageId,
    },
    properties: {
      title: {
        type: "title",
        title: [{ type: "text", text: { content: input.title } }],
      },
    },
  };

  if (input.icon) {
    params.icon = { type: "emoji", emoji: input.icon };
  }

  const stripped = stripLeadingTitleHeading(input.markdown ?? "", input.title);
  const content = stripped.markdown;
  const hasContent = content.trim().length > 0;

  if (hasContent) {
    params.markdown = content;
    params.markdown_version = "v2";
  }

  return {
    params,
    strippedTitleHeading: stripped.stripped,
    bodyCharacters: hasContent ? content.length : 0,
  };
}
