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

// Reorder a list of projects by a user-curated slug order. Slugs in `order`
// come first, in the given order; the remaining projects (newly discovered or
// never reordered) follow in lexical slug order. `order` is treated as a
// preference, not a filter — projects whose slug is absent are still returned.
export function applyProjectOrder(
  projects: ProjectInfo[],
  order: readonly string[],
): ProjectInfo[] {
  if (!order.length) return [...projects].sort((a, b) => a.slug.localeCompare(b.slug));
  const rank = new Map<string, number>();
  order.forEach((slug, i) => {
    if (!rank.has(slug)) rank.set(slug, i);
  });
  const ordered: ProjectInfo[] = [];
  const tail: ProjectInfo[] = [];
  for (const p of projects) {
    if (rank.has(p.slug)) ordered.push(p);
    else tail.push(p);
  }
  ordered.sort((a, b) => (rank.get(a.slug) ?? 0) - (rank.get(b.slug) ?? 0));
  tail.sort((a, b) => a.slug.localeCompare(b.slug));
  return [...ordered, ...tail];
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
