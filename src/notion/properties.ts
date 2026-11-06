import type { PageObjectResponse, RichTextItemResponse } from "@notionhq/client";

type PageProperty = PageObjectResponse["properties"][string];

export function plainText(
  rich: RichTextItemResponse[] | null | undefined,
): string {
  if (!rich?.length) return "";
  return rich.map((item) => item.plain_text ?? "").join("");
}

export function getPageTitle(page: PageObjectResponse): string {
  const properties = page.properties ?? {};
  for (const value of Object.values(properties)) {
    if (value.type === "title") {
      return plainText(value.title).trim();
    }
  }
  return "";
}

/**
 * Renders a single Notion page property as compact markdown text.
 * Returns null for empty or unsupported values.
 */
export function renderPropertyValue(value: PageProperty): string | null {
  return renderValue(value as unknown as Record<string, unknown> & { type: string });
}

function renderValue(value: Record<string, unknown> & { type: string }): string | null {
  switch (value.type) {
    case "title":
      return plainText(value.title as RichTextItemResponse[]).trim() || null;
    case "rich_text":
      return plainText(value.rich_text as RichTextItemResponse[]).trim() || null;
    case "number":
      return value.number === null || value.number === undefined
        ? null
        : String(value.number);
    case "select":
      return (value.select as { name?: string } | null)?.name ?? null;
    case "multi_select": {
      const names = (value.multi_select as Array<{ name?: string }> | undefined)
        ?.map((option) => option.name)
        .filter((name): name is string => Boolean(name));
      return names?.length ? names.join(", ") : null;
    }
    case "status":
      return (value.status as { name?: string } | null)?.name ?? null;
    case "date":
      return formatDate(value.date as { start?: string; end?: string | null } | null);
    case "people": {
      const names = (value.people as Array<{ name?: string; id?: string }> | undefined)
        ?.map(userLabel)
        .filter((name): name is string => Boolean(name));
      return names?.length ? names.join(", ") : null;
    }
    case "files": {
      const files = value.files as Array<{ name?: string; url?: string }> | undefined;
      const names = files
        ?.map((file) => file.name || file.url)
        .filter((name): name is string => Boolean(name));
      return names?.length ? names.join(", ") : null;
    }
    case "checkbox":
      return value.checkbox === true ? "Yes" : "No";
    case "url":
      return (value.url as string | null) || null;
    case "email":
      return (value.email as string | null) || null;
    case "phone_number":
      return (value.phone_number as string | null) || null;
    case "formula":
      return renderFormula(value.formula as Record<string, unknown> & { type: string });
    case "relation": {
      const ids = (value.relation as Array<{ id?: string }> | undefined)
        ?.map((item) => item.id)
        .filter((id): id is string => Boolean(id));
      return ids?.length ? ids.join(", ") : null;
    }
    case "rollup":
      return renderRollup(value.rollup as Record<string, unknown> & { type: string });
    case "unique_id": {
      const unique = value.unique_id as { prefix?: string | null; number?: number | null } | undefined;
      if (!unique?.number && unique?.number !== 0) return unique?.prefix ?? null;
      return unique.prefix ? `${unique.prefix}-${unique.number}` : String(unique.number);
    }
    case "created_time":
      return (value.created_time as string | null) ?? null;
    case "last_edited_time":
      return (value.last_edited_time as string | null) ?? null;
    case "created_by":
      return userLabel(value.created_by as { name?: string; id?: string });
    case "last_edited_by":
      return userLabel(value.last_edited_by as { name?: string; id?: string });
    case "verification": {
      const verification = value.verification as
        | { state?: string; date?: { start?: string } | null }
        | null;
      if (!verification?.state) return null;
      return verification.date?.start
        ? `${verification.state} (${verification.date.start})`
        : verification.state;
    }
    case "place": {
      const place = value.place as
        | { name?: string | null; address?: string | null; lat?: number; lon?: number }
        | null;
      if (!place) return null;
      return place.name || place.address || `${place.lat ?? "?"}, ${place.lon ?? "?"}`;
    }
    case "button":
      return null;
    default:
      return null;
  }
}

function renderFormula(formula: Record<string, unknown> & { type: string }): string | null {
  switch (formula.type) {
    case "string":
      return (formula.string as string | null) || null;
    case "number":
      return formula.number === null || formula.number === undefined
        ? null
        : String(formula.number);
    case "boolean":
      return formula.boolean === null || formula.boolean === undefined
        ? null
        : formula.boolean
          ? "Yes"
          : "No";
    case "date":
      return formatDate(formula.date as { start?: string; end?: string | null } | null);
    default:
      return null;
  }
}

function renderRollup(rollup: Record<string, unknown> & { type: string }): string | null {
  switch (rollup.type) {
    case "number":
      return rollup.number === null || rollup.number === undefined
        ? null
        : String(rollup.number);
    case "date":
      return formatDate(rollup.date as { start?: string; end?: string | null } | null);
    case "array": {
      const items = (rollup.array as Array<Record<string, unknown> & { type: string }> | undefined)
        ?.map((item) => renderValue(item))
        .filter((item): item is string => Boolean(item));
      return items?.length ? items.join("; ") : null;
    }
    default:
      return null;
  }
}

function formatDate(date: { start?: string; end?: string | null } | null): string | null {
  if (!date?.start) return null;
  return date.end ? `${date.start} → ${date.end}` : date.start;
}

function userLabel(user: { name?: string; id?: string } | null | undefined): string | null {
  if (!user) return null;
  return user.name || user.id || null;
}

/** Renders all non-title properties as `- **Name:** value` lines. */
export function renderPageProperties(page: PageObjectResponse): string[] {
  const lines: string[] = [];
  for (const [name, value] of Object.entries(page.properties ?? {})) {
    if (value.type === "title") continue;
    const rendered = renderPropertyValue(value);
    if (!rendered) continue;
    lines.push(`- **${name}:** ${oneLine(rendered)}`);
  }
  return lines;
}

export function formatParent(parent: PageObjectResponse["parent"] | undefined): string {
  if (!parent) return "unknown";
  switch (parent.type) {
    case "page_id":
      return `page_id \`${parent.page_id}\``;
    case "database_id":
      return `database_id \`${parent.database_id}\``;
    case "data_source_id":
      return `data_source_id \`${parent.data_source_id}\``;
    case "block_id":
      return `block_id \`${parent.block_id}\``;
    case "workspace":
      return "workspace";
    default:
      return "unknown";
  }
}

export function oneLine(text: string): string {
  return text.replace(/\s*\n+\s*/g, " ").trim();
}
