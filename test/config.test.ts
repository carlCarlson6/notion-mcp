import { describe, expect, it } from "vitest";
import { ConfigError, loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("requires NOTION_TOKEN", () => {
    expect(() => loadConfig({})).toThrow(ConfigError);
  });

  it("normalizes a parent page URL", () => {
    const config = loadConfig({
      NOTION_TOKEN: "  ntn_test  ",
      NOTION_PARENT_PAGE_ID:
        "https://www.notion.so/MCP-Inbox-123456781234123412341234567890ab",
    });

    expect(config.notionToken).toBe("ntn_test");
    expect(config.defaultParentPageId).toBe(
      "12345678-1234-1234-1234-1234567890ab",
    );
    expect(config.notionVersion).toBe("2026-03-11");
  });

  it("allows a missing parent page", () => {
    const config = loadConfig({ NOTION_TOKEN: "ntn_test" });
    expect(config.defaultParentPageId).toBeNull();
  });

  it("rejects an invalid parent page", () => {
    expect(() =>
      loadConfig({
        NOTION_TOKEN: "ntn_test",
        NOTION_PARENT_PAGE_ID: "my inbox",
      }),
    ).toThrow(ConfigError);
  });
});
