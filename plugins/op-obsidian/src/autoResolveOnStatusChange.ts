import type { IssueEntry, IssueStatus, LifecycleEvent } from "./types";

export interface AutoResolveArgs {
  path: string;
  status: "resolved" | "wontfix";
}

const TERMINAL: ReadonlySet<IssueStatus> = new Set<IssueStatus>(["resolved", "wontfix"]);

/**
 * Decide whether a `issue:status-changed` event should trigger an auto-resolve
 * (move to RESOLVED ISSUES/ + trash linked tasks + gh close) that the plugin's
 * `runResolve` would otherwise perform.
 *
 * Fires only when the user (or an external writer) flipped a non-agent issue's
 * status to a terminal value without going through the plugin's resolve path.
 * Agent-owned issues (`entry.agent` non-empty) are intentionally skipped so the
 * agent can finish its own lifecycle; the user can clear `agent:` first to opt
 * back in.
 *
 * Returns `null` when the event should be ignored.
 */
export function shouldAutoResolve(
  ev: LifecycleEvent,
  inFlightResolvePaths: ReadonlySet<string>,
): AutoResolveArgs | null {
  if (ev.kind !== "issue:status-changed") return null;
  const { entry, prev } = ev;
  if (entry.status !== "resolved" && entry.status !== "wontfix") return null;
  if (TERMINAL.has(prev)) return null;
  if (entry.resolvedFolder) return null;
  if (entry.agent && entry.agent.trim().length > 0) return null;
  if (inFlightResolvePaths.has(entry.path)) return null;
  return { path: entry.path, status: entry.status };
}

export const _test = { TERMINAL, makeIssueEntry };

function makeIssueEntry(partial: Partial<IssueEntry> & Pick<IssueEntry, "path" | "status">): IssueEntry {
  return {
    type: "issue",
    id: "X-1",
    project: "x",
    title: "t",
    resolvedFolder: false,
    ...partial,
  } as IssueEntry;
}
