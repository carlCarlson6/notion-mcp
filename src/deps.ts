import type { Client } from "@notionhq/client";
import type { AppConfig } from "./config.js";

export interface ServerDeps {
  notion: Client;
  config: AppConfig;
}
