import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import { normalizeNotionId } from "./notion/ids.js";

const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

let envLoaded = false;

export function loadEnvironment(): void {
  if (envLoaded) return;
  loadDotenv({ path: path.join(PROJECT_ROOT, ".env"), quiet: true });
  envLoaded = true;
}

export interface AppConfig {
  notionToken: string;
  defaultParentPageId: string | null;
  notionVersion: "2026-03-11";
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  loadEnvironment();

  const token = env.NOTION_TOKEN?.trim();
  if (!token) {
    throw new ConfigError(
      [
        "NOTION_TOKEN is not set.",
        "Copy .env.example to .env and add the internal integration token (it starts with ntn_).",
        "Create an integration at https://www.notion.so/my-integrations and share the target pages with it.",
      ].join(" "),
    );
  }

  const parentRaw = env.NOTION_PARENT_PAGE_ID?.trim();
  let defaultParentPageId: string | null = null;
  if (parentRaw) {
    try {
      defaultParentPageId = normalizeNotionId(parentRaw);
    } catch {
      throw new ConfigError(
        "NOTION_PARENT_PAGE_ID is not a valid Notion page URL or ID. Paste the full page URL or its 32-character ID.",
      );
    }
  }

  return {
    notionToken: token,
    defaultParentPageId,
    notionVersion: "2026-03-11",
  };
}
