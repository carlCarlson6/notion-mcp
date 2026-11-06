import { APIErrorCode, APIResponseError } from "@notionhq/client";
import { describe, expect, it } from "vitest";
import { describeError, UserFacingError } from "../src/notion/errors.js";

function apiError(
  status: number,
  code: APIErrorCode,
  message: string,
): APIResponseError {
  return new APIResponseError({
    code,
    status,
    message,
    headers: {},
    rawBodyText: "",
    additional_data: undefined,
    request_id: "req-test-1",
  });
}

describe("describeError", () => {
  it("passes user-facing errors through verbatim", () => {
    expect(describeError(new UserFacingError("Do the thing."))).toBe(
      "Do the thing.",
    );
  });

  it("explains 404s as a sharing problem", () => {
    const text = describeError(
      apiError(404, APIErrorCode.ObjectNotFound, "Could not find page"),
    );
    expect(text).toContain("not shared with the integration");
    expect(text).toContain("Connections");
    expect(text).toContain("req-test-1");
  });

  it("points 401s at NOTION_TOKEN", () => {
    expect(
      describeError(apiError(401, APIErrorCode.Unauthorized, "Unauthorized")),
    ).toContain("NOTION_TOKEN");
  });

  it("mentions capabilities for 403s", () => {
    expect(
      describeError(
        apiError(403, APIErrorCode.RestrictedResource, "Restricted"),
      ),
    ).toContain("Read content");
  });

  it("explains rate limits", () => {
    expect(
      describeError(apiError(429, APIErrorCode.RateLimited, "Rate limited")),
    ).toContain("rate limit");
  });

  it("includes Notion's validation message for 400s", () => {
    expect(
      describeError(
        apiError(400, APIErrorCode.ValidationError, "Bad property value"),
      ),
    ).toContain("Bad property value");
  });

  it("handles plain errors", () => {
    expect(describeError(new Error("boom"))).toBe("boom");
  });
});
