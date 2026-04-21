import type { IssueStore } from "./issueStore";
import type { IssueEntry } from "./types";
import type { ProjectInfo } from "./projects";

export interface FindIssueInput {
  raw: string;
  projects: ProjectInfo[];
}

export interface ResolvedIssue {
  entry: IssueEntry;
}

export interface FindIssueResult {
  matches: IssueEntry[];
  interpretation: string;
}

export function findIssue(store: IssueStore, input: FindIssueInput): FindIssueResult {
  const tokens = input.raw.trim().split(/\s+/).filter(Boolean);
  const all = store.issues();

  if (tokens.length === 1) {
    const t = tokens[0];
    const idMatch = t.match(/^([A-Za-z][A-Za-z0-9]*)-(\d+)$/);
    if (idMatch) {
      const id = `${idMatch[1].toUpperCase()}-${idMatch[2]}`;
      return {
        matches: all.filter((e) => e.id === id),
        interpretation: `id=${id}`,
      };
    }
    const prefix = t.toUpperCase();
    const proj = input.projects.find((p) => p.prefix === prefix);
    if (proj) {
      return {
        matches: byProject(all, proj.slug),
        interpretation: `prefix=${prefix} → project=${proj.slug}`,
      };
    }
    const slug = t;
    const projBySlug = input.projects.find((p) => p.slug === slug);
    if (projBySlug) {
      return {
        matches: byProject(all, projBySlug.slug),
        interpretation: `slug=${slug}`,
      };
    }
    return { matches: [], interpretation: `no project or issue matches "${t}"` };
  }

  if (tokens.length === 2) {
    const [first, second] = tokens;
    const n = parseInt(second, 10);
    if (!Number.isFinite(n)) {
      return { matches: [], interpretation: `expected number after "${first}"` };
    }
    const prefix = first.toUpperCase();
    const byPrefix = input.projects.find((p) => p.prefix === prefix);
    const proj = byPrefix ?? input.projects.find((p) => p.slug === first);
    if (!proj) {
      return { matches: [], interpretation: `no project matches "${first}"` };
    }
    const id = proj.prefix ? `${proj.prefix}-${n}` : undefined;
    const matches = id
      ? all.filter((e) => e.id === id)
      : byProject(all, proj.slug).filter((e) => e.id.endsWith(`-${n}`));
    return {
      matches,
      interpretation: id ? `id=${id}` : `project=${proj.slug} N=${n}`,
    };
  }

  return { matches: [], interpretation: "expected 1 or 2 tokens" };
}

function byProject(all: IssueEntry[], slug: string): IssueEntry[] {
  return all.filter((e) => e.project === slug);
}

export function nextIssueNumber(store: IssueStore, slug: string): number {
  const ns = store
    .issues()
    .filter((e) => e.project === slug)
    .map((e) => parseInt(e.id.split("-").pop() ?? "0", 10))
    .filter((n) => Number.isFinite(n));
  return ns.length === 0 ? 1 : Math.max(...ns) + 1;
}
