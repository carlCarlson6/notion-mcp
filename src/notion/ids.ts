const DASHED_UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const COMPACT_ID = /[0-9a-f]{32}/i;

export class InvalidNotionIdError extends Error {
  constructor(input: string) {
    super(
      `Could not find a Notion ID in "${input}". Pass a Notion page URL or a 32-character Notion ID.`,
    );
    this.name = "InvalidNotionIdError";
  }
}

/**
 * Accepts a raw Notion ID (with or without dashes) or a pasted Notion URL and
 * returns the canonical dashed UUID.
 */
export function normalizeNotionId(input: string): string {
  const trimmed = typeof input === "string" ? input.trim() : "";
  if (!trimmed) {
    throw new InvalidNotionIdError(String(input ?? ""));
  }

  const candidates = [trimmed];
  try {
    const decoded = decodeURIComponent(trimmed);
    if (decoded !== trimmed) candidates.push(decoded);
  } catch {
    // Malformed percent-encoding: fall back to the raw string.
  }

  for (const candidate of candidates) {
    const dashed = candidate.match(DASHED_UUID)?.[0];
    if (dashed) return dashed.toLowerCase();

    const compact = candidate.match(COMPACT_ID)?.[0];
    if (compact) return addDashes(compact.toLowerCase());
  }

  throw new InvalidNotionIdError(input);
}

function addDashes(id: string): string {
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
}
