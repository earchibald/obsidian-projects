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

export function parseSetEvaluationParams(
  params: Record<string, string>,
): ParamsResult<{ id: string; evaluation: string }> {
  const id = params.issue ?? params.id;
  const evaluation = params.evaluation;
  if (!id || typeof evaluation !== "string") {
    return { ok: false, error: "op-set-evaluation failed: --issue and --evaluation required" };
  }
  return { ok: true, value: { id, evaluation } };
}

const FLOW_ENUM = ["evaluate", "planning", "implementation", "review", "finalization", "done"] as const;
const COMPLEXITY_ENUM = ["simple", "complex"] as const;

export function parseSetFlowParams(
  params: Record<string, string>,
): ParamsResult<{
  id: string;
  flow?: (typeof FLOW_ENUM)[number] | null;
  complexity?: (typeof COMPLEXITY_ENUM)[number] | null;
}> {
  const id = params.issue ?? params.id;
  if (!id) return { ok: false, error: "op-set-flow failed: --issue is required" };
  const hasFlow = Object.prototype.hasOwnProperty.call(params, "flow");
  const hasComplexity = Object.prototype.hasOwnProperty.call(params, "complexity");
  if (!hasFlow && !hasComplexity) {
    return {
      ok: false,
      error: "op-set-flow failed: at least one of --flow or --complexity is required",
    };
  }
  const out: {
    id: string;
    flow?: (typeof FLOW_ENUM)[number] | null;
    complexity?: (typeof COMPLEXITY_ENUM)[number] | null;
  } = { id };
  if (hasFlow) {
    const v = params.flow;
    if (v === "" || v === "null") {
      out.flow = null;
    } else if ((FLOW_ENUM as readonly string[]).includes(v)) {
      out.flow = v as (typeof FLOW_ENUM)[number];
    } else {
      return {
        ok: false,
        error: `op-set-flow failed: invalid --flow ${JSON.stringify(v)} (expected ${FLOW_ENUM.join("|")})`,
      };
    }
  }
  if (hasComplexity) {
    const v = params.complexity;
    if (v === "" || v === "null") {
      out.complexity = null;
    } else if ((COMPLEXITY_ENUM as readonly string[]).includes(v)) {
      out.complexity = v as (typeof COMPLEXITY_ENUM)[number];
    } else {
      return {
        ok: false,
        error: `op-set-flow failed: invalid --complexity ${JSON.stringify(v)} (expected ${COMPLEXITY_ENUM.join("|")})`,
      };
    }
  }
  return { ok: true, value: out };
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

export function parseSetLinkParams(
  params: Record<string, string>,
): ParamsResult<{ srcId: string; dstId: string; relation: string }> {
  const srcId = params.issue ?? params.id ?? params.src;
  const dstId = params.target ?? params.dst;
  const relation = params.relation;
  if (!srcId || !dstId || !relation) {
    return {
      ok: false,
      error:
        "op-set-link failed: --issue, --relation, --target all required",
    };
  }
  return { ok: true, value: { srcId, dstId, relation } };
}

export function parseRemoveLinkParams(
  params: Record<string, string>,
): ParamsResult<{ srcId: string; dstId: string; relation: string }> {
  const srcId = params.issue ?? params.id ?? params.src;
  const dstId = params.target ?? params.dst;
  const relation = params.relation;
  if (!srcId || !dstId || !relation) {
    return {
      ok: false,
      error:
        "op-remove-link failed: --issue, --relation, --target all required",
    };
  }
  return { ok: true, value: { srcId, dstId, relation } };
}

export function parseLinkCheckParams(
  params: Record<string, string>,
): ParamsResult<{ repair: boolean }> {
  const raw = params.repair;
  const repair = raw === "1" || raw === "true";
  return { ok: true, value: { repair } };
}

export function parseGetWorkflowParams(
  params: Record<string, string>,
): ParamsResult<{ project: string }> {
  const project = params.project ?? params.slug;
  if (!project) return { ok: false, error: "op-get-workflow failed: --project is required" };
  return { ok: true, value: { project } };
}

export function parseEditWorkflowParams(
  params: Record<string, string>,
): ParamsResult<{ project: string }> {
  const project = params.project ?? params.slug;
  if (!project) return { ok: false, error: "op-edit-workflow failed: --project is required" };
  return { ok: true, value: { project } };
}
