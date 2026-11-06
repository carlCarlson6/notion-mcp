import { describe, expect, it } from "vitest";
import {
  buildCreatePageParams,
  normalizeMarkdown,
  stripLeadingTitleHeading,
} from "../src/notion/page-markdown.js";

const PARENT = "11111111-1111-1111-1111-111111111111";

describe("normalizeMarkdown", () => {
  it("normalizes CRLF and strips surrounding blank lines", () => {
    expect(normalizeMarkdown("\uFEFF\r\n\r\n# Hello\r\nBody\r\n\r\n")).toBe(
      "# Hello\nBody",
    );
  });
});

describe("stripLeadingTitleHeading", () => {
  it("removes a leading H1 that matches the title", () => {
    expect(stripLeadingTitleHeading("# Hello\n\nBody text", "Hello")).toEqual({
      markdown: "Body text",
      stripped: true,
    });
  });

  it("keeps a leading H1 that does not match the title", () => {
    expect(stripLeadingTitleHeading("# Different\n\nBody", "Hello")).toEqual({
      markdown: "# Different\n\nBody",
      stripped: false,
    });
  });

  it("handles markdown that is only the matching heading", () => {
    expect(stripLeadingTitleHeading("# Hello", "Hello")).toEqual({
      markdown: "",
      stripped: true,
    });
  });
});

describe("buildCreatePageParams", () => {
  it("builds a page-parent payload with markdown v2 and an icon", () => {
    const payload = buildCreatePageParams({
      parentPageId: PARENT,
      title: "Hello",
      markdown: "# Hello\n\nBody",
      icon: "🚀",
    });

    expect(payload.params.parent).toEqual({
      type: "page_id",
      page_id: PARENT,
    });
    expect(payload.params.icon).toEqual({ type: "emoji", emoji: "🚀" });
    expect(payload.params.markdown).toBe("Body");
    expect(payload.params.markdown_version).toBe("v2");
    expect(payload.strippedTitleHeading).toBe(true);
    expect(payload.bodyCharacters).toBe(4);
  });

  it("omits markdown when the body is empty", () => {
    const payload = buildCreatePageParams({
      parentPageId: PARENT,
      title: "Empty",
      markdown: "   \n\n",
    });

    expect(payload.params.markdown).toBeUndefined();
    expect(payload.params.markdown_version).toBeUndefined();
    expect(payload.bodyCharacters).toBe(0);
  });

  it("sets the title property", () => {
    const payload = buildCreatePageParams({
      parentPageId: PARENT,
      title: "My page",
    });

    expect(payload.params.properties).toEqual({
      title: {
        type: "title",
        title: [{ type: "text", text: { content: "My page" } }],
      },
    });
  });
});
