import { describe, expect, it } from "vitest";
import {
  formatParent,
  getPageTitle,
  plainText,
  renderPageProperties,
  renderPropertyValue,
} from "../src/notion/properties.js";
import { makePage, richText } from "./fixtures.js";

describe("plainText", () => {
  it("joins rich text fragments", () => {
    expect(plainText([richText("Hello "), richText("world")])).toBe(
      "Hello world",
    );
  });

  it("returns an empty string for missing rich text", () => {
    expect(plainText(undefined)).toBe("");
    expect(plainText([])).toBe("");
  });
});

describe("getPageTitle", () => {
  it("finds the title property", () => {
    expect(getPageTitle(makePage())).toBe("Project Alpha");
  });

  it("returns an empty string when there is no title", () => {
    expect(getPageTitle(makePage({ properties: {} }))).toBe("");
  });
});

describe("renderPropertyValue", () => {
  const page = makePage();

  it("renders select-like, date, people, formula, and rollup values", () => {
    expect(renderPropertyValue(page.properties.Status)).toBe("In progress");
    expect(renderPropertyValue(page.properties.Tags)).toBe("personal, mcp");
    expect(renderPropertyValue(page.properties.Due)).toBe("2026-11-01");
    expect(renderPropertyValue(page.properties.Done)).toBe("No");
    expect(renderPropertyValue(page.properties.Owner)).toBe("Ada");
    expect(renderPropertyValue(page.properties.Score)).toBe("42");
    expect(renderPropertyValue(page.properties.Estimate)).toBe("3");
  });

  it("returns null for empty values", () => {
    expect(renderPropertyValue(page.properties.Empty)).toBeNull();
  });
});

describe("renderPageProperties", () => {
  it("renders non-title properties and skips empty values", () => {
    const lines = renderPageProperties(makePage());
    expect(lines).toContain("- **Status:** In progress");
    expect(lines).toContain("- **Tags:** personal, mcp");
    expect(lines).toContain("- **Due:** 2026-11-01");
    expect(lines).toContain("- **Done:** No");
    expect(lines).toContain("- **Owner:** Ada");
    expect(lines.join("\n")).not.toContain("Name:");
    expect(lines.join("\n")).not.toContain("Empty:");
  });
});

describe("formatParent", () => {
  it("formats page and data source parents", () => {
    expect(
      formatParent({
        type: "page_id",
        page_id: "22222222-2222-2222-2222-222222222222",
      }),
    ).toContain("page_id");
    expect(
      formatParent({
        type: "data_source_id",
        data_source_id: "33333333-3333-3333-3333-333333333333",
        database_id: "44444444-4444-4444-4444-444444444444",
      }),
    ).toContain("data_source_id");
    expect(formatParent(undefined)).toBe("unknown");
  });
});
