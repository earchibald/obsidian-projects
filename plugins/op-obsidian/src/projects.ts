import { App, TFile } from "obsidian";

export interface ProjectInfo {
  slug: string;
  prefix?: string;
  statusPath: string;
}

const PROJECTS_ROOT = "Projects/";

export function listProjects(app: App): ProjectInfo[] {
  const out: ProjectInfo[] = [];
  for (const file of app.vault.getMarkdownFiles()) {
    if (!file.path.startsWith(PROJECTS_ROOT)) continue;
    if (!file.path.endsWith("/STATUS.md")) continue;
    const fm = app.metadataCache.getFileCache(file)?.frontmatter;
    if (fm?.type !== "project-status") continue;
    const slug = slugFromStatusPath(file);
    if (!slug) continue;
    const prefix = typeof fm.prefix === "string" ? fm.prefix : undefined;
    out.push({ slug, prefix, statusPath: file.path });
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

export function findProjectByPrefix(app: App, prefix: string): ProjectInfo | undefined {
  return listProjects(app).find((p) => p.prefix === prefix);
}

export function findProjectBySlug(app: App, slug: string): ProjectInfo | undefined {
  return listProjects(app).find((p) => p.slug === slug);
}

function slugFromStatusPath(file: TFile): string | undefined {
  const parts = file.path.split("/");
  if (parts.length < 3) return undefined;
  return parts[parts.length - 2];
}
