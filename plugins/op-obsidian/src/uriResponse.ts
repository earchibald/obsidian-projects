import { App, normalizePath } from "obsidian";

export const SCRATCH_PATH = "Projects/_scratch/op-last-response.md";

export interface UriResponsePayload {
  ok: boolean;
  command: string;
  issueId?: string;
  path?: string;
  error?: string;
  [extra: string]: unknown;
}

export async function writeUriResponse(app: App, payload: UriResponsePayload): Promise<void> {
  const body = [
    "---",
    "type: op-uri-response",
    `ok: ${payload.ok}`,
    `command: ${payload.command}`,
    `timestamp: ${new Date().toISOString()}`,
    "---",
    "",
    "```json",
    JSON.stringify(payload, null, 2),
    "```",
    "",
  ].join("\n");

  const path = normalizePath(SCRATCH_PATH);
  const folder = path.slice(0, path.lastIndexOf("/"));
  if (!app.vault.getAbstractFileByPath(folder)) {
    await app.vault.createFolder(folder);
  }
  const existing = app.vault.getAbstractFileByPath(path);
  if (existing && "stat" in existing) {
    await app.vault.adapter.write(path, body);
  } else {
    await app.vault.create(path, body);
  }
}
