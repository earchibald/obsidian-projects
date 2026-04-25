import { App, TFile } from "obsidian";
import type { IssueStore } from "./issueStore";
import type { IssueEntry } from "./types";

export interface WorkIssueArgs {
  /**
   * Optional agent identity to record on the issue (`fm.agent`). Pass the
   * agent type id ("claude", "gemini", "copilot", …) — the plugin trusts
   * whatever non-empty string the caller supplies and does not enforce the
   * `AgentId` enum, so newer skills can register identifiers the running
   * plugin doesn't yet know about.
   */
  agent?: string;
  /**
   * Opaque per-session identifier. The skill is responsible for choosing a
   * value that's stable across `op-work` re-invocations within the same
   * session (e.g. `$CLAUDE_SESSION_ID`). The plugin only compares strings.
   */
  agentSession?: string;
  /**
   * When true, override an existing different-agent or different-session
   * registration instead of reporting a conflict. Status flip and task seed
   * still happen either way; this flag only affects the registration write.
   */
  force?: boolean;
}

export interface WorkIssueRegistration {
  agent: string;
  session?: string;
}

export interface WorkIssueConflict {
  /** Existing agent value if it differs from the one passed in. */
  agent?: string;
  /** Existing session value if it differs from the one passed in. */
  session?: string;
}

export interface WorkIssueResult {
  issueId: string;
  path: string;
  previousStatus: string;
  createdTaskPath?: string;
  /**
   * `true` when registration was written (or no registration was attempted —
   * caller passed neither `agent` nor `agentSession`). `false` only when a
   * conflict was detected and `force` was not set.
   */
  registered: boolean;
  /** Final registration state on disk after this call. Undefined when no agent fields are set. */
  registration?: WorkIssueRegistration;
  /** Set when the existing registration matched what the caller passed in. */
  alreadyHeld?: boolean;
  /** Set when the existing registration differed from the caller's values. */
  conflict?: WorkIssueConflict;
}

export async function workIssue(
  app: App,
  store: IssueStore,
  entry: IssueEntry,
  args: WorkIssueArgs = {},
): Promise<WorkIssueResult> {
  const file = app.vault.getAbstractFileByPath(entry.path);
  if (!(file instanceof TFile)) {
    throw new Error(`Issue file not found on disk: ${entry.path}`);
  }

  const wantAgent = nonEmpty(args.agent);
  const wantSession = nonEmpty(args.agentSession);
  const attemptingRegister = wantAgent !== undefined || wantSession !== undefined;

  let previousStatus = entry.status;
  let registered = !attemptingRegister; // no-op registration counts as "registered"
  let alreadyHeld = false;
  let conflict: WorkIssueConflict | undefined;
  let finalAgent: string | undefined;
  let finalSession: string | undefined;

  await app.fileManager.processFrontMatter(file, (fm) => {
    previousStatus = typeof fm.status === "string" ? fm.status : previousStatus;
    fm.status = "in-progress";

    const existingAgent = nonEmpty(fm.agent);
    const existingSession = nonEmpty(fm.agent_session);
    finalAgent = existingAgent;
    finalSession = existingSession;

    if (!attemptingRegister) return;

    const agentMatches =
      wantAgent === undefined || existingAgent === undefined || existingAgent === wantAgent;
    const sessionMatches =
      wantSession === undefined ||
      existingSession === undefined ||
      existingSession === wantSession;

    const hasConflict = !agentMatches || !sessionMatches;

    if (hasConflict && !args.force) {
      conflict = {};
      if (!agentMatches) conflict.agent = existingAgent;
      if (!sessionMatches) conflict.session = existingSession;
      registered = false;
      return;
    }

    if (wantAgent !== undefined) {
      fm.agent = wantAgent;
      finalAgent = wantAgent;
    }
    if (wantSession !== undefined) {
      fm.agent_session = wantSession;
      finalSession = wantSession;
    } else if (!agentMatches) {
      // Force-taking over from a different agent without supplying a new session:
      // clear the stale session that belonged to the previous agent so the issue
      // doesn't end up with mismatched agent/agent_session fields.
      delete fm.agent_session;
      finalSession = undefined;
    }

    if (
      !hasConflict &&
      ((wantAgent === undefined || existingAgent === wantAgent) &&
        (wantSession === undefined || existingSession === wantSession)) &&
      (existingAgent !== undefined || existingSession !== undefined)
    ) {
      alreadyHeld = true;
    }

    registered = true;
  });

  const existingTasks = store.tasks().filter((t) => t.id.startsWith(`${entry.id}.`));
  let createdTaskPath: string | undefined;
  if (existingTasks.length === 0) {
    createdTaskPath = await createDefaultTask(app, entry);
  }

  const result: WorkIssueResult = {
    issueId: entry.id,
    path: entry.path,
    previousStatus,
    createdTaskPath,
    registered,
  };
  if (finalAgent) {
    result.registration = finalSession
      ? { agent: finalAgent, session: finalSession }
      : { agent: finalAgent };
  }
  if (alreadyHeld) result.alreadyHeld = true;
  if (conflict) result.conflict = conflict;
  return result;
}

function nonEmpty(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

async function createDefaultTask(app: App, entry: IssueEntry): Promise<string> {
  const folder = `Projects/${entry.project}/TASKS`;
  if (!app.vault.getAbstractFileByPath(folder)) {
    await app.vault.createFolder(folder);
  }
  const taskId = `${entry.id}.1`;
  const path = `${folder}/${taskId} work.md`;
  if (app.vault.getAbstractFileByPath(path)) return path;

  const issueBasename = entry.path.split("/").pop()!.replace(/\.md$/, "");
  const content = [
    "---",
    `id: ${taskId}`,
    `issue: "[[${issueBasename}]]"`,
    `project: ${entry.project}`,
    "type: task",
    "status: pending",
    "tags:",
    `  - project/${entry.project}`,
    "  - task",
    "---",
    "",
    `# Work on ${entry.id}`,
    "",
    "Default task created by `op:work`. Replace with a real breakdown when scope is known.",
    "",
  ].join("\n");

  await app.vault.create(path, content);
  return path;
}
