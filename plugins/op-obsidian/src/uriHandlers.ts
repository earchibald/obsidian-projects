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
import type { ResolveArgs, ResolveStatus } from "./resolve";

export interface UriHandlerDeps {
  store: { issues(): IssueEntry[] };
  workIssue: (entry: IssueEntry) => Promise<WorkIssueResult>;
  appendCommit: (entry: IssueEntry, input: { sha: string; subject: string }) => Promise<AppendCommitResult>;
  setPr: (entry: IssueEntry, url: string) => Promise<SetPrResult>;
  setScope: (entry: IssueEntry, scope: string) => Promise<SetScopeResult>;
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

export async function handleOpSetScopeUri(
  deps: UriHandlerDeps,
  params: Record<string, string>,
): Promise<UriResponsePayload> {
  const id = params.id ?? params.issue;
  const scope = params.scope;
  if (!id || typeof scope !== "string") {
    throw new Error("op-set-scope URI requires id and scope");
  }
  const entry = findIssueById(deps.store, id);
  const res = await deps.setScope(entry, scope);
  return {
    ok: true,
    command: "op-set-scope",
    issueId: res.issueId,
    path: res.path,
    replaced: res.replaced,
  };
}
