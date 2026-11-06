import { describe, expect, it } from "vitest";
import { InvalidNotionIdError, normalizeNotionId } from "../src/notion/ids.js";

describe("normalizeNotionId", () => {
  it("extracts an ID from a Notion page URL", () => {
    const url =
      "https://www.notion.so/workspace/My-Page-123456781234123412341234567890ab?pvs=4";
    expect(normalizeNotionId(url)).toBe(
      "12345678-1234-1234-1234-1234567890ab",
    );
  });

  it("extracts an ID from an app.notion.com URL", () => {
    const url = "https://app.notion.com/p/123456781234123412341234567890ab";
    expect(normalizeNotionId(url)).toBe(
      "12345678-1234-1234-1234-1234567890ab",
    );
  });

  it("accepts a compact 32-character ID", () => {
    expect(normalizeNotionId("123456781234123412341234567890ab")).toBe(
      "12345678-1234-1234-1234-1234567890ab",
    );
  });

  it("accepts an already dashed UUID and lowercases it", () => {
    expect(
      normalizeNotionId("12345678-1234-1234-1234-1234567890AB"),
    ).toBe("12345678-1234-1234-1234-1234567890ab");
  });

  it("trims surrounding whitespace", () => {
    expect(
      normalizeNotionId("  12345678-1234-1234-1234-1234567890ab  "),
    ).toBe("12345678-1234-1234-1234-1234567890ab");
  });

  it("rejects values without a Notion ID", () => {
    expect(() => normalizeNotionId("not a notion link")).toThrow(
      InvalidNotionIdError,
    );
  });

  it("rejects empty input", () => {
    expect(() => normalizeNotionId("   ")).toThrow(InvalidNotionIdError);
  });
});
