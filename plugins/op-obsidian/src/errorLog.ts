import { App, TFile, normalizePath } from "obsidian";

export const ERROR_LOG_PATH = "Projects/_scratch/op-last-error.md";

/**
 * Persist a single op error to a vault-side scratch note so the user (or a
 * delegated agent) can inspect it later without needing the dev console.
 *
 * Overwrites the previous content — same shape as `op-last-response.md`.
 * Returns the normalized path that the caller can hand to `[Open log]`.
 */
export async function writeErrorLog(
  app: App,
  category: string,
  details: string,
): Promise<string> {
  const path = normalizePath(ERROR_LOG_PATH);
  const folder = path.split("/").slice(0, -1).join("/");
  if (folder && !(await app.vault.adapter.exists(folder))) {
    await app.vault.createFolder(folder).catch(() => {});
  }
  const stamp = new Date().toISOString();
  const body = `# op error log\n\n- **when**: ${stamp}\n- **category**: ${category}\n\n\`\`\`\n${details}\n\`\`\`\n`;
  const existing = app.vault.getAbstractFileByPath(path);
  if (existing instanceof TFile) {
    await app.vault.modify(existing, body);
  } else {
    await app.vault.create(path, body);
  }
  return path;
}

export async function openErrorLog(app: App): Promise<void> {
  const path = normalizePath(ERROR_LOG_PATH);
  const f = app.vault.getAbstractFileByPath(path);
  if (f instanceof TFile) {
    await app.workspace.getLeaf(false).openFile(f);
  }
}
