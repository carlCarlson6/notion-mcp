import type {
  PageObjectResponse,
  RichTextItemResponse,
  SearchResponse,
} from "@notionhq/client";

export function richText(text: string): RichTextItemResponse {
  return {
    type: "text",
    plain_text: text,
    href: null,
    annotations: {
      bold: false,
      italic: false,
      strikethrough: false,
      underline: false,
      code: false,
      color: "default",
    },
    text: { content: text, link: null },
  } as RichTextItemResponse;
}

export function makePage(
  overrides: Partial<PageObjectResponse> = {},
): PageObjectResponse {
  return {
    object: "page",
    id: "11111111-1111-1111-1111-111111111111",
    created_time: "2026-01-01T00:00:00.000Z",
    last_edited_time: "2026-01-02T00:00:00.000Z",
    in_trash: false,
    is_archived: false,
    is_locked: false,
    url: "https://app.notion.com/p/11111111111111111111111111111111",
    public_url: null,
    parent: {
      type: "page_id",
      page_id: "22222222-2222-2222-2222-222222222222",
    },
    properties: {
      Name: {
        id: "title",
        type: "title",
        title: [richText("Project Alpha")],
      },
      Status: {
        id: "status",
        type: "status",
        status: { id: "s1", name: "In progress", color: "blue" },
      },
      Tags: {
        id: "tags",
        type: "multi_select",
        multi_select: [
          { id: "t1", name: "personal", color: "green" },
          { id: "t2", name: "mcp", color: "purple" },
        ],
      },
      Due: {
        id: "due",
        type: "date",
        date: { start: "2026-11-01", end: null, time_zone: null },
      },
      Done: {
        id: "done",
        type: "checkbox",
        checkbox: false,
      },
      Owner: {
        id: "owner",
        type: "people",
        people: [{ object: "user", id: "user-1", name: "Ada" }],
      },
      Score: {
        id: "score",
        type: "formula",
        formula: { type: "number", number: 42 },
      },
      Estimate: {
        id: "estimate",
        type: "rollup",
        rollup: { type: "number", number: 3, function: "sum" },
      },
      Empty: {
        id: "empty",
        type: "rich_text",
        rich_text: [],
      },
    },
    icon: null,
    cover: null,
    created_by: { object: "user", id: "user-1" },
    last_edited_by: { object: "user", id: "user-1" },
    ...overrides,
  } as PageObjectResponse;
}

export function makeSearchResponse(
  results: SearchResponse["results"],
  hasMore = false,
): SearchResponse {
  return {
    object: "list",
    type: "page_or_data_source",
    page_or_data_source: {},
    results,
    next_cursor: hasMore ? "cursor-2" : null,
    has_more: hasMore,
  } as SearchResponse;
}
