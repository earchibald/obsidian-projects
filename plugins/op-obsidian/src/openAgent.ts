import { App, TFile } from "obsidian";
import { notify } from "./notificationLog";
import type { IssueStore } from "./issueStore";
import type { IssueEntry } from "./types";
import type { OpSettings } from "./settings";
import {
  AGENT_IDS,
  asAgentId,
  type AgentId,
  type AgentLaunchMode,
  type AgentProfile,
  launchFlagsFor,
  mergeProfile,
  modeToWorkflowStep,
  normalizeMode,
  postLaunchCommandsFor,
} from "./agentProfiles";
import { buildPrompt } from "./promptBuild";
import { gitBranchAt } from "./gitBranch";
import { buildRenderContext } from "./pluginVarRegistry";
import { workIssue } from "./workIssue";
import { dispatchPostLaunch } from "./postLaunchDispatch";
import { renderTemplate } from "./renderTemplate";
import { resolveWorkingDir } from "./workingDir";
import { launchInTerminal } from "./terminalLaunch";
import { buildRenderContext } from "./pluginVarRegistry";
import { renderTemplate } from "./renderTemplate";
import { colorRegistry } from "./colorRegistry";
import { dispatchPostLaunch } from "./postLaunchDispatch";
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
import {
  openRecoveryDialog,
  type RecoveryDialogOutcome,
} from "./recoveryDialog";
import { contextWindowFor, validateModelName } from "./modelRegistry";

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
  /**
   * OP-204 (3d): per-launch user-var overrides forwarded into the composer's
   * Launch precedence layer (level 4). Sourced from the launch modal's
   * "Workflow variables" panel, the URI parser's `var.<name>=<value>` keys,
   * and `advanceFlowAndLaunch` carry-through. A non-empty map is persisted
   * to the issue's `launch_vars:` frontmatter so the next auto-advanced stage
   * inherits the same overrides; an empty/absent map writes nothing.
   */
  launchVars?: Record<string, string>;
  /**
   * OP-205 (3e): launch-only model override. When set, the resolver
   * short-circuits its own `model:` walk and uses this canonical model id.
   * The workflow file is left untouched — this is the "Use as launch
   * override" path from the recovery dialog.
   *
   * Validated against `modelRegistry` for the resolver's chosen agent at
   * launch time; an invalid override throws `BadModelSpecError` (which
   * re-opens the recovery dialog rather than silently substituting).
   */
  launchModelOverride?: string;
  /**
   * OP-205 (3e): whether this launch is a user-initiated interactive launch
   * (default `true`) or a headless auto-advance (set `false`). On resolver
   * failure, interactive launches open the recovery dialog directly;
   * headless launches surface the existing actionable Notice with an "Open
   * recovery dialog now" link. Headless ↔ "user is not at the keyboard."
   */
  interactive?: boolean;
  /**
   * OP-205 (3e): notified when the recovery dialog resolves after a launch
   * failure. The caller can use this to retry the launch (with
   * `launchModelOverride` set) on `override` / `patched` outcomes. `null` /
   * undefined → the dialog opens with a no-op resolver, matching the OP-200
   * behavior where the user re-launches by hand.
   */
  onResolverFailureResolved?: (outcome: RecoveryDialogOutcome) => void;
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

type AgentSelectionSource = "override" | "workflow" | "default" | "single-installed" | "picker";

interface AgentSelection {
  agentId: AgentId;
  source: AgentSelectionSource;
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

  // OP-200 (2c): per-step resolver. Skipped when the user has explicitly
  // indicated they want to choose the agent themselves — workflow declarations
  // are a default, not a hard constraint. There are three bypass conditions:
  //   • args.agentOverride — caller already nominated a specific agent (e.g.
  //     a URI-dispatch with agent= or an auto-advance with a fixed agent id).
  //   • args.forcePick — the invoking command requested "always show the
  //     picker" for this launch. Honouring the user's intent means the
  //     workflow file must not pre-empt the modal.
  //   • settings.alwaysPick — user-level preference; same rationale as
  //     forcePick.
  // When any bypass fires, resolved = null and pickAgent handles agent
  // selection normally (modal or default — pickAgent checks mustPick itself).
  // Model resolution is also skipped on bypass because the model spec is
  // bound to the workflow's declared agent; a user-chosen agent may differ.
  let resolved: ResolveStepOutput | null;
  try {
    resolved = args.agentOverride || args.forcePick || settings.alwaysPick
      ? null
      : await loadAndResolveStep(
          app,
          args.entry.project,
          mode,
          detection,
          settings.defaultAgent,
          args.launchModelOverride,
        );
  } catch (err) {
    if (err instanceof BadModelSpecError || err instanceof NoInstalledAgentError) {
      surfaceResolverError(
        app,
        args.entry,
        err,
        args.interactive ?? true,
        args.onResolverFailureResolved,
      );
      return undefined;
    }
    throw err;
  }

  const selection = resolved?.agent
    ? { agentId: resolved.agent, source: "workflow" as const }
    : await pickAgent(app, settings, detection, args);
  if (!selection) return undefined;
  const agentId = selection.agentId;
  console.info("[op-obsidian] openAgent selection", {
    issueId: args.entry.id,
    mode,
    selectedAgent: agentId,
    source: selection.source,
    requestedOverride: args.agentOverride ?? null,
    storedIssueAgent: asAgentId(args.entry.agent) ?? null,
    workflowAgent: resolved?.agent ?? null,
    defaultAgent: settings.defaultAgent,
    forcePick: !!args.forcePick,
  });

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
  // OP-204 (3d): canonicalise launchVars before plumbing further. We accept
  // both a non-empty Record and undefined; downstream callers (the composer,
  // the carry-through writer) want a stable Record either way.
  const launchVars = args.launchVars && Object.keys(args.launchVars).length > 0
    ? { ...args.launchVars }
    : {};
  const prompt = await buildPrompt(app, store, {
    entry: args.entry,
    profile,
    injection: settings.injection,
    vaultBasePath,
    mode,
    workflowMode: settings.workflowMode,
    workflowVars: settings.workflowVars,
    launchVars,
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

  // OP-204 (3d): persist or clear `launch_vars:` symmetrically with the
  // launch we're about to fire. Non-empty map → write; explicit empty map
  // (`launchVars: {}` from the modal's "reset all" path) → clear so the
  // auto-advance carry-through doesn't keep an old override alive after the
  // user took it back.
  if (args.launchVars !== undefined) {
    await writeLaunchVarsOnIssue(app, args.entry.path, launchVars);
  }

  const { scriptPath, tmuxSession, tmuxWindow, windowId } = await launchInTerminal({
    cwd: wd.path,
    binary: det.path ?? profile.binary,
    launchFlags,
    prompt,
    terminalApp: settings.terminal,
    iTermPlacement: settings.iTermPlacement,
    tmuxBinary: settings.tmuxBinary,
    issueId: args.entry.id,
    issueTitle: args.entry.title,
    // OP-179: append ` [Parent: <PARENT-ID>]` to the iTerm tab/window/session
    // label when this issue has a parent. Sourced from the parsed entry; if
    // the entry's `parent` is missing (legacy issue not yet re-indexed), fall
    // back to a fresh metadata-cache read so newly-set parents take effect on
    // the next launch without an editor round-trip.
    parentId: args.entry.parent ?? readParentId(app, args.entry.path) ?? undefined,
    agentId,
    backgroundLaunch: settings.backgroundLaunch,
    // OP-234: forward the resolver's canonical model + its registry-known
    // context-window budget into the orchestrator so the new SurfaceRef.agent
    // block records them on launch. Both stay undefined when the launch
    // bypassed the resolver (agentOverride / forcePick / alwaysPick) — the
    // dashboard renders `model —` / `ctx —` per OP-217 §UI.
    model: resolved?.canonicalModel,
    contextWindowSize: contextWindowFor(resolved?.canonicalModel),
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

  const renderContext = buildRenderContext({
    entry: args.entry,
    profile,
    launch: {
      mode: normalizeMode(mode),
      model: resolved?.canonicalModel,
      branch,
      repo_path: wd.path,
      vault_path: vaultBasePath ?? "",
      vault_name: app.vault.getName(),
      today: new Date().toISOString().slice(0, 10),
      parent: parentId,
    },
  });
  const color = colorRegistry.assign({
    issueId: args.entry.id,
    parentId,
    windowKey: resolveSessionDecorationWindowKey(settings, windowId),
    palette: settings.sessionDecoration.palette,
  });
  const sessionName = truncateSessionName(
    renderTemplate(settings.sessionDecoration.nameTemplate, renderContext).text,
  );
  const commands = buildPostLaunchCommands({
    profile,
    mode,
    renderContext,
    color,
    name: sessionName,
  }).filter((command) => shouldSendPostLaunchCommand(command, settings));
  if (
    settings.sessionDecoration.autoRemoteControl &&
    !commands.some((command) => command.trim() === "/remote-control")
  ) {
    commands.push("/remote-control");
  }
  if (commands.length > 0 && profile.postLaunchReadinessRegex) {
    void dispatchPostLaunch({
      tmuxBinary: settings.tmuxBinary,
      tmuxSession,
      tmuxWindow,
      commands,
      readinessRegex: new RegExp(profile.postLaunchReadinessRegex),
      interCommandDelayMs: settings.sessionDecoration.interCommandDelayMs,
    }).catch((err) => {
      console.error("[op-obsidian] post-launch dispatch failed", err);
    });
  }

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

function resolveSessionDecorationWindowKey(settings: OpSettings, windowId: string | undefined): string {
  if (settings.terminal === "Terminal") return "terminal:default";
  if (settings.orchestrator.enabled && windowId) return `iterm:${windowId}`;
  return "iterm:legacy";
}

function buildPostLaunchCommands(args: {
  profile: AgentProfile;
  mode: AgentLaunchMode;
  renderContext: ReturnType<typeof buildRenderContext>;
  color: string;
  name: string;
}): string[] {
  return postLaunchCommandsFor(args.profile, args.mode).map((template) =>
    renderTemplate(template, args.renderContext).text
      .replace(/\{\{\s*color\s*\}\}/g, args.color)
      .replace(/\{\{\s*name\s*\}\}/g, args.name),
  );
}

function shouldSendPostLaunchCommand(command: string, settings: OpSettings): boolean {
  const trimmed = command.trim();
  if (trimmed.startsWith("/color ")) return settings.sessionDecoration.autoColor;
  if (trimmed.startsWith("/rename ")) return settings.sessionDecoration.autoRename;
  if (trimmed === "/remote-control") return settings.sessionDecoration.autoRemoteControl;
  return true;
}

function truncateSessionName(name: string): string {
  const collapsed = name.replace(/\s+/g, " ").trim();
  return collapsed.length <= 40 ? collapsed : collapsed.slice(0, 40).trimEnd();
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
): Promise<AgentSelection | undefined> {
  if (args.agentOverride) return { agentId: args.agentOverride, source: "override" };

  const installed = AGENT_IDS.filter((id) => detection?.[id]?.installed);
  if (installed.length === 0) {
    notify("op: no supported agent binaries found on PATH");
    return undefined;
  }

  const mustPick = args.forcePick || settings.alwaysPick;
  const defaultId = settings.defaultAgent;

  if (!mustPick && installed.includes(defaultId)) {
    return { agentId: defaultId, source: "default" };
  }
  if (!mustPick && installed.length === 1) {
    return { agentId: installed[0], source: "single-installed" };
  }

  return new Promise((resolve) => {
    new AgentPickerModal(
      app,
      installed,
      defaultId,
      (id) => resolve(id ? { agentId: id, source: "picker" } : undefined),
    ).open();
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
 * OP-204 (3d): write the `launch_vars:` mapping to the issue's frontmatter
 * (non-empty input) or clear it (empty input). The auto-advance handoff
 * (`advanceFlowAndLaunch`) reads this so a level-4 override the user set in
 * stage N is still active in stage N+1. `op-resolve` clears it via
 * {@link clearLaunchVarsOnIssue}, symmetric with `agent:` clearance.
 *
 * Empty map writes `delete fm.launch_vars` rather than `fm.launch_vars = {}`
 * so the field disappears entirely from the YAML — `metadataCache` callers
 * downstream see "no launch overrides" with no syntactic sugar to scrape.
 *
 * No-op when `path` doesn't resolve to a {@link TFile}; the launch already
 * happened and the user can re-open the issue manually if the note moved
 * mid-launch (vault rename race).
 */
export async function writeLaunchVarsOnIssue(
  app: App,
  path: string,
  launchVars: Record<string, string>,
): Promise<void> {
  const file = app.vault.getAbstractFileByPath(path);
  if (!(file instanceof TFile)) return;
  await app.fileManager.processFrontMatter(file, (fm) => {
    if (Object.keys(launchVars).length === 0) {
      delete fm.launch_vars;
    } else {
      fm.launch_vars = { ...launchVars };
    }
  });
}

/**
 * OP-204 (3d): clear `launch_vars:` from the issue's frontmatter. Used by
 * `op-resolve` so a resolved issue doesn't carry stale overrides forward if
 * it's ever re-opened.
 */
export async function clearLaunchVarsOnIssue(app: App, path: string): Promise<void> {
  const file = app.vault.getAbstractFileByPath(path);
  if (!(file instanceof TFile)) return;
  await app.fileManager.processFrontMatter(file, (fm) => {
    delete fm.launch_vars;
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
  launchModelOverride: string | undefined,
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
  // Run the agent walk + model walk normally. We need the chosen agent in
  // hand before we can validate `launchModelOverride` (the override is bound
  // to the resolver's chosen agent — picking a claude alias when the resolver
  // walked into gemini would be incoherent).
  const resolved = resolveStepAgentAndModel({
    step,
    workflow,
    detection,
    fallbackAgent,
  });

  if (launchModelOverride !== undefined) {
    // OP-205 (3e): honour the launch override. Validate against the chosen
    // agent's registry; an invalid override throws BadModelSpecError so the
    // recovery dialog re-opens (we never silently substitute).
    const v = validateModelName(resolved.agent, launchModelOverride, stepName);
    if (!v.ok) {
      throw new BadModelSpecError(
        stepName,
        resolved.agent,
        [{ name: launchModelOverride, classification: { kind: "typo" } }],
        "typo",
        v.bad,
      );
    }
    return {
      agent: resolved.agent,
      canonicalModel: v.canonicalId,
      agentSource: resolved.agentSource,
      modelSource: "step",
    };
  }

  return resolved;
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
  if (!model || (agentId !== "claude" && agentId !== "claude-ds")) return launchFlags;
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
  entry: IssueEntry,
  err: BadModelSpecError | NoInstalledAgentError,
  interactive: boolean,
  onResolved: ((outcome: RecoveryDialogOutcome) => void) | undefined,
): void {
  const summary =
    err instanceof BadModelSpecError
      ? `${entry.id}: bad model spec for step "${err.stepId}" (${err.reason}) — "${err.bad.badName}" not usable for "${err.chosenAgent}"`
      : `${entry.id}: no installed agent for step "${err.stepId}" — tried ${err.attemptedAgents.join(", ")}`;
  console.warn("[op-obsidian] openAgent resolver failure", err);
  const handler = onResolved ?? ((): void => {});
  if (interactive) {
    // OP-205 (3e): the user is at the keyboard — open the modal directly.
    // The Notice indirection adds a click for nothing on this path.
    openRecoveryDialog({
      app,
      issueId: entry.id,
      project: entry.project ?? "",
      error: err,
      mode: "launch",
      onResolved: handler,
    });
    return;
  }
  // Headless auto-advance: the user wasn't watching. Surface the actionable
  // Notice so they can click into the dialog when they come back.
  showActionableNotice({
    text: summary,
    actions: [
      {
        label: "Open recovery dialog now",
        onClick: () =>
          openRecoveryDialog({
            app,
            issueId: entry.id,
            project: entry.project ?? "",
            error: err,
            mode: "launch",
            onResolved: handler,
          }),
      },
    ],
  });
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
