// Pure param-parsers for CLI handlers. Extracted so the error-path messages
// and id/issue aliasing can be tested without loading the obsidian module.
// The class-side CLI handlers in main.ts delegate to these and then call the
// vault actions with the validated args.

export type ParamsResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function parseWorkParams(
  params: Record<string, string>,
): ParamsResult<{ id: string; agent?: string; agentSession?: string; force: boolean }> {
  const id = params.issue ?? params.id;
  if (!id) return { ok: false, error: "op-work failed: --issue is required" };
  const agent = nonEmptyTrim(params.agent);
  const agentSession = nonEmptyTrim(params.agent_session ?? params.session);
  if (params.agent !== undefined && agent === undefined) {
    return { ok: false, error: "op-work failed: --agent must be a non-empty string" };
  }
  if (agent !== undefined && /\s/.test(agent)) {
    return { ok: false, error: "op-work failed: --agent must not contain whitespace" };
  }
  const force = params.force === "1" || params.force === "true";
  const out: { id: string; agent?: string; agentSession?: string; force: boolean } = { id, force };
  if (agent !== undefined) out.agent = agent;
  if (agentSession !== undefined) out.agentSession = agentSession;
  return { ok: true, value: out };
}

function nonEmptyTrim(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length > 0 ? t : undefined;
}

export function parseOnboardParams(
  params: Record<string, string>,
): ParamsResult<{ id: string; agent: string; agentSession?: string; force: boolean }> {
  const id = params.issue ?? params.id;
  if (!id) return { ok: false, error: "op-onboard failed: --issue is required" };
  const agent = nonEmptyTrim(params.agent);
  if (agent === undefined) {
    return { ok: false, error: "op-onboard failed: --agent is required" };
  }
  if (/\s/.test(agent)) {
    return { ok: false, error: "op-onboard failed: --agent must not contain whitespace" };
  }
  const agentSession = nonEmptyTrim(params.agent_session ?? params.session);
  const force = params.force === "1" || params.force === "true";
  const out: { id: string; agent: string; agentSession?: string; force: boolean } = { id, agent, force };
  if (agentSession !== undefined) out.agentSession = agentSession;
  return { ok: true, value: out };
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

// OP-188: `flow:` accepts any non-empty step id (the workflow-file walker at
// auto-advance time enforces "step exists in the workflow"). Complexity stays
// a closed two-value enum.
const COMPLEXITY_ENUM = ["simple", "complex"] as const;

export function parseSetFlowParams(
  params: Record<string, string>,
): ParamsResult<{
  id: string;
  flow?: string | null;
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
    flow?: string | null;
    complexity?: (typeof COMPLEXITY_ENUM)[number] | null;
  } = { id };
  if (hasFlow) {
    const v = params.flow;
    if (v === "" || v === "null") {
      out.flow = null;
    } else if (typeof v === "string" && v.trim().length > 0) {
      if (/[\r\n]/.test(v)) {
        return {
          ok: false,
          error: `op-set-flow failed: invalid --flow ${JSON.stringify(v)} (must not contain newlines)`,
        };
      }
      out.flow = v.trim();
    } else {
      return {
        ok: false,
        error: `op-set-flow failed: invalid --flow ${JSON.stringify(v)} (expected a non-empty step id string)`,
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

export function parseSetSectionParams(
  params: Record<string, string>,
): ParamsResult<{ id: string; name: "Plan" | "Notes" | "Summary"; content: string; append: boolean }> {
  const id = params.issue ?? params.id;
  const name = params.name;
  const content = params.content;
  if (!id || typeof name !== "string" || typeof content !== "string") {
    return {
      ok: false,
      error: "op-set-section failed: --issue, --name, --content all required",
    };
  }
  if (name !== "Plan" && name !== "Notes" && name !== "Summary") {
    return {
      ok: false,
      error: `op-set-section failed: --name must be one of Plan|Notes|Summary (got ${JSON.stringify(name)})`,
    };
  }
  const rawAppend = params.append;
  const append = rawAppend === "1" || rawAppend === "true";
  return { ok: true, value: { id, name, content, append } };
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

export function parseEditModuleParams(
  params: Record<string, string>,
): ParamsResult<{ moduleId: string; scopeKind: "global" | "project"; project?: string }> {
  const moduleId = (params.module ?? params.id ?? "").trim();
  if (!moduleId) {
    return { ok: false, error: "op-edit-module failed: --module is required" };
  }
  const project = params.project?.trim() || params.slug?.trim() || undefined;
  // Default to per-project scope when a project slug is supplied; default to
  // global otherwise. Authors who want a project-scoped module without a slug
  // are bounced back via the explicit `scope=project` arg without `project=`,
  // which is rejected as a hard error so the caller is forced to disambiguate.
  let scopeKindRaw = params.scope?.trim().toLowerCase();
  if (scopeKindRaw && scopeKindRaw !== "global" && scopeKindRaw !== "project") {
    return {
      ok: false,
      error: `op-edit-module failed: --scope must be "global" or "project" (got ${JSON.stringify(scopeKindRaw)})`,
    };
  }
  if (!scopeKindRaw) {
    scopeKindRaw = project ? "project" : "global";
  }
  if (scopeKindRaw === "project" && !project) {
    return {
      ok: false,
      error: "op-edit-module failed: --project is required when --scope=project",
    };
  }
  return {
    ok: true,
    value: {
      moduleId,
      scopeKind: scopeKindRaw as "global" | "project",
      project,
    },
  };
}

export function parseGetSkillParams(
  params: Record<string, string>,
): ParamsResult<{ name: string }> {
  const raw = typeof params.name === "string" ? params.name.trim() : "";
  return { ok: true, value: { name: raw } };
}

export function parseExplainWorkflowParams(
  params: Record<string, string>,
): ParamsResult<{ id: string; mode: string; agent?: string }> {
  const id = params.issue ?? params.id;
  if (!id) return { ok: false, error: "op-explain-workflow failed: --issue is required" };
  const mode = nonEmptyTrim(params.mode);
  if (mode === undefined) {
    return { ok: false, error: "op-explain-workflow failed: --mode is required" };
  }
  const agent = nonEmptyTrim(params.agent);
  if (params.agent !== undefined && agent === undefined) {
    return { ok: false, error: "op-explain-workflow failed: --agent must be a non-empty string" };
  }
  if (agent !== undefined && /\s/.test(agent)) {
    return { ok: false, error: "op-explain-workflow failed: --agent must not contain whitespace" };
  }
  const out: { id: string; mode: string; agent?: string } = { id, mode };
  if (agent !== undefined) out.agent = agent;
  return { ok: true, value: out };
}

// POSIX absolute-path check. This plugin targets macOS/Linux only, so a
// leading "/" is the sole absolute form (no Windows-drive / UNC handling).
function isAbsolutePath(p: string): boolean {
  return p.startsWith("/");
}

export function parseEmitLazySkillsParams(
  params: Record<string, string>,
): ParamsResult<{ issueId: string; destDir?: string }> {
  const id = params.issue ?? params.id;
  if (!id) return { ok: false, error: "op-emit-lazy-skills failed: --issue is required" };
  const dir = nonEmptyTrim(params.dir);
  if (dir !== undefined && dir.startsWith("~")) {
    return {
      ok: false,
      error: `op-emit-lazy-skills failed: --dir must be an absolute path; tilde paths are not expanded (got ${JSON.stringify(dir)}); use dir="$HOME/..." or dir="$(pwd)"`,
    };
  }
  if (dir !== undefined && !isAbsolutePath(dir)) {
    return {
      ok: false,
      error: `op-emit-lazy-skills failed: --dir must be an absolute path (got ${JSON.stringify(dir)}); pass dir="$(pwd)" from inside your working directory`,
    };
  }
  const out: { issueId: string; destDir?: string } = { issueId: id };
  if (dir !== undefined) out.destDir = dir;
  return { ok: true, value: out };
}

export function parseExportModuleParams(
  params: Record<string, string>,
): ParamsResult<
  | { mode: "id"; moduleId: string }
  | { mode: "project"; projectSlug: string }
> {
  const moduleId = nonEmptyTrim(params.id ?? params.module);
  const projectSlug = nonEmptyTrim(params.project ?? params.slug);
  if (moduleId && projectSlug) {
    return {
      ok: false,
      error:
        "op-export-module failed: pass either --id (single module) or --project (bundle), not both.",
    };
  }
  if (moduleId) return { ok: true, value: { mode: "id", moduleId } };
  if (projectSlug) return { ok: true, value: { mode: "project", projectSlug } };
  return {
    ok: false,
    error: "op-export-module failed: --id or --project is required.",
  };
}

export function parseImportModuleParams(
  params: Record<string, string>,
): ParamsResult<{
  sourcePath: string;
  scope?: "global" | "project";
  project?: string;
  varAnswers: Record<string, string>;
}> {
  const sourcePath = nonEmptyTrim(params.path ?? params.source);
  if (!sourcePath) {
    return { ok: false, error: "op-import-module failed: --path is required." };
  }
  let scope: "global" | "project" | undefined;
  if (params.scope !== undefined) {
    const v = params.scope.trim().toLowerCase();
    if (v !== "global" && v !== "project") {
      return {
        ok: false,
        error: `op-import-module failed: --scope must be \"global\" or \"project\" (got ${JSON.stringify(params.scope)}).`,
      };
    }
    scope = v;
  }
  const project = nonEmptyTrim(params.project ?? params.slug);
  if (scope === "project" && !project) {
    return {
      ok: false,
      error: "op-import-module failed: --project is required when --scope=project.",
    };
  }
  // Per-var prefix-keyed answers (var.<name>=<value>) and packed `vars=name=val\nname2=val2`.
  // Both forms accepted (matches OP-204's parseLaunchVarsFromUri pattern); the
  // CLI surface shares the contract with the URI handler.
  const varAnswers: Record<string, string> = {};
  const nameRe = /^[A-Za-z_][A-Za-z0-9_-]*$/;
  for (const [k, v] of Object.entries(params)) {
    if (!k.startsWith("var.")) continue;
    const name = k.slice(4);
    if (!name || !nameRe.test(name)) continue;
    if (typeof v !== "string") continue;
    varAnswers[name] = v;
  }
  // Packed form via `vars=` packed list.
  const packed = nonEmptyTrim(params.vars);
  if (packed) {
    for (const entry of packed.split(/[\n,]/).map((s) => s.trim()).filter(Boolean)) {
      const eq = entry.indexOf("=");
      if (eq <= 0) continue;
      const name = entry.slice(0, eq).trim();
      if (!nameRe.test(name)) continue;
      varAnswers[name] = entry.slice(eq + 1);
    }
  }
  const out: {
    sourcePath: string;
    scope?: "global" | "project";
    project?: string;
    varAnswers: Record<string, string>;
  } = { sourcePath, varAnswers };
  if (scope) out.scope = scope;
  if (project) out.project = project;
  return { ok: true, value: out };
}

export function parseSetTasksParams(
  params: Record<string, string>,
): ParamsResult<{ id: string; body: string; append: boolean }> {
  const id = params.issue ?? params.id;
  const body = params.body ?? params.content;
  if (!id || typeof body !== "string") {
    return { ok: false, error: "op-set-tasks failed: --issue and --body required" };
  }
  const append = params.append === "1" || params.append === "true";
  return { ok: true, value: { id, body, append } };
}

export function parseTaskCreateParams(
  params: Record<string, string>,
): ParamsResult<{
  issueId: string;
  taskId?: string;
  title: string;
  body?: string;
  status?: "pending" | "in-progress" | "completed" | "blocked";
}> {
  const issueId = params.issue ?? params.id;
  const title = params.title;
  if (!issueId || !title) {
    return { ok: false, error: "op-task-create failed: --issue and --title required" };
  }
  const out: {
    issueId: string;
    taskId?: string;
    title: string;
    body?: string;
    status?: "pending" | "in-progress" | "completed" | "blocked";
  } = { issueId, title };
  const taskId = nonEmptyTrim(params.taskId ?? params.task);
  if (taskId !== undefined) out.taskId = taskId;
  const body = params.body;
  if (typeof body === "string" && body.length > 0) out.body = body;
  const status = nonEmptyTrim(params.status);
  if (status !== undefined) {
    if (
      status !== "pending" &&
      status !== "in-progress" &&
      status !== "completed" &&
      status !== "blocked"
    ) {
      return {
        ok: false,
        error: `op-task-create failed: --status must be one of pending|in-progress|completed|blocked (got ${JSON.stringify(status)})`,
      };
    }
    out.status = status;
  }
  return { ok: true, value: out };
}

export function parseTaskSetStatusParams(
  params: Record<string, string>,
): ParamsResult<{ taskId: string; status: "pending" | "in-progress" | "completed" | "blocked" }> {
  const taskId = nonEmptyTrim(params.taskId ?? params.task ?? params.id);
  const status = nonEmptyTrim(params.status);
  if (!taskId) return { ok: false, error: "op-task-set-status failed: --taskId is required" };
  if (!status) return { ok: false, error: "op-task-set-status failed: --status is required" };
  if (
    status !== "pending" &&
    status !== "in-progress" &&
    status !== "completed" &&
    status !== "blocked"
  ) {
    return {
      ok: false,
      error: `op-task-set-status failed: --status must be one of pending|in-progress|completed|blocked (got ${JSON.stringify(status)})`,
    };
  }
  return { ok: true, value: { taskId, status } };
}

export function parseTaskAppendNoteParams(
  params: Record<string, string>,
): ParamsResult<{ taskId: string; body: string }> {
  const taskId = nonEmptyTrim(params.taskId ?? params.task ?? params.id);
  const body = params.body ?? params.content;
  if (!taskId || typeof body !== "string") {
    return { ok: false, error: "op-task-append-note failed: --taskId and --body required" };
  }
  return { ok: true, value: { taskId, body } };
}

export function parseAppendNoteParams(
  params: Record<string, string>,
): ParamsResult<{ id: string; body: string }> {
  const id = params.issue ?? params.id;
  const body = params.body ?? params.content;
  if (!id || typeof body !== "string") {
    return { ok: false, error: "op-append-note failed: --issue and --body required" };
  }
  return { ok: true, value: { id, body } };
}

export function parseDocCreateParams(
  params: Record<string, string>,
): ParamsResult<{ slug: string; docType: string; title: string; body?: string }> {
  const slug = nonEmptyTrim(params.project ?? params.slug);
  const docType = nonEmptyTrim(params.doc_type ?? params.docType ?? params.type);
  const title = params.title;
  if (!slug || !docType || !title) {
    return {
      ok: false,
      error: "op-doc-create failed: --project, --doc_type, --title all required",
    };
  }
  const out: { slug: string; docType: string; title: string; body?: string } = {
    slug,
    docType,
    title,
  };
  const body = params.body;
  if (typeof body === "string" && body.length > 0) out.body = body;
  return { ok: true, value: out };
}

export function parseDocEditParams(
  params: Record<string, string>,
): ParamsResult<{ path: string; section?: string; body: string; append: boolean }> {
  const path = nonEmptyTrim(params.path);
  const body = params.body ?? params.content;
  if (!path || typeof body !== "string") {
    return { ok: false, error: "op-doc-edit failed: --path and --body required" };
  }
  const out: { path: string; section?: string; body: string; append: boolean } = {
    path,
    body,
    append: params.append === "1" || params.append === "true",
  };
  const section = nonEmptyTrim(params.section);
  if (section !== undefined) out.section = section;
  return { ok: true, value: out };
}

export function parseFlushVaultHistoryParams(
  params: Record<string, string>,
): ParamsResult<{ issueId: string; subject?: string }> {
  const issueId = nonEmptyTrim(params.issue ?? params.id);
  if (!issueId) {
    return { ok: false, error: "op-flush-vault-history failed: --issue is required" };
  }
  const subject = nonEmptyTrim(params.subject ?? params.message);
  const out: { issueId: string; subject?: string } = { issueId };
  if (subject !== undefined) out.subject = subject;
  return { ok: true, value: out };
}

export function parseWorkflowParams(
  params: Record<string, string>,
): ParamsResult<{ project?: string; prefix?: string; step: string }> {
  const project = nonEmptyTrim(params.project ?? params.slug);
  const prefix = nonEmptyTrim(params.prefix);
  if (!project && !prefix) {
    return { ok: false, error: "op-workflow failed: --project or --prefix is required" };
  }
  if (project && prefix) {
    return { ok: false, error: "op-workflow failed: pass --project or --prefix, not both" };
  }
  const step = nonEmptyTrim(params.step) ?? "kickoff";
  return { ok: true, value: { project, prefix, step } };
}

export function parseListVarsParams(
  params: Record<string, string>,
): ParamsResult<{ project?: string; issue?: string }> {
  const project = nonEmptyTrim(params.project ?? params.slug);
  const issue = nonEmptyTrim(params.issue ?? params.id);
  const out: { project?: string; issue?: string } = {};
  if (project !== undefined) out.project = project;
  if (issue !== undefined) out.issue = issue;
  return { ok: true, value: out };
}
