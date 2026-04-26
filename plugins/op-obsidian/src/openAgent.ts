import { App, TFile } from "obsidian";
import { notify } from "./notificationLog";
import type { IssueStore } from "./issueStore";
import type { IssueEntry } from "./types";
import type { OpSettings } from "./settings";
import {
  AGENT_IDS,
  type AgentId,
  type AgentLaunchMode,
  type AgentProfile,
  launchFlagsFor,
  mergeProfile,
  modeToWorkflowStep,
} from "./agentProfiles";
import { buildPrompt } from "./promptBuild";
import { gitBranchAt } from "./gitBranch";
import { workIssue } from "./workIssue";
import { resolveWorkingDir } from "./workingDir";
import { launchInTerminal } from "./terminalLaunch";
import type { AgentDetector, DetectionMap } from "./agentDetect";
import { AgentPickerModal } from "./modals";
import { userError } from "./userError";
import { iTermDefaultsDomainPresent, showITermTmuxPrefsNotice } from "./iTermPrefs";
import { loadWorkflowFile } from "./workflowFile";
import {
  BadModelSpecError,
  NoInstalledAgentError,
  resolveStepAgentAndModel,
  type ResolveStepOutput,
} from "./stepResolver";
import { showActionableNotice } from "./actionableNotices";
import { openRecoveryDialog } from "./recoveryDialog";

/** Arguments accepted by {@link openAgent}. */
export interface OpenAgentArgs {
  /** The issue the agent will work on. `entry.path` must point at a real note. */
  entry: IssueEntry;
  /** Skip detection / defaults and force this agent. */
  agentOverride?: AgentId;
  /** Always show the picker modal even when a default would satisfy the pick. */
  forcePick?: boolean;
  /** `"work"` (default) flips the issue to `in-progress`; `"plan"` is read-only. */
  mode?: AgentLaunchMode;
}

/** Result payload returned when a launch succeeds. */
export interface OpenAgentResult {
  issueId: string;
  agent: AgentId;
  mode: AgentLaunchMode;
  /** Absolute path that the agent's shell was cd'd into. */
  workingDir: string;
  /** Path to the generated launch script (useful for debugging failures). */
  scriptPath: string;
  /** Shared tmux session name (always `op-agents`). */
  tmuxSession: string;
  /** tmux window name — equals the issue id. */
  tmuxWindow: string;
}

/**
 * Launch an agent session for `args.entry`.
 *
 * High-level flow:
 *  1. Resolve an agent id (arg override → default → picker modal).
 *  2. Verify the agent binary is on PATH via the cached {@link AgentDetector}.
 *  3. Resolve the working directory; abort with a `Notice` if none configured.
 *  4. Write `fm.agent` up front so the sidebar badge reflects intent even if
 *     the terminal launch later throws (OP-71).
 *  5. In `"work"` mode, call `workIssue` to flip status → `in-progress` and
 *     create the first TASKS note (OP-93).
 *  6. Build the prompt and shell out via {@link launchInTerminal}.
 *
 * @returns The {@link OpenAgentResult}, or `undefined` if the launch was
 *   cancelled (no agent installed, user dismissed the picker, working dir
 *   missing). Any cancellation path also surfaces an Obsidian `Notice`.
 * @throws Propagates errors from `launchInTerminal` (tmux failure, iTerm
 *   AppleScript failure). The issue's `fm.agent` is left set so the sidebar
 *   reflects the attempted launch.
 */
export async function openAgent(
  app: App,
  store: IssueStore,
  settings: OpSettings,
  detector: AgentDetector,
  saveSettings: () => Promise<void>,
  args: OpenAgentArgs,
): Promise<OpenAgentResult | undefined> {
  const detection = detector.get() ?? (await detector.refresh());
  const mode: AgentLaunchMode = args.mode ?? "work";

  // OP-200 (2c): per-step resolver. Runs only when the user did NOT manually
  // override the agent (manual picker wins over the workflow file's
  // declarations — workflow declarations are a default, not a hard
  // constraint). The resolver also fires when args.agentOverride is unset
  // and the workflow file declares an agent the user's settings.defaultAgent
  // doesn't match. On a BadModelSpecError / NoInstalledAgentError the launch
  // is cancelled and the user sees an actionable Notice with a recovery seam.
  let resolved: ResolveStepOutput | null;
  try {
    resolved = args.agentOverride
      ? null
      : await loadAndResolveStep(app, args.entry.project, mode, detection, settings.defaultAgent);
  } catch (err) {
    if (err instanceof BadModelSpecError || err instanceof NoInstalledAgentError) {
      surfaceResolverError(app, args.entry.id, err);
      return undefined;
    }
    throw err;
  }

  const agentId = resolved?.agent ?? (await pickAgent(app, settings, detection, args));
  if (!agentId) return undefined;

  const profile = resolveProfile(settings, agentId);

  const det = detection[agentId];
  if (!det.installed) {
    notify(`op: ${agentId} binary not found on PATH (looking for "${profile.binary}")`);
    return undefined;
  }

  const wd = await resolveWorkingDir(app, settings, args.entry, saveSettings);
  if (!wd) {
    userError(
      `op: working directory required for ${args.entry.project} — launch cancelled`,
      `Set \`repo_path:\` in Projects/${args.entry.project}/STATUS.md, or re-open the agent and fill in the working-dir prompt.`,
    );
    return undefined;
  }

  // Write fm.agent up front so the sidebar badge reflects the user's intent
  // even if the terminal/orchestrator launch later throws (OP-71). The resolve
  // flow clears it on issue close, and the SessionEnd hook clears it on
  // genuine session exit — both still apply.
  await recordAgentOnIssue(app, args.entry.path, agentId);

  // OP-93: flip status to in-progress and seed the TASKS note here, so the
  // agent inherits a started issue. Auto-mode agents otherwise often skipped
  // op-work and jumped open → resolved, leaving no in-progress trail. Read-only
  // modes (evaluate / plan / review) leave the issue untouched; finalize also
  // flips because it owns the resolve cycle and needs the in-progress trail.
  const flipsToInProgress = mode === "work" || mode === "implement" || mode === "finalize";
  if (flipsToInProgress && args.entry.status !== "resolved" && args.entry.status !== "wontfix") {
    try {
      await workIssue(app, store, args.entry);
      args.entry.status = "in-progress";
    } catch (err) {
      console.error("[op-obsidian] op-open-agent: pre-launch op-work failed", err);
      notify(`op: failed to mark ${args.entry.id} in-progress before launch — agent should run op-work itself`);
    }
  }

  const vaultBasePath = getVaultBasePath(app);
  // OP-199 (2b): launch-context plumbing for the modules-mode composer.
  // - `branch` via fail-soft `git rev-parse --abbrev-ref HEAD` at the
  //   working dir. ~20–80ms per launch; tolerable on a user-initiated
  //   action. Errors → undefined, surfaced as a `missing-var` diagnostic.
  // - `parentId` from the issue's frontmatter via `metadataCache`. Null
  //   when no parent (or no cache entry yet).
  // - `repoPath` is just `wd.path` — the directory the agent is cd'ing
  //   into. Modules referencing `{{repo_path}}` resolve to this.
  const branch = await gitBranchAt(wd.path);
  const parentId = readParentId(app, args.entry.path);
  const prompt = await buildPrompt(app, store, {
    entry: args.entry,
    profile,
    injection: settings.injection,
    vaultBasePath,
    mode,
    workflowMode: settings.workflowMode,
    workflowVars: settings.workflowVars,
    workflowStep: modeToWorkflowStep(mode),
    repoPath: wd.path,
    branch,
    parentId,
    resolvedModel: resolved?.canonicalModel,
  });

  // OP-200 (2c): when the resolver picked a canonical model, append it as a
  // launch flag. claude is the only first-class agent today; gemini and
  // copilot have empty `launchFlags` and no model-flag support yet, so the
  // resolved model is reflected in the prompt (`{{model}}`) but not on their
  // CLI invocations.
  const launchFlags = withModelFlag(launchFlagsFor(profile, mode), agentId, resolved?.canonicalModel);

  const { scriptPath, tmuxSession, tmuxWindow } = await launchInTerminal({
    cwd: wd.path,
    binary: det.path ?? profile.binary,
    launchFlags,
    prompt,
    terminalApp: settings.terminal,
    iTermPlacement: settings.iTermPlacement,
    tmuxBinary: settings.tmuxBinary,
    issueId: args.entry.id,
    issueTitle: args.entry.title,
    agentId,
    backgroundLaunch: settings.backgroundLaunch,
    orchestrator: {
      settings,
      registry: {
        get: () => settings.orchestratorState,
        save: async (reg) => {
          settings.orchestratorState = reg;
          await saveSettings();
        },
      },
    },
  });

  // OP-155 §4 Step 4: first iTerm launch — surface the one-time prefs Notice
  // and persist the bit. Flip the bit synchronously *before* yielding to the
  // event loop so a second concurrent op-open-agent invocation (near-
  // simultaneous user actions) sees the gate closed and doesn't double-fire
  // the Notice. maybeShowITermPrefsNotice rolls it back to false if iTerm is
  // absent (so the Notice can fire on the next launch) or if saving fails.
  if (settings.terminal === "iTerm" && !settings.iTermPrefsNoticeShown) {
    settings.iTermPrefsNoticeShown = true; // optimistic — rolled back on failure
    void maybeShowITermPrefsNotice(settings, saveSettings);
  }

  return {
    issueId: args.entry.id,
    agent: agentId,
    mode,
    workingDir: wd.path,
    scriptPath,
    tmuxSession,
    tmuxWindow,
  };
}

async function maybeShowITermPrefsNotice(
  settings: OpSettings,
  saveSettings: () => Promise<void>,
): Promise<void> {
  try {
    if (!(await iTermDefaultsDomainPresent())) {
      // iTerm absent — roll back optimistic bit so the Notice can fire again
      // when iTerm is eventually installed.
      settings.iTermPrefsNoticeShown = false;
      return;
    }
    showITermTmuxPrefsNotice();
    await saveSettings();
  } catch (err) {
    settings.iTermPrefsNoticeShown = false; // roll back so retry is possible
    console.warn("[op-obsidian] iTerm prefs Notice failed:", err);
  }
}

async function pickAgent(
  app: App,
  settings: OpSettings,
  detection: ReturnType<AgentDetector["get"]> | Awaited<ReturnType<AgentDetector["refresh"]>>,
  args: OpenAgentArgs,
): Promise<AgentId | undefined> {
  if (args.agentOverride) return args.agentOverride;

  const installed = AGENT_IDS.filter((id) => detection?.[id]?.installed);
  if (installed.length === 0) {
    notify("op: no supported agent binaries found on PATH");
    return undefined;
  }

  const mustPick = args.forcePick || settings.alwaysPick;
  const defaultId = settings.defaultAgent;

  if (!mustPick && installed.includes(defaultId)) return defaultId;
  if (!mustPick && installed.length === 1) return installed[0];

  return new Promise((resolve) => {
    new AgentPickerModal(app, installed, defaultId, (id) => resolve(id)).open();
  });
}

/**
 * Merge the user's overlay (from settings) on top of the built-in profile for
 * `id`. The result is the fully-resolved profile used at launch time —
 * `binary`, `launchFlags`, `promptPreamble`, etc.
 */
export function resolveProfile(settings: OpSettings, id: AgentId): AgentProfile {
  return mergeProfile(id, settings.agentOverlays[id]);
}

/**
 * Write `agent: <id>` into the issue note's frontmatter. Used by the sidebar
 * badge and by the SessionEnd hook to reconcile stale state. No-op if the
 * path does not resolve to a {@link TFile}.
 */
export async function recordAgentOnIssue(app: App, path: string, agentId: AgentId): Promise<void> {
  const file = app.vault.getAbstractFileByPath(path);
  if (!(file instanceof TFile)) return;
  await app.fileManager.processFrontMatter(file, (fm) => {
    fm.agent = agentId;
  });
}

/**
 * Remove `agent:` from the issue note's frontmatter. Called by `op-resolve`
 * and the SessionEnd hook when an agent session genuinely ends. No-op if the
 * path does not resolve to a {@link TFile}.
 */
export async function clearAgentOnIssue(app: App, path: string): Promise<void> {
  const file = app.vault.getAbstractFileByPath(path);
  if (!(file instanceof TFile)) return;
  await app.fileManager.processFrontMatter(file, (fm) => {
    delete fm.agent;
    delete fm.agent_session;
  });
}

function getVaultBasePath(app: App): string | undefined {
  const adapter = app.vault.adapter as unknown as { basePath?: string; getBasePath?: () => string };
  if (typeof adapter.getBasePath === "function") return adapter.getBasePath();
  if (typeof adapter.basePath === "string") return adapter.basePath;
  return undefined;
}

/**
 * OP-199 (2b): pull `parent:` from the issue's frontmatter via metadataCache.
 * Returns `null` when:
 *  - the path doesn't resolve to a `TFile`,
 *  - the metadata cache has no entry yet (early launches in a fresh session,
 *    or ENOENT race when the note is being moved mid-launch) — `null` is the
 *    safe default: the composer renders it as `PARENT_NONE_SENTINEL` and the
 *    launch proceeds,
 *  - the frontmatter has no `parent:` key, or
 *  - the value isn't a string.
 *
 * **Array parents** (`parent: [OP-1, OP-2]`): YAML arrays are not strings, so
 * `typeof raw === "string"` is false and we return `null`. Multi-parent is
 * not yet a first-class concept in op — the first parent is not silently
 * plucked because doing so would hide a configuration mismatch from the
 * author. A future iteration can surface a diagnostic and render the first
 * element if multi-parent ever lands.
 *
 * The composer renders a `null` parent as `PARENT_NONE_SENTINEL`, so callers
 * never see a stray `{{parent}}` token in module bodies — even when no
 * parent is set.
 */
/**
 * OP-200 (2c): load the project's `WORKFLOW.md` (if any) and resolve the
 * per-step `agent` + `model` overrides for the launch's mode. Returns `null`
 * when there's no workflow file, the file couldn't be salvaged, or the file
 * has no record for the active step (in which case the launch falls back to
 * the user's `settings.defaultAgent` and the agent CLI's default model).
 *
 * Throws `BadModelSpecError` / `NoInstalledAgentError` on resolver failure;
 * the caller catches and surfaces an actionable Notice via `recoveryDialog`.
 */
async function loadAndResolveStep(
  app: App,
  project: string | undefined,
  mode: AgentLaunchMode,
  detection: DetectionMap,
  fallbackAgent: AgentId,
): Promise<ResolveStepOutput | null> {
  if (!project) return null;
  const { workflow } = await loadWorkflowFile(app, project);
  if (!workflow) return null;
  const stepName = modeToWorkflowStep(mode);
  const step = workflow.steps.find((s) => s.step === stepName);
  // No record for this step → no per-step override. The OP-199 lenient
  // kickoff fallback covers prompt-injection separately; here we just opt
  // out of the resolver and let the launch use the caller's defaults.
  if (!step && (!workflow.defaultAgent || workflow.defaultAgent.length === 0)) {
    return null;
  }
  return resolveStepAgentAndModel({
    step,
    workflow,
    detection,
    fallbackAgent,
  });
}

/**
 * OP-200 (2c): append `--model <id>` to claude's launch flags when the
 * resolver picked a canonical model. Other agents are second-class; their
 * launch flags are empty by default and no equivalent flag is wired here.
 * Idempotent: a no-op when `model` is undefined.
 */
function withModelFlag(
  launchFlags: string[],
  agentId: AgentId,
  model: string | undefined,
): string[] {
  if (!model || agentId !== "claude") return launchFlags;
  return [...launchFlags, "--model", model];
}

/**
 * OP-200 (2c): surface a resolver failure as an actionable Notice with two
 * action links — "Open recovery dialog now" (delegates to the
 * `recoveryDialog` seam, which OP-?-3e replaces with the interactive picker)
 * and "Open WORKFLOW.md" (jumps the user to the file they need to edit).
 *
 * The Notice is sticky (no auto-dismiss) so the user can't miss the failure
 * — silently dropping the launch with only a console.error would let
 * auto-advance dead-end the chain, which is exactly what 2c rules out.
 */
function surfaceResolverError(
  app: App,
  issueId: string,
  err: BadModelSpecError | NoInstalledAgentError,
): void {
  const summary =
    err instanceof BadModelSpecError
      ? `${issueId}: bad model spec for step "${err.stepId}" (${err.reason}) — "${err.bad.badName}" not usable for "${err.chosenAgent}"`
      : `${issueId}: no installed agent for step "${err.stepId}" — tried ${err.attemptedAgents.join(", ")}`;
  showActionableNotice({
    text: summary,
    actions: [
      {
        label: "Open recovery dialog now",
        onClick: () => openRecoveryDialog({ app, issueId, error: err }),
      },
    ],
  });
  console.warn("[op-obsidian] openAgent resolver failure", err);
}

function readParentId(app: App, path: string): string | null {
  const file = app.vault.getAbstractFileByPath(path);
  if (!(file instanceof TFile)) return null;
  const cache = app.metadataCache.getFileCache(file);
  const fm = cache?.frontmatter;
  if (!fm) return null;
  const raw = fm.parent;
  return typeof raw === "string" && raw.trim().length > 0 ? raw : null;
}
