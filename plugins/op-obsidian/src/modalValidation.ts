// Pure validators for modal form input. Extracted from modals.ts /
// workingDir.ts so they can be tested without the obsidian module. Each
// validator preserves the inlined behavior at time of extraction — if any
// quirk needs to change, open a follow-up issue rather than silently shifting
// validation here.

export type Validation<T> = { ok: true; value: T } | { ok: false; error: string };

/** Split a textarea into scope bullets: strip leading "- " / "* ", trim, drop blanks. */
export function parseScopeTextarea(raw: string): string[] {
  return raw
    .split("\n")
    .map((l) => l.replace(/^\s*[-*]\s*/, "").trim())
    .filter((l) => l.length > 0);
}

/** http(s):// URL check — intentionally loose to match legacy behavior. */
export function validatePrUrl(raw: string): Validation<string> {
  const u = raw.trim();
  if (!/^https?:\/\//i.test(u)) {
    return { ok: false, error: "URL must start with http(s)://" };
  }
  return { ok: true, value: u };
}

/** Same loose check as validatePrUrl — kept separate for error-message clarity. */
export function validateGithubIssueUrl(raw: string): Validation<string> {
  const u = raw.trim();
  if (!/^https?:\/\//i.test(u)) {
    return { ok: false, error: "URL must start with http(s)://" };
  }
  return { ok: true, value: u };
}

export function validateSha(raw: string): Validation<string> {
  const s = raw.trim();
  if (!s) return { ok: false, error: "SHA is required" };
  return { ok: true, value: s };
}

export function validateSubject(raw: string): Validation<string> {
  const s = raw.trim();
  if (!s) return { ok: false, error: "Subject is required" };
  return { ok: true, value: s };
}

export interface NewIssueRaw {
  title: string;
  scopeRaw: string;
  githubIssue: string;
  priority: "low" | "med" | "high";
}

export interface NewIssueValue {
  title: string;
  scope: string[];
  githubIssue: string | undefined;
  priority: "low" | "med" | "high";
}

export function validateNewIssueInput(input: NewIssueRaw): Validation<NewIssueValue> {
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Title is required" };
  const scope = parseScopeTextarea(input.scopeRaw);
  const ghRaw = input.githubIssue.trim();
  let githubIssue: string | undefined;
  if (ghRaw) {
    if (!/^https?:\/\//i.test(ghRaw)) {
      return { ok: false, error: "GitHub URL must start with http(s)://" };
    }
    githubIssue = ghRaw;
  }
  return {
    ok: true,
    value: { title, scope, githubIssue, priority: input.priority },
  };
}

export interface ScaffoldRaw {
  slug: string;
  prefix: string;
  repoPath: string;
  seedTitle: string;
  seedPriority: "low" | "med" | "high";
}

export interface ScaffoldValue {
  slug: string;
  prefix: string;
  repoPath: string | undefined;
  seedTitle: string | undefined;
  seedPriority: "low" | "med" | "high" | undefined;
}

export function validateScaffoldInput(input: ScaffoldRaw): Validation<ScaffoldValue> {
  const slug = input.slug.trim();
  const prefix = input.prefix.trim();
  if (!slug || !prefix) return { ok: false, error: "Slug and prefix are required" };
  const repoPath = input.repoPath.trim() || undefined;
  if (repoPath && !repoPath.startsWith("/")) {
    return { ok: false, error: "Repo path must be absolute (start with /)" };
  }
  const seedTitle = input.seedTitle.trim() || undefined;
  return {
    ok: true,
    value: {
      slug,
      prefix,
      repoPath,
      seedTitle,
      seedPriority: seedTitle ? input.seedPriority : undefined,
    },
  };
}

/** WorkingDir modal: trims, requires non-empty. (The modal's legacy behavior
 * was a silent no-op on empty; validator surfaces it for testability.) */
export function validateWorkingDirInput(raw: string): Validation<string> {
  const p = raw.trim();
  if (!p) return { ok: false, error: "Path is required" };
  return { ok: true, value: p };
}
