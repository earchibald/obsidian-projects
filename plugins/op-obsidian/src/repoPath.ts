import { App, TFile } from "obsidian";
import type { OpSettings } from "./settings";

export function resolveRepoPath(
  app: App,
  settings: OpSettings,
  slug: string,
): string | undefined {
  const fromFrontmatter = readRepoPathFromStatus(app, slug);
  if (fromFrontmatter) return fromFrontmatter;
  const fromSettings = settings.workingDirs[slug];
  return fromSettings && fromSettings.trim() ? fromSettings.trim() : undefined;
}

function readRepoPathFromStatus(app: App, slug: string): string | undefined {
  const path = `Projects/${slug}/STATUS.md`;
  const f = app.vault.getAbstractFileByPath(path);
  if (!(f instanceof TFile)) return undefined;
  const fm = app.metadataCache.getFileCache(f)?.frontmatter;
  const v = fm?.repo_path;
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}
