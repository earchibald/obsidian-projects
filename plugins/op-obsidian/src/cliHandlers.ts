// Pure param-parsers for CLI handlers. Extracted so the error-path messages
// and id/issue aliasing can be tested without loading the obsidian module.
// The class-side CLI handlers in main.ts delegate to these and then call the
// vault actions with the validated args.

export type ParamsResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function parseWorkParams(params: Record<string, string>): ParamsResult<{ id: string }> {
  const id = params.issue ?? params.id;
  if (!id) return { ok: false, error: "op-work failed: --issue is required" };
  return { ok: true, value: { id } };
}

export function parseAppendCommitParams(
  params: Record<string, string>,
): ParamsResult<{ id: string; sha: string; subject: string }> {
  const id = params.issue ?? params.id;
  const sha = params.sha;
  const subject = params.subject;
  if (!id || !sha || !subject) {
    return { ok: false, error: "op-append-commit failed: --issue, --sha, --subject all required" };
  }
  return { ok: true, value: { id, sha, subject } };
}

export function parseSetPrParams(
  params: Record<string, string>,
): ParamsResult<{ id: string; url: string }> {
  const id = params.issue ?? params.id;
  const url = params.url ?? params.pr;
  if (!id || !url) return { ok: false, error: "op-set-pr failed: --issue and --url required" };
  return { ok: true, value: { id, url } };
}

export function parseSetScopeParams(
  params: Record<string, string>,
): ParamsResult<{ id: string; scope: string; mode: "scope" | "body" }> {
  const id = params.issue ?? params.id;
  const scope = params.scope;
  if (!id || typeof scope !== "string") {
    return { ok: false, error: "op-set-scope failed: --issue and --scope required" };
  }
  const rawMode = params.mode;
  let mode: "scope" | "body" = "scope";
  if (rawMode !== undefined) {
    if (rawMode !== "scope" && rawMode !== "body") {
      return { ok: false, error: "op-set-scope failed: mode must be 'scope' or 'body'" };
    }
    mode = rawMode;
  }
  return { ok: true, value: { id, scope, mode } };
}

export function parseNewParams(
  params: Record<string, string>,
): ParamsResult<{ slug: string; title: string; priority: "low" | "med" | "high" }> {
  const slug = params.project ?? params.slug;
  if (!slug) return { ok: false, error: "op-new failed: --project is required" };
  const title = params.title;
  if (!title) return { ok: false, error: "op-new failed: --title is required" };
  const priority = (params.priority as "low" | "med" | "high" | undefined) ?? "med";
  return { ok: true, value: { slug, title, priority } };
}

export function parseScaffoldParams(
  params: Record<string, string>,
): ParamsResult<{ slug: string; prefix: string }> {
  const slug = params.slug;
  const prefix = params.prefix;
  if (!slug) return { ok: false, error: "--slug is required" };
  if (!prefix) return { ok: false, error: "--prefix is required" };
  return { ok: true, value: { slug, prefix } };
}
