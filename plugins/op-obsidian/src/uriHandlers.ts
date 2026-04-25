// Pure URI-handler bodies, dependency-injected so they can be tested without
// loading the obsidian module. Each handler pulls params from the incoming
// Record<string, string>, resolves the issue via the injected store, and
// delegates the actual vault mutation to the injected action. main.ts wires
// the real `this.app`/`this.store`-bound actions; tests pass fakes.

import type { IssueEntry } from "./types";
import type { UriResponsePayload } from "./uriResponse";
import type { WorkIssueResult } from "./workIssue";
import type { AppendCommitResult } from "./commits";
import type { SetPrResult } from "./commits";
import type { SetScopeResult } from "./setScope";
import type { SetEvaluationResult } from "./setEvaluation";
import type { SetFlowResult, Flow, Complexity } from "./setFlow";
import type { ResolveArgs, ResolveStatus } from "./resolve";
import type { ApplyLinkResult, LinkCheckResult, MigrateLinksResult } from "./links";
import type { GetWorkflowResult } from "./workflow";

export interface UriHandlerDeps {
  store: { issues(): IssueEntry[] };
  workIssue: (entry: IssueEntry) => Promise<WorkIssueResult>;
  appendCommit: (entry: IssueEntry, input: { sha: string; subject: string }) => Promise<AppendCommitResult>;
  setPr: (entry: IssueEntry, url: string) => Promise<SetPrResult>;
  setScope: (
    entry: IssueEntry,
    scope: string,
    options?: { mode?: "scope" | "body" },
  ) => Promise<SetScopeResult>;
  setEvaluation: (entry: IssueEntry, evaluation: string) => Promise<SetEvaluationResult>;
  setFlow: (
    entry: IssueEntry,
    input: { flow?: Flow | null; complexity?: Complexity | null },
  ) => Promise<SetFlowResult>;
  applyLink?: (args: {
    srcId: string;
    dstId: string;
    relation: string;
  }) => Promise<ApplyLinkResult>;
  removeLink?: (args: {
    srcId: string;
    dstId: string;
    relation: string;
  }) => Promise<ApplyLinkResult>;
  linkCheck?: (opts: { repair?: boolean }) => Promise<LinkCheckResult>;
  migrateLinks?: () => Promise<MigrateLinksResult>;
  getWorkflow?: (project: string) => Promise<GetWorkflowResult>;
}

export function findIssueById(store: { issues(): IssueEntry[] }, id: string): IssueEntry {
  const entry = store.issues().find((e) => e.id === id);
  if (!entry) throw new Error(`Issue not found: ${id}`);
  return entry;
}

export function resolveUriArgs(params: Record<string, string>): ResolveArgs {
  const status =
    params.status === "wontfix"
      ? ("wontfix" as ResolveStatus)
      : params.status === "resolved"
        ? ("resolved" as ResolveStatus)
        : undefined;
  return {
    issue: params.issue || params.id || undefined,
    path: params.path || undefined,
    status,
    confirmed: params.confirmed === "1" || params.confirmed === "true",
  };
}

export async function handleOpWorkUri(
  deps: UriHandlerDeps,
  params: Record<string, string>,
): Promise<UriResponsePayload> {
  const id = params.id ?? params.issue;
  if (!id) throw new Error("op-work URI requires id");
  const entry = findIssueById(deps.store, id);
  const res = await deps.workIssue(entry);
  return {
    ok: true,
    command: "op-work",
    issueId: res.issueId,
    path: res.path,
    previousStatus: res.previousStatus,
    createdTaskPath: res.createdTaskPath,
  };
}

export async function handleOpAppendCommitUri(
  deps: UriHandlerDeps,
  params: Record<string, string>,
): Promise<UriResponsePayload> {
  const id = params.id ?? params.issue;
  const sha = params.sha;
  const subject = params.subject;
  if (!id || !sha || !subject) {
    throw new Error("op-append-commit URI requires id, sha, subject");
  }
  const entry = findIssueById(deps.store, id);
  const res = await deps.appendCommit(entry, { sha, subject });
  return {
    ok: true,
    command: "op-append-commit",
    issueId: res.issueId,
    path: res.path,
    entry: res.entry,
    added: res.added,
    commits: res.commits,
  };
}

export async function handleOpSetPrUri(
  deps: UriHandlerDeps,
  params: Record<string, string>,
): Promise<UriResponsePayload> {
  const id = params.id ?? params.issue;
  const url = params.url ?? params.pr;
  if (!id || !url) throw new Error("op-set-pr URI requires id and url");
  const entry = findIssueById(deps.store, id);
  const res = await deps.setPr(entry, url);
  return {
    ok: true,
    command: "op-set-pr",
    issueId: res.issueId,
    path: res.path,
    pr: res.pr,
  };
}

const FLOW_ENUM = ["evaluate", "planning", "implementation", "review", "finalization", "done"] as const;
const COMPLEXITY_ENUM = ["simple", "complex"] as const;

export async function handleOpSetEvaluationUri(
  deps: UriHandlerDeps,
  params: Record<string, string>,
): Promise<UriResponsePayload> {
  const id = params.id ?? params.issue;
  const evaluation = params.evaluation;
  if (!id || typeof evaluation !== "string") {
    throw new Error("op-set-evaluation URI requires id and evaluation");
  }
  const entry = findIssueById(deps.store, id);
  const res = await deps.setEvaluation(entry, evaluation);
  return {
    ok: true,
    command: "op-set-evaluation",
    issueId: res.issueId,
    path: res.path,
    replaced: res.replaced,
  };
}

export async function handleOpSetFlowUri(
  deps: UriHandlerDeps,
  params: Record<string, string>,
): Promise<UriResponsePayload> {
  const id = params.id ?? params.issue;
  if (!id) throw new Error("op-set-flow URI requires id");
  const hasFlow = Object.prototype.hasOwnProperty.call(params, "flow");
  const hasComplexity = Object.prototype.hasOwnProperty.call(params, "complexity");
  if (!hasFlow && !hasComplexity) {
    throw new Error("op-set-flow URI requires flow and/or complexity");
  }
  const input: { flow?: Flow | null; complexity?: Complexity | null } = {};
  if (hasFlow) {
    const v = params.flow;
    if (v === "" || v === "null") {
      input.flow = null;
    } else if ((FLOW_ENUM as readonly string[]).includes(v)) {
      input.flow = v as Flow;
    } else {
      throw new Error(
        `op-set-flow URI flow must be one of ${FLOW_ENUM.join("|")} (or "null" to clear)`,
      );
    }
  }
  if (hasComplexity) {
    const v = params.complexity;
    if (v === "" || v === "null") {
      input.complexity = null;
    } else if ((COMPLEXITY_ENUM as readonly string[]).includes(v)) {
      input.complexity = v as Complexity;
    } else {
      throw new Error(
        `op-set-flow URI complexity must be one of ${COMPLEXITY_ENUM.join("|")} (or "null" to clear)`,
      );
    }
  }
  const entry = findIssueById(deps.store, id);
  const res = await deps.setFlow(entry, input);
  return {
    ok: true,
    command: "op-set-flow",
    issueId: res.issueId,
    path: res.path,
    flow: res.flow ?? undefined,
    complexity: res.complexity ?? undefined,
  };
}

export async function handleOpSetLinkUri(
  deps: UriHandlerDeps,
  params: Record<string, string>,
): Promise<UriResponsePayload> {
  if (!deps.applyLink) throw new Error("op-set-link not wired");
  const srcId = params.issue ?? params.id ?? params.src;
  const dstId = params.target ?? params.dst;
  const relation = params.relation;
  if (!srcId || !dstId || !relation) {
    throw new Error("op-set-link URI requires issue, relation, target");
  }
  const res = await deps.applyLink({ srcId, dstId, relation });
  return { ...res };
}

export async function handleOpRemoveLinkUri(
  deps: UriHandlerDeps,
  params: Record<string, string>,
): Promise<UriResponsePayload> {
  if (!deps.removeLink) throw new Error("op-remove-link not wired");
  const srcId = params.issue ?? params.id ?? params.src;
  const dstId = params.target ?? params.dst;
  const relation = params.relation;
  if (!srcId || !dstId || !relation) {
    throw new Error("op-remove-link URI requires issue, relation, target");
  }
  const res = await deps.removeLink({ srcId, dstId, relation });
  return { ...res };
}

export async function handleOpLinkCheckUri(
  deps: UriHandlerDeps,
  params: Record<string, string>,
): Promise<UriResponsePayload> {
  if (!deps.linkCheck) throw new Error("op-link-check not wired");
  const repair = params.repair === "1" || params.repair === "true";
  const res = await deps.linkCheck({ repair });
  return { ...res };
}

export async function handleOpMigrateLinksUri(
  deps: UriHandlerDeps,
  _params: Record<string, string>,
): Promise<UriResponsePayload> {
  if (!deps.migrateLinks) throw new Error("op-migrate-links not wired");
  const res = await deps.migrateLinks();
  return { ...res };
}

export async function handleOpGetWorkflowUri(
  deps: UriHandlerDeps,
  params: Record<string, string>,
): Promise<UriResponsePayload> {
  if (!deps.getWorkflow) throw new Error("op-get-workflow not wired");
  const project = params.project ?? params.slug;
  if (!project) throw new Error("op-get-workflow URI requires project");
  const res = await deps.getWorkflow(project);
  return {
    ok: true,
    command: "op-get-workflow",
    project: res.project,
    path: res.path,
    exists: res.exists,
    content: res.content,
    size: res.size,
  };
}

export async function handleOpSetScopeUri(
  deps: UriHandlerDeps,
  params: Record<string, string>,
): Promise<UriResponsePayload> {
  const id = params.id ?? params.issue;
  const scope = params.scope;
  if (!id || typeof scope !== "string") {
    throw new Error("op-set-scope URI requires id and scope");
  }
  const rawMode = params.mode;
  let mode: "scope" | "body" | undefined;
  if (rawMode !== undefined) {
    if (rawMode !== "scope" && rawMode !== "body") {
      throw new Error("op-set-scope URI mode must be 'scope' or 'body'");
    }
    mode = rawMode;
  }
  const entry = findIssueById(deps.store, id);
  const res = await deps.setScope(entry, scope, mode ? { mode } : undefined);
  return {
    ok: true,
    command: "op-set-scope",
    issueId: res.issueId,
    path: res.path,
    replaced: res.replaced,
    mode: res.mode,
  };
}
