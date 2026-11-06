import {
  APIResponseError,
  isHTTPResponseError,
  isNotionClientError,
} from "@notionhq/client";

/** An expected, user-actionable failure that should be shown verbatim. */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}

export interface ToolErrorResult {
  isError: true;
  content: Array<{ type: "text"; text: string }>;
}

export function toolError(error: unknown): ToolErrorResult {
  return {
    isError: true,
    content: [{ type: "text", text: describeError(error) }],
  };
}

export function describeError(error: unknown): string {
  if (error instanceof UserFacingError) {
    return error.message;
  }

  if (error instanceof APIResponseError) {
    return describeApiError(error);
  }

  if (isHTTPResponseError(error)) {
    return `Notion returned HTTP ${error.status}. Retry in a moment. (request_id: ${error.request_id ?? "unknown"})`;
  }

  if (isNotionClientError(error)) {
    return `Notion client error (${error.code}): ${error.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function describeApiError(error: APIResponseError): string {
  const request = error.request_id ? `(request_id: ${error.request_id})` : "";

  switch (error.status) {
    case 400:
      return `Notion rejected the request: ${error.message}${request ? ` ${request}` : ""}`;
    case 401:
      return [
        "Notion rejected the token (401).",
        "Check NOTION_TOKEN in .env: the integration token may be wrong, revoked, or copied with extra characters.",
        request,
      ]
        .filter(Boolean)
        .join(" ");
    case 403:
      return [
        "Notion denied access (403).",
        "The integration is missing a capability or access to this resource.",
        "In Notion, open the integration settings and enable Read content, Insert content, and Update content.",
        request,
      ]
        .filter(Boolean)
        .join(" ");
    case 404:
      return [
        "Notion could not find that page (404).",
        "The most common cause is that the page is not shared with the integration.",
        "Open the page in Notion, click ••• → Connections, and add your integration.",
        request,
      ]
        .filter(Boolean)
        .join(" ");
    case 409:
      return `Notion reported a conflict (409). Retry the request.${request ? ` ${request}` : ""}`;
    case 429:
      return [
        "Notion rate limit reached (429) even after automatic retries.",
        "Wait a few seconds and try again, or request less content at once.",
        request,
      ]
        .filter(Boolean)
        .join(" ");
    default:
      if (error.status >= 500) {
        return `Notion returned a temporary error (HTTP ${error.status}). Retry in a moment.${request ? ` ${request}` : ""}`;
      }
      return `Notion error (HTTP ${error.status}, ${error.code}): ${error.message}${request ? ` ${request}` : ""}`;
  }
}
