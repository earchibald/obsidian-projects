import type { App, TFile } from "obsidian";
import {
  currentProjectsRoot,
  isWithinProjectsRoot,
  projectFolderFromStatusPath,
  statusPathFor,
} from "./projectPaths";

export interface ProjectInfo {
  slug: string;
  prefix?: string;
  statusPath: string;
  folderPath: string;
}

export function listProjects(app: App): ProjectInfo[] {
  const out: ProjectInfo[] = [];
  const root = currentProjectsRoot(app);
  for (const file of app.vault.getMarkdownFiles()) {
    if (!isWithinProjectsRoot(file.path, root)) continue;
    if (!file.path.endsWith("/STATUS.md")) continue;
    const fm = app.metadataCache.getFileCache(file)?.frontmatter;
    if (fm?.type !== "project-status") continue;
    const folderPath = projectFolderFromStatusPath(file.path);
    const slug = folderPath?.split("/").pop();
    if (!folderPath || !slug) continue;
    const prefix = typeof fm.prefix === "string" ? fm.prefix : undefined;
    out.push({ slug, prefix, statusPath: file.path, folderPath });
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

// OP-279: resolve a project slug with a deterministic disk fallback.
//
// `listProjects()` (and thus `findProjectBySlug`) reads project membership
// purely from `app.metadataCache`. An external `processFrontMatter` /
// `vault.modify` that rewrites a project's STATUS.md (e.g. build-seeds'
// `setProjectVars` in the workflow-modules seed) invalidates that cache
// entry; Obsidian's reindex is async/debounced. A separate `op-new` CLI
// process dispatched microseconds later then misses the project and threw
// "Unknown project slug" even though STATUS.md is well-formed on disk.
//
// On a cache miss, re-read the conventional STATUS.md path from disk and
// parse its frontmatter directly before declaring the slug unknown. O(1) on
// miss, deterministic (no polling — strictly better than the
// `retryCreateSeed` workaround in scaffoldProject.ts), and benefits every
// caller routing through it (op-new CLI, op-new URI, build-seeds, and real
// users editing STATUS.md then immediately creating an issue).
export async function resolveProjectBySlug(
  app: App,
  slug: string,
): Promise<ProjectInfo | undefined> {
  const cached = findProjectBySlug(app, slug);
  if (cached) return cached;

  const statusPath = statusPathFor(slug, currentProjectsRoot(app));
  // Duck-typed file check: a TFolder exposes `children`, a TFile does not.
  // Avoids a runtime `instanceof TFile` so this module stays free of a
  // runtime "obsidian" import (pure tests import the resolver chain without
  // mocking Obsidian — see findIssue.test.ts / projects.test.ts).
  const file = app.vault.getAbstractFileByPath(statusPath) as TFile | null;
  if (!file || (file as { children?: unknown }).children !== undefined) {
    return undefined;
  }

  let raw: string;
  try {
    raw = await app.vault.read(file);
  } catch {
    return undefined;
  }

  const fm = parseStatusFrontmatter(raw);
  if (fm.type !== "project-status") return undefined;

  const folderPath = projectFolderFromStatusPath(statusPath);
  const resolvedSlug = folderPath?.split("/").pop();
  if (!folderPath || !resolvedSlug) return undefined;
  return { slug: resolvedSlug, prefix: fm.prefix, statusPath, folderPath };
}

// Extract just the top-level scalar keys we need (`type`, `prefix`) from a
// STATUS.md frontmatter block. STATUS.md always emits these as simple
// unindented scalars (see renderStatus in scaffoldProject.ts); nested keys
// (`tags:`, `vars:`) are indented and intentionally ignored. Deliberately
// avoids `parseYaml` so projects.ts needs no runtime "obsidian" import.
function parseStatusFrontmatter(raw: string): {
  type?: string;
  prefix?: string;
} {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return {};
  const out: { type?: string; prefix?: string } = {};
  for (const line of match[1].split("\n")) {
    const m = line.match(/^(type|prefix):[ \t]+(.+?)[ \t]*$/);
    if (m) out[m[1] as "type" | "prefix"] = m[2].replace(/^["'](.*)["']$/, "$1");
  }
  return out;
}
