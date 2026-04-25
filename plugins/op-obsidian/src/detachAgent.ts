import type { App } from "obsidian";
import { closeWindow as itermCloseWindow } from "./iterm/driver";
import {
  cleanupAgentSessions,
  type CleanupResult,
} from "./agentSessionCleanup";
import { clearAgentOnIssue } from "./openAgent";
import type { IssueStore } from "./issueStore";
import type { OpSettings } from "./settings";

export interface DetachAgentArgs {
  app: App;
  store: IssueStore;
  settings: OpSettings;
  saveSettings: () => Promise<void>;
  issueId: string;
  /** Override iTerm window-closer for tests. Defaults to the real driver. */
  closeITermWindow?: (windowId: string) => Promise<void>;
}

export interface DetachAgentResult {
  ok: boolean;
  issueId: string;
  /** Issue note path whose `agent:` field was cleared, if found. */
  path?: string;
  /** Did we find a matching issue note? */
  found: boolean;
  /** True iff `clearAgentOnIssue` ran (issue was found AND a TFile). */
  cleared: boolean;
  /** Forwarded from cleanupAgentSessions — useful for the URI/CLI payload. */
  killed: CleanupResult["killed"];
  prunedSurfaces: CleanupResult["prunedSurfaces"];
  closedWindows: CleanupResult["closedWindows"];
  error?: string;
}

/**
 * `op: detach agent` — kill the issue's tmux window (if any) and clear the
 * `agent:` frontmatter. Idempotent: safe to run when the window is already
 * gone (covers crash zombies where SessionEnd never fired).
 */
export async function detachAgent(
  args: DetachAgentArgs,
): Promise<DetachAgentResult> {
  const id = args.issueId;
  const entry = args.store.byId(id);
  const issueEntry = entry && entry.type === "issue" ? entry : undefined;
  const path = issueEntry?.path;

  let cleanup: CleanupResult = { killed: [], prunedSurfaces: [], closedWindows: [] };
  try {
    cleanup = await cleanupAgentSessions({
      tmuxBinary: args.settings.tmuxBinary,
      reg: args.settings.orchestratorState,
      issueIds: [id],
      closeITermWindow: args.closeITermWindow ?? ((wid) => itermCloseWindow(wid)),
    });
    if (
      cleanup.killed.length ||
      cleanup.prunedSurfaces.length ||
      cleanup.closedWindows.length
    ) {
      await args.saveSettings();
    }
  } catch (err: any) {
    return {
      ok: false,
      issueId: id,
      path,
      found: !!issueEntry,
      cleared: false,
      killed: cleanup.killed,
      prunedSurfaces: cleanup.prunedSurfaces,
      closedWindows: cleanup.closedWindows,
      error: err?.message ?? String(err),
    };
  }

  let cleared = false;
  if (path) {
    try {
      await clearAgentOnIssue(args.app, path);
      cleared = true;
    } catch (err: any) {
      return {
        ok: false,
        issueId: id,
        path,
        found: !!issueEntry,
        cleared: false,
        killed: cleanup.killed,
        prunedSurfaces: cleanup.prunedSurfaces,
        closedWindows: cleanup.closedWindows,
        error: err?.message ?? String(err),
      };
    }
  }

  return {
    ok: true,
    issueId: id,
    path,
    found: !!issueEntry,
    cleared,
    killed: cleanup.killed,
    prunedSurfaces: cleanup.prunedSurfaces,
    closedWindows: cleanup.closedWindows,
  };
}
