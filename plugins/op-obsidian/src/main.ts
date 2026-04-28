import { Notice, Plugin, TFile, WorkspaceLeaf, type Editor, type MarkdownView } from "obsidian";
import { OP_SIDEBAR_VIEW_TYPE, OpSidebarView } from "./sidebarView";
import { revealAgentSession } from "./revealAgentSession";
import { findAgentTmuxLocation } from "./agentTmuxLocation";
import { captureTmuxPane } from "./tmuxCapture";
import { EventBus } from "./eventBus";
import { IssueStore } from "./issueStore";
import { createIssue, type CreateIssueInput, type Priority } from "./createIssue";
import { findIssue } from "./findIssue";
import { applyProjectOrder, listProjects } from "./projects";
import {
  AppendCommitModal,
  FindIssueModal,
  IssuePickerModal,
  ModulePickerModal,
  NewIssueModal,
  NewModuleIdModal,
  ProjectSuggestModal,
  RelationPickerModal,
  ScaffoldProjectModal,
  SetGithubIssueModal,
  SetPrModal,
} from "./modals";
import { scaffoldProject, type ScaffoldProjectResult } from "./scaffoldProject";
import { workIssue, type WorkIssueResult } from "./workIssue";
import { appendCommit, setPr } from "./commits";
import { getWorkflow } from "./workflow";
import { getSkill } from "./skill";
import { setScope } from "./setScope";
import { parseNewScopePayload, type NewScopeMode } from "./setScopePure";
import { setEvaluation } from "./setEvaluation";
import { setSection } from "./setSection";
import { setFlow, type Complexity, type Flow } from "./setFlow";
import {
  applyLink,
  listDanglingLinkedIds,
  listLinkedTargets,
  removeLink,
  linkCheck,
  migrateLinks,
} from "./links";
import { RELATION_NAMES, type RelationName } from "./relations";
import { runEvaluatorFlow, EVALUATOR_MAX_WORKFLOW_CHARS } from "./evaluator";
import { launchHeadlessSubtask } from "./launchHeadlessSubtask";
import { makeTmuxRelay } from "./relaySession";
import { composeWorkflowSection } from "./promptBuild";
import { gitBranchAt } from "./gitBranch";
import { modeToWorkflowStep } from "./agentProfiles";
import {
  flowAdvanceDecision,
  type FlowAdvanceOutput,
  type FlowExitStatus,
} from "./flowOrchestrator";
import {
  closeGithubIssue,
  createGithubIssue,
  setGithubIssue,
} from "./github";
import { closeReasonForStatus } from "./githubPure";
import { resolveRepoPath } from "./repoPath";
import { writeUriResponse, type UriResponsePayload } from "./uriResponse";
import { normalizeUriParams, collectRepeated, parseLaunchVarsFromUri } from "./uriParams";
import { runResolve, type ResolveArgs } from "./resolve";
import { shouldAutoResolve } from "./autoResolveOnStatusChange";
import {
  findIssueById as findIssueByIdPure,
  resolveUriArgs as resolveUriArgsPure,
  handleOpWorkUri as handleOpWorkUriPure,
  handleOpAppendCommitUri as handleOpAppendCommitUriPure,
  handleOpSetPrUri as handleOpSetPrUriPure,
  handleOpSetScopeUri as handleOpSetScopeUriPure,
  handleOpSetEvaluationUri as handleOpSetEvaluationUriPure,
  handleOpSetSectionUri as handleOpSetSectionUriPure,
  handleOpSetFlowUri as handleOpSetFlowUriPure,
  handleOpSetLinkUri as handleOpSetLinkUriPure,
  handleOpRemoveLinkUri as handleOpRemoveLinkUriPure,
  handleOpLinkCheckUri as handleOpLinkCheckUriPure,
  handleOpMigrateLinksUri as handleOpMigrateLinksUriPure,
  handleOpGetWorkflowUri as handleOpGetWorkflowUriPure,
  handleOpGetSkillUri as handleOpGetSkillUriPure,
  handleOpExplainWorkflowUri as handleOpExplainWorkflowUriPure,
  handleOpListVarsUri as handleOpListVarsUriPure,
  type UriHandlerDeps,
} from "./uriHandlers";
import {
  parseWorkParams,
  parseAppendCommitParams,
  parseSetPrParams,
  parseSetScopeParams,
  parseSetEvaluationParams,
  parseSetSectionParams,
  parseSetFlowParams,
  parseNewParams,
  parseSetLinkParams,
  parseRemoveLinkParams,
  parseLinkCheckParams,
  parseGetWorkflowParams,
  parseEditWorkflowParams,
  parseEditModuleParams,
  parseGetSkillParams,
  parseExplainWorkflowParams,
  parseListVarsParams,
  parseExportModuleParams,
  parseImportModuleParams,
} from "./cliHandlers";
import { explainWorkflow, listVars } from "./explainWorkflow";
import {
  summarizeExplainPayload,
} from "./explainWorkflowPure";
import { summarizeListVarsPayload } from "./listVarsPure";
import type { IssueEntry, LifecycleEvent } from "./types";
import { DEFAULT_SETTINGS, mergeSettings, OpSettingsTab, type OpSettings } from "./settings";
import { AgentDetector } from "./agentDetect";
import { AGENT_IDS, isAgentLaunchMode, type AgentId, type AgentLaunchMode } from "./agentProfiles";
import { openAgent, clearAgentOnIssue, resolveProfile } from "./openAgent";
import { readLaunchVarsFromFrontmatter } from "./varOverridePanelPure";
import { openLaunchAgentModal } from "./launchAgentModal";
import { editWorkflow } from "./editWorkflow";
import { editModule } from "./editModule";
import { exportModules } from "./exportModule";
import { commitImport, prepareImport } from "./importModule";
import { undoLastImport } from "./undoLastImport";
import { loadModules } from "./workflowModule";
import { loadWorkflowFile } from "./workflowFile";
import {
  openRecoveryDialog,
  synthesizeBadModelErrorFromDiagnostic,
} from "./recoveryDialog";
import { revertLastWorkflowPatch, type VaultLike, type VaultFileLike } from "./recoveryPatchApply";
import { VarEditorSuggest } from "./varSuggestObsidian";
import { readAgentList, readModelScalarOrList } from "./varSuggest";
import { launchInTerminal, SHARED_TMUX_SESSION, tmuxWindowName } from "./terminalLaunch";
import { installAgentHooks, type HookInstallResult } from "./agentHooks";
import { userError } from "./userError";
import { cleanupAgentSessions, tmuxSessionsForCleanup } from "./agentSessionCleanup";
import { detachAgent } from "./detachAgent";
import { detectTmux } from "./tmuxDetect";
import { notify, notifyAction, registerApp, unregisterApp, openNotificationLog } from "./notificationLog";
import { probeLiveTmuxWindows, selectStaleAgentBadges } from "./staleAgentBadges";
import { appendRecency, mostRecent } from "./recencyLog";
import { deriveTitle, packScope, resolveCaptureProject } from "./quickCapture";
import { openErrorLog, writeErrorLog } from "./errorLog";
import { configureClient } from "./iterm/client";
import { closeWindow as itermCloseWindow } from "./iterm/driver";
import { closeTransport } from "./iterm/connection";
import { existsSync } from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import { PickAndActModal } from "./pickAndActModal";
import {
  ChipDeps,
  dispatchChipRefresh,
  makeNoteChipPostProcessor,
  makeOpActionCodeBlockProcessor,
  noteChipExtension,
} from "./noteDecorations";
import type { GhStateCache } from "./noteStatusStrip";
import { workflowValidatorExtension } from "./editorWorkflowValidatorExtension";
import {
  DEMO_PROJECT_FOLDER,
  liveReadmeWriter,
  removeDemoProject,
  scaffoldDemoProject,
  scaffoldFirstRunReadme,
} from "./firstRunReadme";
import { applyPreset, defaultPreset } from "./hotkeyPreset";
import { colorRegistry } from "./colorRegistry";

const pExecFile = promisify(execFile);

/**
 * How long to wait after `onLayoutReady` before probing tmux for stale agent
 * badges. Gives `op-work` mid-flight at startup time to create its tmux window
 * so we don't fire a false-positive [Clear badge] Notice during that window.
 */
const STALE_AGENT_PROBE_DELAY_MS = 2_000;

/** Re-probe cadence for the OP-151 chip's "is the agent alive?" view.
 * 20s is an arbitrary balance: short enough that a freshly-killed
 * tmux window flips the chip within a Pomodoro break, long enough not
 * to spawn a `tmux list-windows` per second. */
const CHIP_LIVENESS_INTERVAL_MS = 20_000;

/**
 * The Obsidian plugin half of the Obsidian Projects workflow.
 *
 * Responsibilities:
 *  - Owns the {@link EventBus} and {@link IssueStore} for the vault's
 *    Projects tree, and re-emits lifecycle events (`issue:*`) as the user
 *    edits notes.
 *  - Registers every `op: …` command that shows up in the Obsidian command
 *    palette (scaffold, new issue, work, append commit, set PR, resolve,
 *    open agent, …).
 *  - Implements the `obsidian://op-*` URI surface used by the `op`
 *    Claude Code skill and its slash commands — each URI handler writes a
 *    structured JSON response to `Projects/_scratch/op-last-response.md`
 *    via {@link writeUriResponse}.
 *  - Orchestrates agent launches via {@link openAgent}, including the
 *    PreToolUse worktree guard (see `agentHooks.ts`).
 *
 * Lifecycle:
 *  - `onload` loads settings, auto-detects tmux, spins up the detector and
 *    store, registers commands + URI handlers, and reconciles stale agent
 *    registrations once the workspace is ready.
 *  - `onunload` tears down the store (via `addChild`) and clears the bus.
 */
export default class OpPlugin extends Plugin {
  /** In-process pub/sub for issue lifecycle events. */
  bus!: EventBus;
  /** Live index of every issue/task note in the vault's `Projects/` tree. */
  store!: IssueStore;
  /** Merged user settings (loaded from `data.json`, defaults applied). */
  settings: OpSettings = { ...DEFAULT_SETTINGS };
  /** Lazy `which` probe for agent binaries. */
  detector!: AgentDetector;
  /**
   * Vault paths currently inside a plugin-owned `runResolve` call. The
   * `issue:status-changed` auto-mover consults this set to avoid re-entering
   * resolve on the frontmatter write that `runResolve` itself performs.
   */
  private inFlightResolvePaths = new Set<string>();
  /** Last-known set of live tmux window names (`op:<ISSUE-ID>`). Populated
   * by the stale-agent probe on layout-ready and refreshed every
   * {@link CHIP_LIVENESS_INTERVAL_MS} so the OP-151 note chip can answer
   * "is this issue's agent alive?" without shelling out per render.
   * `null` ⇒ probe hasn't run or tmux unavailable; the chip treats that
   * as "alive" to avoid false-stale chips. */
  liveTmuxWindowsCache: Set<string> | null = null;
  private chipLivenessTimer: number | undefined;

  /** Persist the current {@link settings} object to `data.json`. */
  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  /**
   * Plugin bootstrap. Order matters — see inline comments for the reasons
   * behind the sequence (tmux auto-detect before detector, detector before
   * command registration, reconciler after `onLayoutReady`).
   */
  async onload(): Promise<void> {
    // Register the app for the persistent notification log before any
    // `notify(...)` call below — early Notices (tmux auto-detect failure,
    // detector probe, settings hydration warnings) are exactly the ones
    // users tend to dismiss by accident, so they belong in the log too.
    registerApp(this.app);
    this.settings = mergeSettings(await this.loadData());
    // OP-101: configure the iTerm WebSocket client with the plugin version so
    // its handshake includes a usable library-version header, and with a
    // per-plugin cache path so the `safeStorage`-encrypted cookie survives
    // reloads. The client only opens the socket lazily on first call; no
    // connection is made here.
    configureClient({
      version: this.manifest.version,
      cachePath: this.resolveCookieCachePath(),
    });
    // Auto-detect tmux if the configured path doesn't exist (stale default after
    // a fresh install on a non-Apple-Silicon machine, or brew relocated).
    if (!existsSync(this.settings.tmuxBinary)) {
      const found = detectTmux();
      if (found.path) {
        const prev = this.settings.tmuxBinary;
        this.settings.tmuxBinary = found.path;
        await this.saveSettings();
        console.debug(`[op-obsidian] tmux auto-detected: ${prev} → ${found.path}`);
      } else {
        notifyAction({
          text: `op: tmux not found at ${this.settings.tmuxBinary} or common paths — agent launches will fail until you install tmux or set the path in Settings → op.`,
          actions: [
            {
              label: "Open settings",
              onClick: () => {
                (this.app as any).setting?.open?.();
                (this.app as any).setting?.openTabById?.("op-obsidian");
              },
            },
          ],
        });
      }
    }
    this.detector = new AgentDetector((id) => {
      const overlay = this.settings.agentOverlays[id];
      return overlay?.binary ?? defaultBinaryFor(id);
    });
    // Kick a probe in the background so the first launch is instant. If the
    // probe itself throws (not just "binary not installed"), surface it — a
    // silent failure here leaves the user staring at an empty picker later.
    void this.detector.refresh().catch((err) => {
      console.debug("[op-obsidian] agent detection probe failed", err);
      userError(
        `op: agent detection probe failed — ${err?.message ?? err}`,
        "Settings → op → Agents will retry; if this persists, check the console for details.",
      );
    });

    this.addSettingTab(new OpSettingsTab(this.app, this));

    // OP-202: `{{` autocomplete + vars-block snippet for workflow modules
    // and per-project WORKFLOW.md files. The suggestor is a no-op on every
    // other note (its onTrigger gates on path), so registering globally is
    // safe — Obsidian dispatches triggers to any registered EditorSuggest.
    this.registerEditorSuggest(new VarEditorSuggest(this.app));

    this.bus = new EventBus();
    this.store = new IssueStore(this.app, this.bus);
    this.addChild(this.store);

    this.bus.on("*", (ev: LifecycleEvent) => {
      console.debug("[op-obsidian]", ev.kind, "entry" in ev ? ev.entry.path : ev.path);
    });

    // When an issue note is deleted, kill its agent tmux window and prune
    // the orchestrator registry — otherwise a re-used issue id (user deletes
    // then creates a new issue that happens to reuse the slot) reconnects
    // to the stale agent (OP-52).
    this.bus.on("issue:deleted", (ev) => {
      if (ev.kind !== "issue:deleted") return;
      return this.cleanupAgentStateFor([ev.prev.id]);
    });

    // Close the linked GitHub issue whenever an op issue transitions to a
    // terminal status, regardless of the path that made the change: the
    // `op-resolve` command, a raw CLI `property:set status=resolved`, or a
    // manual frontmatter edit in Obsidian. `withGhCloseHook` in `runResolve`
    // only covers paths that flow through the plugin's resolve logic; this
    // listener covers everything else. A double-fire with the hook is
    // harmless: `closeGithubIssue` is idempotent (pre-checks live state and
    // tolerates gh's "Could not close the issue" error on already-closed).
    this.bus.on("issue:status-changed", (ev) => {
      if (ev.kind !== "issue:status-changed") return;
      const { entry, prev } = ev;
      if (entry.status !== "resolved" && entry.status !== "wontfix") return;
      if (prev === "resolved" || prev === "wontfix") return;
      if (!entry.githubIssue) return;
      if (!this.settings.github.closeGithubIssueOnResolve) return;
      const repoPath = resolveRepoPath(this.app, this.settings, entry.project);
      if (!repoPath) {
        notify(`op: no repo_path for ${entry.project} — skipping gh issue close`);
        return;
      }
      const reason = closeReasonForStatus(entry.status);
      const url = entry.githubIssue;
      return closeGithubIssue(repoPath, url, reason).catch((err: any) => {
        const msg = err?.message ?? String(err);
        console.error("[op-obsidian] gh issue close failed", msg);
        void this.surfaceGhCloseError({ entryId: entry.id, repoPath, url, reason, msg });
      });
    });

    // Auto-resolve: when a user (or external writer) flips an issue's status
    // to `resolved`/`wontfix` outside `op-resolve` — manual frontmatter edit,
    // `obsidian property:set`, etc. — finish the resolve flow (move to
    // RESOLVED ISSUES/, trash linked TASKS, close linked gh issue if
    // configured). Agent-owned issues (`entry.agent` non-empty) are skipped
    // so the agent's own lifecycle isn't preempted. Re-entrancy is blocked
    // by `inFlightResolvePaths` (belt) and the prev-vs-next terminal guard
    // inside `shouldAutoResolve` (suspenders) — `runResolve` writes
    // frontmatter before renaming, which fires `issue:status-changed` again.
    this.bus.on("issue:status-changed", (ev) => {
      const args = shouldAutoResolve(ev, this.inFlightResolvePaths);
      if (!args) {
        if (ev.kind === "issue:status-changed") {
          console.debug(
            "[op-obsidian] auto-resolve skipped",
            ev.entry.path,
            ev.prev,
            "→",
            ev.entry.status,
          );
        }
        return;
      }
      return this.runResolveTracked({ ...args, confirmed: true })
        .then((result) => {
          if (!result.ok) {
            console.error("[op-obsidian] auto-resolve failed", args.path, result.error);
            notify(`op: auto-resolve failed — ${result.error ?? "unknown error"}`);
          }
        })
        .catch((err: any) => {
          const msg = err?.message ?? String(err);
          console.error("[op-obsidian] auto-resolve threw", args.path, msg);
          notify(`op: auto-resolve threw — ${msg}`);
        });
    });

    // Startup reconciliation: deletions that happened while the plugin
    // wasn't listening (Finder, CLI, or while Obsidian was closed) leave
    // stale tmux windows + registry surfaces. Reap any registry surface
    // whose issue no longer exists in the vault.
    this.app.workspace.onLayoutReady(() => {
      void this.reconcileAgentStateOnStartup();
      void this.surfaceStaleAgentBadgesOnStartup();
      // OP-161 / §10: drop the first-run README into the vault on the
      // very first plugin load. The flag flip is idempotent across reloads.
      void scaffoldFirstRunReadme(
        this.settings,
        liveReadmeWriter(this.app),
        () => this.saveSettings(),
      ).catch((err) => {
        console.error("[op-obsidian] first-run readme scaffold failed", err);
      });
    });

    // OP-151 (§2) + OP-162 (§11): note-level decoration infra. The
    // ViewPlugin paints the chip + strip in Live Preview; the
    // post-processor mirrors it in Reading mode; the codeblock processor
    // backs the README's `op-action` chips. All three feed off one
    // gh-state cache so a mode toggle doesn't re-fetch.
    const ghCache: GhStateCache = new Map();
    const chipDeps: ChipDeps = {
      app: this.app,
      isAgentLive: (id, agent) => this.isAgentLiveSync(id, agent),
      getSettings: () => ({
        view: { disableInlineGithubStatus: this.settings.view.disableInlineGithubStatus },
      }),
      ghCache,
      scheduleRefresh: () => dispatchChipRefresh(this.app),
    };
    this.registerEditorExtension(noteChipExtension(chipDeps));
    this.registerMarkdownPostProcessor(makeNoteChipPostProcessor(chipDeps));
    this.registerMarkdownCodeBlockProcessor(
      "op-action",
      makeOpActionCodeBlockProcessor(this.app),
    );

    // OP-207 (3g): editor-save validator paints squiggles + a status footer
    // for module / workflow files. Same registration shape as the chip — one
    // editor extension array, deps captured by closure.
    this.registerEditorExtension(
      workflowValidatorExtension({
        app: this.app,
        getSettings: () => this.settings,
        detector: this.detector,
      }),
    );

    // Re-render the chip when frontmatter changes so the label flips
    // promptly. The metadataCache `changed` event is debounced; the
    // refresh dispatcher is idempotent so multiple fires collapse.
    this.registerEvent(
      this.app.metadataCache.on("changed", () => dispatchChipRefresh(this.app)),
    );
    // Issue lifecycle changes (status flip, agent set/cleared) also
    // re-render — the bus already debounces internally.
    this.bus.on("issue:status-changed", () => dispatchChipRefresh(this.app));
    this.bus.on("issue:updated", () => dispatchChipRefresh(this.app));

    // Periodic liveness re-probe for the chip — the startup probe gives
    // us an initial set, but the chip needs to flip when an agent dies
    // mid-session. The interval is registered so plugin unload cancels
    // it; `probeLiveTmuxWindows` already swallows ENOENT/timeout.
    this.chipLivenessTimer = window.setInterval(async () => {
      // Skip the tmux probe entirely when no issue notes are currently
      // displayed — avoids shelling out every 20 s when the user is
      // working outside the issue tracker.
      let hasOpenIssueNote = false;
      this.app.workspace.iterateAllLeaves((leaf) => {
        if (hasOpenIssueNote) return;
        if (leaf.view.getViewType() !== "markdown") return;
        const file = (leaf.view as { file?: TFile }).file;
        if (!file) return;
        const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
        if (fm?.type === "issue") hasOpenIssueNote = true;
      });
      if (!hasOpenIssueNote) return;
      const next = await probeLiveTmuxWindows(
        this.settings.tmuxBinary,
        tmuxSessionsForCleanup(this.settings.orchestratorState),
      );
      if (!next.ok) {
        if (this.liveTmuxWindowsCache !== null) {
          this.liveTmuxWindowsCache = null;
          dispatchChipRefresh(this.app);
        }
        return;
      }
      const prev = this.liveTmuxWindowsCache;
      const sameSize = prev?.size === next.live.size;
      const same = sameSize && prev && [...next.live].every((x) => prev.has(x));
      if (same) return;
      this.liveTmuxWindowsCache = next.live;
      dispatchChipRefresh(this.app);
    }, CHIP_LIVENESS_INTERVAL_MS);
    this.register(() => {
      if (this.chipLivenessTimer !== undefined) {
        clearInterval(this.chipLivenessTimer);
        this.chipLivenessTimer = undefined;
      }
    });

    this.registerView(
      OP_SIDEBAR_VIEW_TYPE,
      (leaf: WorkspaceLeaf) =>
        new OpSidebarView(
          leaf,
          this.store,
          this.bus,
          () => this.settings.view,
          (entry) => {
            void this.recordRecency(entry.id);
            return revealAgentSession(this.settings, entry.id);
          },
          (entry, mode, forcePick) => void this.doOpenAgent(entry, { mode, forcePick }),
          {
            getRecent: () => this.settings.recent,
            tmuxBinary: () => this.settings.tmuxBinary,
            tmuxSessions: () => tmuxSessionsForCleanup(this.settings.orchestratorState),
            recordRecency: (id) => this.recordRecency(id),
            executeResumeLast: () => void this.runResumeLastCommand(),
            resolveIssue: (entry, status) =>
              this.runResolveCommand({ path: entry.path, status }),
            // OP-156 §5: wire the row context menu's [Detach] action through
            // the same path as the palette/URI/CLI handlers.
            detachAgent: (entry) => void this.runDetachAgentCommand(entry.id),
            openGithubIssue: (entry) => {
              if (entry.githubIssue) window.open(entry.githubIssue, "_blank");
            },
          },
          async (entry) => {
            const loc = await findAgentTmuxLocation(this.settings, entry.id);
            if (!loc) return null;
            return captureTmuxPane(
              this.settings.tmuxBinary,
              loc.session,
              loc.window,
              this.settings.view.agentHoverLines,
            );
          },
        ),
    );

    this.addCommand({
      id: "op-open-sidebar",
      name: "op: open sidebar",
      callback: () => this.revealSidebar(),
    });

    // OP-167: Notices dismiss on click; the log is how users (or a
    // delegated agent) recover what they missed.
    this.addCommand({
      id: "op-open-notifications",
      name: "op: open notifications log",
      callback: () => void openNotificationLog(this.app),
    });

    this.addRibbonIcon("list-checks", "op: open sidebar", () => this.revealSidebar());

    if (this.settings.view.openOnStartup) {
      this.app.workspace.onLayoutReady(() => this.revealSidebar());
    }

    this.addCommand({
      id: "op-scaffold",
      name: "op: scaffold new project",
      callback: () => this.runScaffoldCommand(),
    });

    this.addCommand({
      id: "op-new",
      name: "op: new issue",
      callback: () => this.runNewIssueCommand(),
    });

    // Quick-capture (OP-159 / spec §8). Two thin entry-points around `op-new`
    // that pre-fill the modal from the editor selection or system clipboard,
    // and skip the project picker when context resolves a project.
    this.addCommand({
      id: "op-new-from-selection",
      name: "op: new from selection",
      editorCallback: (editor: Editor, view: MarkdownView) =>
        this.runNewFromSelectionCommand(editor, view),
    });

    this.addCommand({
      id: "op-new-from-clipboard",
      name: "op: new from clipboard",
      callback: () => void this.runNewFromClipboardCommand(),
    });

    this.addCommand({
      id: "op-find-issue",
      name: "op: find issue",
      callback: () => this.runFindIssueCommand(),
    });

    this.addCommand({
      id: "op-work",
      name: "op: work on issue",
      callback: () => this.runWorkCommand(),
    });

    this.addCommand({
      id: "op-append-commit",
      name: "op: append commit to issue",
      callback: () => this.runAppendCommitCommand(),
    });

    this.addCommand({
      id: "op-set-pr",
      name: "op: set PR URL on issue",
      callback: () => this.runSetPrCommand(),
    });

    this.addCommand({
      id: "op-set-github-issue",
      name: "op: set GitHub issue URL on issue",
      callback: () => this.runSetGithubIssueCommand(),
    });

    this.addCommand({
      id: "op-create-github-issue",
      name: "op: create GitHub issue for this issue",
      callback: () => this.runCreateGithubIssueCommand(),
    });

    this.addCommand({
      id: "op-open-github-issue",
      name: "op: open linked GitHub issue in browser",
      callback: () => this.runOpenGithubIssueCommand(),
    });

    this.addCommand({
      id: "op-resolve",
      name: "op: resolve issue…",
      callback: async () => {
        const path = this.activeIssuePath();
        if (!path) {
          notify("op: open an issue note first");
          return;
        }
        await this.runResolveCommand({ path });
      },
    });

    this.addCommand({
      id: "op-close-current-issue",
      name: "op: close current issue",
      checkCallback: (checking) => {
        const path = this.activeIssuePath();
        if (checking) return !!path;
        if (!path) return false;
        void this.runResolveCommand({ path });
        return true;
      },
    });

    this.addCommand({
      id: "op-open-agent",
      name: "op: open agent for issue",
      callback: () => this.runOpenAgentCommand(false),
    });

    this.addCommand({
      id: "op-open-agent-pick",
      name: "op: open agent (pick)",
      callback: () => this.runOpenAgentCommand(true),
    });

    this.addCommand({
      id: "op-open-agent-plan",
      name: "op: open agent (plan mode)",
      callback: () => this.runOpenAgentCommand(false, "plan"),
    });

    this.addCommand({
      id: "op-open-agent-plan-pick",
      name: "op: open agent (plan mode, pick)",
      callback: () => this.runOpenAgentCommand(true, "plan"),
    });

    this.addCommand({
      id: "op-pick-and-act",
      name: "op: pick & act",
      callback: () => this.runPickAndActCommand(),
    });

    this.addCommand({
      id: "op-attach-current",
      name: "op: attach to agent for current issue",
      checkCallback: (checking) => {
        const path = this.activeIssuePath();
        if (checking) return !!path;
        if (!path) return false;
        const entry = this.store.byPath(path);
        if (entry && entry.type === "issue") {
          void this.recordRecency(entry.id);
          void revealAgentSession(this.settings, entry.id);
        }
        return true;
      },
    });

    this.addCommand({
      id: "op-detach-agent",
      name: "op: detach agent",
      checkCallback: (checking) => {
        const path = this.activeIssuePath();
        if (checking) return !!path;
        if (!path) return false;
        const entry = this.store.byPath(path);
        if (entry && entry.type === "issue") {
          void this.runDetachAgentCommand(entry.id);
        }
        return true;
      },
    });

    this.addCommand({
      id: "op-resume-last",
      name: "op: resume last",
      callback: () => void this.runResumeLastCommand(),
    });

    this.addCommand({
      id: "op-next-issue",
      name: "op: next issue in project",
      checkCallback: (checking) => {
        const path = this.activeIssuePath();
        if (checking) return !!path;
        if (!path) return false;
        this.runRotateIssueCommand(path, +1);
        return true;
      },
    });

    this.addCommand({
      id: "op-previous-issue",
      name: "op: previous issue in project",
      checkCallback: (checking) => {
        const path = this.activeIssuePath();
        if (checking) return !!path;
        if (!path) return false;
        this.runRotateIssueCommand(path, -1);
        return true;
      },
    });

    this.addCommand({
      id: "op-edit-workflow",
      name: "op: edit project workflow (WORKFLOW.md)",
      callback: () => this.runEditWorkflowCommand(),
    });

    this.addCommand({
      id: "op-edit-module",
      name: "op: edit workflow module",
      callback: () => this.runEditModuleCommand(),
    });

    // OP-187: export / import / undo last import.
    this.addCommand({
      id: "op-export-module",
      name: "op: export workflow module(s)",
      callback: () => void this.runExportModuleCommand(),
    });

    this.addCommand({
      id: "op-import-module",
      name: "op: import workflow module",
      callback: () => void this.runImportModuleCommand(),
    });

    this.addCommand({
      id: "op-undo-last-import",
      name: "op: undo last workflow-module import",
      callback: () => void this.runUndoLastImportCommand(),
    });

    // OP-205 (3e): proactive recovery surface — open the dialog without an
    // in-flight launch. Resolves a project, reads its WORKFLOW.md, finds the
    // first bad-model diagnostic, and renders the same modal in advisory
    // mode so users can fix the file before the next launch.
    this.addCommand({
      id: "op-open-recovery-dialog",
      name: "op: open recovery dialog for project workflow",
      callback: () => void this.runOpenRecoveryDialogCommand(),
    });

    // OP-205 (3e): one-step undo of the most recent .bak-* for a workflow
    // file. Reusable from anywhere; a button in the dialog dispatches the
    // same command.
    this.addCommand({
      id: "op-revert-workflow-patch",
      name: "op: revert last workflow patch",
      callback: () => void this.runRevertWorkflowPatchCommand(),
    });

    this.addCommand({
      id: "op-switch-model-to-per-agent-map",
      name: "op: switch workflow model: to per-agent map",
      checkCallback: (checking) => {
        const candidate = this.activeKeyedMapCandidate();
        if (checking) return candidate !== null;
        if (!candidate) return false;
        void this.runSwitchModelToKeyedMap(candidate.path, candidate.workflow);
        return true;
      },
    });

    this.addCommand({
      id: "op-launch-next-stage",
      name: "op: launch next flow stage",
      callback: () => this.runLaunchNextStageCommand(),
    });

    this.addCommand({
      id: "op-reset-flow",
      name: "op: reset flow / complexity",
      callback: () => this.runResetFlowCommand(),
    });

    this.addCommand({
      id: "op-set-link",
      name: "op: set issue link",
      callback: () => this.runSetLinkCommand(),
    });

    this.addCommand({
      id: "op-remove-link",
      name: "op: remove issue link",
      callback: () => this.runRemoveLinkCommand(),
    });

    this.addCommand({
      id: "op-link-check",
      name: "op: check issue link drift",
      callback: () => void this.runLinkCheckCommand(false),
    });

    this.addCommand({
      id: "op-link-check-repair",
      name: "op: check issue link drift (repair)",
      callback: () => void this.runLinkCheckCommand(true),
    });

    this.addCommand({
      id: "op-migrate-links",
      name: "op: migrate legacy issue links",
      callback: () => void this.runMigrateLinksCommand(),
    });

    // OP-151 / §2 — note-chip backers. Each command is a thin wrapper
    // around an existing primitive (or, for `op-reopen-issue`, a fresh
    // status-flip helper). They all use `checkCallback` so they're
    // hidden from the palette unless an issue note is active — the chip
    // dispatches them by id but human users get a sensibly filtered
    // palette too.
    this.addCommand({
      id: "op-reopen-issue",
      name: "op: reopen current issue",
      checkCallback: (checking) => {
        const path = this.activeIssuePath();
        if (checking) return !!path;
        if (!path) return false;
        void this.runReopenCommand(path);
        return true;
      },
    });
    this.addCommand({
      id: "op-clear-agent",
      name: "op: clear agent on current issue",
      checkCallback: (checking) => {
        const path = this.activeIssuePath();
        if (checking) return !!path;
        if (!path) return false;
        void clearAgentOnIssue(this.app, path);
        return true;
      },
    });
    this.addCommand({
      id: "op-set-priority",
      name: "op: set priority for current issue",
      checkCallback: (checking) => {
        const path = this.activeIssuePath();
        if (checking) return !!path;
        if (!path) return false;
        void this.runSetPriorityCommand(path);
        return true;
      },
    });

    // OP-161 / §10 — first-run README chip backers.
    this.addCommand({
      id: "op-apply-preset",
      name: "op: apply default hotkey preset",
      callback: () => {
        const preset = defaultPreset();
        const result = applyPreset(this.app, preset);
        // Use the existing results modal so the user sees the same UX as
        // hitting "Apply preset" inside the Settings tab.
        void import("./settings").then(({ HotkeyPresetResultsModal }) => {
          new HotkeyPresetResultsModal(this.app, preset, result).open();
        });
      },
    });
    this.addCommand({
      id: "op-start-tour",
      name: "op: start guided tour (scaffold demo project)",
      callback: () => void this.runStartTourCommand(),
    });
    this.addCommand({
      id: "op-remove-demo",
      name: "op: remove demo project",
      callback: () => void this.runRemoveDemoCommand(),
    });

    // op-dev:* commands are gated by settings.developer.showDevCommands so
    // end-user palettes aren't crowded with plugin-author diagnostics. The
    // toggle takes effect on next plugin reload — Obsidian's addCommand has
    // no removeCommand companion.
    if (this.settings.developer.showDevCommands) {
      this.addCommand({
        id: "op-debug-agent-launch",
        name: "op-dev: open agent to debug agent launch",
        callback: () => void this.runDebugAgentLaunch(),
      });

      this.addCommand({
        id: "op-dump-store",
        name: "op-dev: dump IssueStore to console",
        callback: () => {
          const issues = this.store.issues();
          const tasks = this.store.tasks();
          console.log("[op-obsidian] IssueStore dump", {
            issues: issues.length,
            tasks: tasks.length,
            entries: [...issues, ...tasks],
          });
          notify(`op: ${issues.length} issues, ${tasks.length} tasks (see console)`);
        },
      });

      this.addCommand({
        id: "op-rebuild-store",
        name: "op-dev: rebuild IssueStore",
        callback: () => {
          this.store.rebuild();
          notify("op: store rebuilt");
        },
      });
    }

    this.registerObsidianProtocolHandler("op-scaffold", (params) => {
      this.runUri("op-scaffold", normalizeUriParams(params), (p) => this.handleOpScaffoldUri(p));
    });

    this.registerObsidianProtocolHandler("op-new", (params) => {
      this.handleOpNewUri(normalizeUriParams(params)).catch((err) => {
        console.error("[op-obsidian] op-new URI failed", err);
        notify(`op-new failed: ${err.message ?? err}`);
      });
    });

    this.registerObsidianProtocolHandler("op-work", (params) => {
      this.runUri("op-work", normalizeUriParams(params), (p) => this.handleOpWorkUri(p));
    });

    this.registerObsidianProtocolHandler("op-append-commit", (params) => {
      this.runUri("op-append-commit", normalizeUriParams(params), (p) =>
        this.handleOpAppendCommitUri(p),
      );
    });

    this.registerObsidianProtocolHandler("op-set-pr", (params) => {
      this.runUri("op-set-pr", normalizeUriParams(params), (p) => this.handleOpSetPrUri(p));
    });

    this.registerObsidianProtocolHandler("op-get-workflow", (params) => {
      this.runUri("op-get-workflow", normalizeUriParams(params), (p) =>
        this.handleOpGetWorkflowUri(p),
      );
    });

    this.registerObsidianProtocolHandler("op-get-skill", (params) => {
      this.runUri("op-get-skill", normalizeUriParams(params), (p) =>
        handleOpGetSkillUriPure(this.uriDeps(), p),
      );
    });

    this.registerObsidianProtocolHandler("op-edit-workflow", (params) => {
      this.runUri("op-edit-workflow", normalizeUriParams(params), (p) =>
        this.handleOpEditWorkflowUri(p),
      );
    });

    this.registerObsidianProtocolHandler("op-explain-workflow", (params) => {
      this.runUri("op-explain-workflow", normalizeUriParams(params), (p) =>
        handleOpExplainWorkflowUriPure(this.uriDeps(), p),
      );
    });

    this.registerObsidianProtocolHandler("op-list-vars", (params) => {
      this.runUri("op-list-vars", normalizeUriParams(params), (p) =>
        handleOpListVarsUriPure(this.uriDeps(), p),
      );
    });

    this.registerObsidianProtocolHandler("op-edit-module", (params) => {
      this.runUri("op-edit-module", normalizeUriParams(params), (p) =>
        this.handleOpEditModuleUri(p),
      );
    });

    this.registerObsidianProtocolHandler("op-export-module", (params) => {
      this.runUri("op-export-module", normalizeUriParams(params), (p) =>
        this.handleOpExportModuleUri(p),
      );
    });

    this.registerObsidianProtocolHandler("op-import-module", (params) => {
      this.runUri("op-import-module", normalizeUriParams(params), (p) =>
        this.handleOpImportModuleUri(p),
      );
    });

    this.registerObsidianProtocolHandler("op-undo-last-import", (params) => {
      this.runUri("op-undo-last-import", normalizeUriParams(params), () =>
        this.handleOpUndoLastImportUri(),
      );
    });

    this.registerObsidianProtocolHandler("op-set-scope", (params) => {
      this.runUri("op-set-scope", normalizeUriParams(params), (p) => this.handleOpSetScopeUri(p));
    });

    this.registerObsidianProtocolHandler("op-set-evaluation", (params) => {
      this.runUri("op-set-evaluation", normalizeUriParams(params), (p) =>
        this.handleOpSetEvaluationUri(p),
      );
    });

    this.registerObsidianProtocolHandler("op-set-section", (params) => {
      this.runUri("op-set-section", normalizeUriParams(params), (p) =>
        this.handleOpSetSectionUri(p),
      );
    });

    this.registerObsidianProtocolHandler("op-set-flow", (params) => {
      this.runUri("op-set-flow", normalizeUriParams(params), (p) => this.handleOpSetFlowUri(p));
    });

    this.registerObsidianProtocolHandler("op-set-link", (params) => {
      this.runUri("op-set-link", normalizeUriParams(params), (p) =>
        handleOpSetLinkUriPure(this.uriDeps(), p),
      );
    });

    this.registerObsidianProtocolHandler("op-remove-link", (params) => {
      this.runUri("op-remove-link", normalizeUriParams(params), (p) =>
        handleOpRemoveLinkUriPure(this.uriDeps(), p),
      );
    });

    this.registerObsidianProtocolHandler("op-link-check", (params) => {
      this.runUri("op-link-check", normalizeUriParams(params), (p) =>
        handleOpLinkCheckUriPure(this.uriDeps(), p),
      );
    });

    this.registerObsidianProtocolHandler("op-migrate-links", (params) => {
      this.runUri("op-migrate-links", normalizeUriParams(params), (p) =>
        handleOpMigrateLinksUriPure(this.uriDeps(), p),
      );
    });

    this.registerObsidianProtocolHandler("op-resolve", (params) => {
      this.runUri("op-resolve", normalizeUriParams(params), (p) =>
        this.handleOpResolveUri(p, "op-resolve"),
      );
    });

    this.registerObsidianProtocolHandler("op-close-current-issue", (params) => {
      this.runUri("op-close-current-issue", normalizeUriParams(params), (p) =>
        this.handleOpResolveUri(p, "op-close-current-issue", true),
      );
    });

    this.registerObsidianProtocolHandler("op-open-agent", (params) => {
      this.runUri("op-open-agent", normalizeUriParams(params), (p) =>
        this.handleOpOpenAgentUri(p),
      );
    });

    this.registerObsidianProtocolHandler("op-agent-ended", (params) => {
      this.runUri("op-agent-ended", normalizeUriParams(params), (p) =>
        this.handleOpAgentEndedUri(p),
      );
    });

    this.registerObsidianProtocolHandler("op-detach-agent", (params) => {
      this.runUri("op-detach-agent", normalizeUriParams(params), (p) =>
        this.handleOpDetachAgentUri(p),
      );
    });

    this.registerObsidianProtocolHandler("op-launch-next-stage", (params) => {
      this.runUri("op-launch-next-stage", normalizeUriParams(params), (p) =>
        this.handleOpLaunchNextStageUri(p),
      );
    });

    this.registerObsidianProtocolHandler("op-reset-flow", (params) => {
      this.runUri("op-reset-flow", normalizeUriParams(params), (p) =>
        this.handleOpResetFlowUri(p),
      );
    });

    if (this.settings.developer.showDevCommands) {
      this.addCommand({
        id: "op-install-agent-hooks",
        name: "op-dev: install SessionEnd hooks for agents",
        callback: () => {
          void this.runInstallAgentHooks(true);
        },
      });
    }

    // Install hooks in the background so SessionEnd reports land reliably.
    // Intentionally ungated — this is the silent background path that must
    // always run regardless of showDevCommands. Only the *palette command*
    // (above) is gated; removing it from the palette does not disable hooks.
    void this.runInstallAgentHooks(false);

    const resolveFlags = {
      issue: { value: "<id>", description: "Issue id (e.g. OP-24) or vault path" },
      path: { value: "<path>", description: "Vault path to the issue note" },
      status: { value: "<resolved|wontfix>", description: "Target status (default: resolved)" },
      confirmed: { description: "Skip the confirmation modal (default: true for CLI)" },
    };

    this.registerCliHandler(
      "op-resolve",
      "Resolve an issue (status → resolved, move to RESOLVED ISSUES/, trash linked TASKS).",
      resolveFlags,
      (params) => this.handleOpResolveCli(params, "op-resolve", false),
    );

    this.registerCliHandler(
      "op-close-current-issue",
      "Close an issue — same as op-resolve but falls back to the active issue when no id/path given.",
      resolveFlags,
      (params) => this.handleOpResolveCli(params, "op-close-current-issue", true),
    );

    this.registerCliHandler(
      "op-detach-agent",
      "Kill the issue's tmux window and clear `agent:` (cleanup for crash zombies or after manual resolve).",
      {
        issue: { value: "<id>", description: "Issue id (e.g. OP-34)" },
        id: { value: "<id>", description: "Alias for issue" },
      },
      (params) => this.handleOpDetachAgentCli(params),
    );

    this.registerCliHandler(
      "op-scaffold",
      "Scaffold a new project: create Projects/<slug>/ with <slug>.base + STATUS.md, optionally seed issue.",
      {
        slug: { value: "<slug>", description: "Project slug (lowercase, hyphens)" },
        prefix: { value: "<PREFIX>", description: "Issue id prefix (uppercase)" },
        repo_path: {
          value: "<absolute-path>",
          description:
            "Optional absolute path to the project's code repo (written to STATUS.md, used by op:open-agent)",
        },
        title: { value: "<title>", description: "Optional seed issue title" },
        priority: { value: "<low|med|high>", description: "Seed issue priority (default: med)" },
        scope: { value: "<lines>", description: "Seed scope bullets, newline-separated" },
      },
      (params) => this.handleOpScaffoldCli(params),
    );

    this.registerCliHandler(
      "op-new",
      "Create a new issue in an existing project.",
      {
        project: { value: "<slug>", description: "Project slug (folder name under Projects/)" },
        title: { value: "<title>", description: "Issue title" },
        priority: { value: "<low|med|high>", description: "Priority (default: med)" },
        scope: { value: "<lines>", description: "Scope bullets, newline-separated" },
      },
      (params) => this.handleOpNewCli(params),
    );

    this.registerCliHandler(
      "op-work",
      "Start or resume work on an issue (status → in-progress, create task note).",
      {
        issue: { value: "<id>", description: "Issue id (e.g. OP-34)" },
        id: { value: "<id>", description: "Alias for issue" },
      },
      (params) => this.handleOpWorkCli(params),
    );

    this.registerCliHandler(
      "op-append-commit",
      "Append a commit (sha + subject) to an issue's commits: list.",
      {
        issue: { value: "<id>", description: "Issue id (e.g. OP-34)" },
        sha: { value: "<sha7>", description: "Short commit SHA" },
        subject: { value: "<subject>", description: "Commit subject line" },
      },
      (params) => this.handleOpAppendCommitCli(params),
    );

    this.registerCliHandler(
      "op-set-pr",
      "Set the pr: URL on an issue.",
      {
        issue: { value: "<id>", description: "Issue id (e.g. OP-34)" },
        url: { value: "<url>", description: "PR URL" },
      },
      (params) => this.handleOpSetPrCli(params),
    );

    this.registerCliHandler(
      "op-get-workflow",
      "Read Projects/<project>/WORKFLOW.md and return {exists, path, content}. Read-only.",
      {
        project: { value: "<slug>", description: "Project slug (folder name under Projects/)" },
      },
      (params) => this.handleOpGetWorkflowCli(params),
    );

    this.registerCliHandler(
      "op-get-skill",
      "Return the canonical op skill body (operating manual) bundled with the plugin. Read-only.",
      {
        name: {
          value: "<name>",
          description: "Skill body to return (default: skill). Currently only \"skill\" is recognized.",
        },
      },
      (params) => this.handleOpGetSkillCli(params),
    );

    this.registerCliHandler(
      "op-edit-workflow",
      "Launch an agent in tmux to interview the user and author Projects/<project>/WORKFLOW.md.",
      {
        project: { value: "<slug>", description: "Project slug (folder name under Projects/)" },
      },
      (params) => this.handleOpEditWorkflowCli(params),
    );

    this.registerCliHandler(
      "op-explain-workflow",
      "Print the fully composed prompt the launcher would produce for an issue + a per-var precedence breakdown. Read-only.",
      {
        issue: { value: "<id>", description: "Issue id (e.g. OP-34)" },
        mode: { value: "<step>", description: "Workflow step id to compose (e.g. kickoff)" },
        agent: {
          value: "<id>",
          description: "Override the agent id (defaults to the issue's agent: frontmatter or the global default).",
        },
      },
      (params) => this.handleOpExplainWorkflowCli(params),
    );

    this.registerCliHandler(
      "op-list-vars",
      "Print the always-on plugin variable registry as JSON, with current resolved values when an issue is provided. Read-only.",
      {
        project: {
          value: "<slug>",
          description: "Optional project slug. Used as a hint when no issue is given.",
        },
        issue: {
          value: "<id>",
          description: "Optional issue id — when present, every var is resolved against the launch render context.",
        },
      },
      (params) => this.handleOpListVarsCli(params),
    );

    this.registerCliHandler(
      "op-edit-module",
      "Launch an agent in tmux to author or refine a single workflow module.",
      {
        module: { value: "<id>", description: "Module id (filename basename, no .md)" },
        project: {
          value: "<slug>",
          description:
            "Project slug — required for per-project modules; omit for globals (Projects/_op-modules/).",
        },
        scope: {
          value: "<global|project>",
          description:
            "Module scope. Defaults to `project` when --project is supplied, else `global`.",
        },
      },
      (params) => this.handleOpEditModuleCli(params),
    );

    this.registerCliHandler(
      "op-export-module",
      "Export workflow module(s) to Projects/_op-export/. Pass --id <id> for a single module or --project <slug> to bundle all modules visible to that project.",
      {
        id: { value: "<id>", description: "Module id (filename basename, no .md). Single-module mode." },
        project: {
          value: "<slug>",
          description:
            "Project slug. Bundle mode — exports per-project modules + globals carrying that project: tag.",
        },
      },
      (params) => this.handleOpExportModuleCli(params),
    );

    this.registerCliHandler(
      "op-import-module",
      "Import a workflow module from a vault path or absolute filesystem path. Bootstraps missing vars at the chosen scope; backs up any existing target file; writes a transaction record under Projects/_op-import-history/.",
      {
        path: {
          value: "<path>",
          description:
            "Vault-relative or absolute path to the bundle file (the .md emitted by op-export-module).",
        },
        scope: {
          value: "<global|project>",
          description:
            "Where the module lands. Default: derive from the bundle's project: field (present → project, absent → global).",
        },
        project: {
          value: "<slug>",
          description:
            "Project slug. Required when --scope=project; rewrites the bundle's project: field to this value.",
        },
        vars: {
          value: "<name=value\\nname=value>",
          description:
            "Packed var answers (newline- or comma-separated). One answer per missing var; empty string is a valid answer.",
        },
        "var.<name>": {
          value: "<value>",
          description:
            "Per-var answer (alternative to packed --vars). Use one --var.<name>=<value> per missing var.",
        },
      },
      (params) => this.handleOpImportModuleCli(params),
    );

    this.registerCliHandler(
      "op-undo-last-import",
      "Reverse the most recent op-import-module transaction (one-step undo only).",
      {},
      () => this.handleOpUndoLastImportCli(),
    );

    this.registerCliHandler(
      "op-set-scope",
      "Replace the body's `## Scope` section on an issue (or append if missing).",
      {
        issue: { value: "<id>", description: "Issue id (e.g. OP-34)" },
        scope: {
          value: "<markdown>",
          description: "New Scope body. Must not contain H2 headings (`## ...`).",
        },
      },
      (params) => this.handleOpSetScopeCli(params),
    );

    this.registerCliHandler(
      "op-set-evaluation",
      "Replace the body's `## Initial Evaluation` section on an issue (or append if missing).",
      {
        issue: { value: "<id>", description: "Issue id (e.g. OP-34)" },
        evaluation: {
          value: "<markdown>",
          description: "New Initial Evaluation body. Must not contain H2 headings (`## ...`).",
        },
      },
      (params) => this.handleOpSetEvaluationCli(params),
    );

    this.registerCliHandler(
      "op-set-section",
      "Replace (or append to) a body section on an issue. Restricted to Plan|Notes|Summary.",
      {
        issue: { value: "<id>", description: "Issue id (e.g. OP-34)" },
        name: {
          value: "<Plan|Notes|Summary>",
          description: "Section heading to target.",
        },
        content: {
          value: "<markdown>",
          description: "New section body. Must not contain H2 headings (`## ...`).",
        },
        append: {
          description:
            "Pass append=true to append to the existing section (with blank-line separator) instead of replacing.",
        },
      },
      (params) => this.handleOpSetSectionCli(params),
    );

    this.registerCliHandler(
      "op-launch-next-stage",
      "Advance the issue's flow and launch the next stage's agent (ignores autoAdvance).",
      {
        issue: { value: "<id>", description: "Issue id (e.g. OP-34)" },
      },
      (params) => this.handleOpLaunchNextStageCli(params),
    );

    this.registerCliHandler(
      "op-reset-flow",
      "Clear `flow` and `complexity` frontmatter on an issue.",
      {
        issue: { value: "<id>", description: "Issue id (e.g. OP-34)" },
      },
      (params) => this.handleOpResetFlowCli(params),
    );

    const linkRelationsHelp = `Relation name (one of: ${RELATION_NAMES.join("|")})`;
    this.registerCliHandler(
      "op-set-link",
      "Set a two-way issue link. Plugin writes both sides atomically.",
      {
        issue: { value: "<id>", description: "Source issue id (e.g. OP-34)" },
        relation: { value: "<rel>", description: linkRelationsHelp },
        target: { value: "<id>", description: "Target issue id" },
      },
      (params) => this.handleOpSetLinkCli(params),
    );

    this.registerCliHandler(
      "op-remove-link",
      "Remove a two-way issue link. Plugin updates both sides atomically.",
      {
        issue: { value: "<id>", description: "Source issue id (e.g. OP-34)" },
        relation: { value: "<rel>", description: linkRelationsHelp },
        target: { value: "<id>", description: "Target issue id" },
      },
      (params) => this.handleOpRemoveLinkCli(params),
    );

    this.registerCliHandler(
      "op-link-check",
      "Walk every issue and report any one-sided link drift across the vault.",
      {
        repair: {
          description:
            "Pass repair=true to reconcile drift by re-applying links (dangling targets are reported, not fixed).",
        },
      },
      (params) => this.handleOpLinkCheckCli(params),
    );

    this.registerCliHandler(
      "op-migrate-links",
      "Rewrite legacy parent_issue/subissues to canonical parent/children. Idempotent.",
      {},
      (params) => this.handleOpMigrateLinksCli(params),
    );

    this.registerCliHandler(
      "op-set-flow",
      "Set the `flow` and/or `complexity` frontmatter field on an issue.",
      {
        issue: { value: "<id>", description: "Issue id (e.g. OP-34)" },
        flow: {
          value: "<evaluate|planning|implementation|review|finalization|done|null>",
          description: "Workflow stage. Pass 'null' to clear.",
        },
        complexity: {
          value: "<simple|complex|null>",
          description: "Complexity classification. Pass 'null' to clear.",
        },
      },
      (params) => this.handleOpSetFlowCli(params),
    );
  }

  /**
   * Tear down the event bus. The {@link IssueStore} unregisters itself via
   * `addChild`, so it is not unloaded here explicitly. Obsidian does not
   * await `onunload`, but calling `close` still seals the bus so no new
   * events are dispatched during teardown and in-flight handler promises
   * get a chance to settle before we drop registrations.
   */
  onunload(): void {
    void this.bus?.close();
    // OP-101: drop any open iTerm WebSocket so plugin reload doesn't leak the
    // socket. Safe no-op when the WS path was never used in this session.
    closeTransport();
    // Clear the registered App so any notify() calls that fire after unload
    // don't attempt vault writes against a detached plugin context.
    unregisterApp();
  }

  // Resolve the absolute filesystem path used for the `safeStorage`-encrypted
  // iTerm cookie cache: `<vault>/.obsidian/plugins/op-obsidian/.iterm-cookie`.
  // Returns `undefined` when neither the plugin's vault-relative dir nor the
  // adapter's base path are reachable; in that case the cache is skipped and
  // the AppleScript prompt fires each reload (survivable fallback).
  private resolveCookieCachePath(): string | undefined {
    const dir = this.manifest.dir;
    const adapter = this.app.vault.adapter as unknown as {
      basePath?: string;
      getBasePath?: () => string;
    };
    const base =
      typeof adapter.basePath === "string"
        ? adapter.basePath
        : typeof adapter.getBasePath === "function"
        ? adapter.getBasePath()
        : undefined;
    if (!dir || !base) return undefined;
    return `${base}/${dir}/.iterm-cookie`;
  }

  private async cleanupAgentStateFor(issueIds: string[]): Promise<void> {
    try {
      const res = await cleanupAgentSessions({
        tmuxBinary: this.settings.tmuxBinary,
        reg: this.settings.orchestratorState,
        issueIds,
        closeITermWindow: (windowId) => itermCloseWindow(windowId),
      });
      if (res.killed.length || res.prunedSurfaces.length || res.closedWindows.length) {
        console.debug("[op-obsidian] cleaned up agent state", res);
        await this.saveSettings();
      }
    } catch (err) {
      console.warn("[op-obsidian] agent cleanup failed", err);
    }
  }

  private async reconcileAgentStateOnStartup(): Promise<void> {
    const reg = this.settings.orchestratorState;
    const alive = new Set(this.store.issues().map((e) => e.id));
    const stale: string[] = [];
    for (const id of Object.keys(reg.surfaces)) {
      if (!alive.has(id)) stale.push(id);
    }
    if (stale.length === 0) return;
    await this.cleanupAgentStateFor(stale);
  }

  /**
   * One-shot startup probe for stale `agent:` badges — issues whose
   * frontmatter claims an attached agent but whose tmux window is gone
   * (crash, manual `tmux kill-window`, machine reboot). Surfaces one
   * actionable Notice per stale issue with a `[Clear badge]` action.
   *
   * Skipped silently when the tmux probe fails (tmux missing / timeout) —
   * we'd rather under-warn than fire false positives during a reboot.
   * Continuous liveness is OP-149 §1's scope; this is a per-load floor.
   */
  private async surfaceStaleAgentBadgesOnStartup(): Promise<void> {
    const issues = this.store.issues().filter((e) => !!e.agent);
    if (issues.length === 0) return;
    // Brief delay so `op-work` mid-flight at startup can finish creating its
    // tmux window before we probe — reduces false-positive [Clear badge] Notices.
    await new Promise((r) => setTimeout(r, STALE_AGENT_PROBE_DELAY_MS));
    const probe = await probeLiveTmuxWindows(
      this.settings.tmuxBinary,
      tmuxSessionsForCleanup(this.settings.orchestratorState),
    );
    if (!probe.ok) {
      console.debug("[op-obsidian] stale-agent probe skipped — tmux unavailable");
      return;
    }
    // Cache the live set for the OP-151 chip's `isAgentLiveSync`.
    this.liveTmuxWindowsCache = probe.live;
    const stale = selectStaleAgentBadges(issues, probe.live);
    for (const entry of stale) {
      notifyAction({
        text: `op: ${entry.id} has no live agent`,
        actions: [
          {
            label: "Clear badge",
            onClick: () => {
              void clearAgentOnIssue(this.app, entry.path);
            },
          },
        ],
      });
    }
  }

  /**
   * Record `id` at the head of the recency log and persist. Idempotent on
   * `id`: an existing entry is moved to the head with the new timestamp,
   * never duplicated. Capped at {@link RECENCY_CAP} entries via
   * {@link appendRecency}.
   *
   * Called from every dispatch point that "touches" an issue — palette
   * `op-work`, `op-open-agent` and its variants, the URI handlers for both,
   * the CLI handlers, and the sidebar row click. Centralizing the call is
   * what keeps the cap-25 invariant in one place (OP-150).
   */
  async recordRecency(issueId: string): Promise<void> {
    if (!issueId) return;
    this.settings.recent = appendRecency(this.settings.recent, issueId, new Date().toISOString());
    await this.saveSettings();
    // Tell the sidebar to re-render its Last-touched chip without forcing a
    // full reload. We piggy-back on the lifecycle bus rather than introducing
    // a dedicated event — the chip cares about *anything* that flipped the
    // recency log, and `issue:updated` is the closest existing signal.
    const entry = this.store.byId(issueId);
    if (entry && entry.type === "issue") {
      this.bus.emit({ kind: "issue:updated", path: entry.path, issueId });
    }
  }

  /**
   * Implements the `op: resume last` palette command. Reads the most-recent
   * entry from the recency log, opens its issue note, and (on darwin only)
   * re-attaches to the agent's tmux window if it's still alive.
   *
   * Stale entries (issue files deleted from the vault) are pruned eagerly in a
   * single pass so that one invocation always lands on the first surviving entry
   * rather than requiring repeated invocations to clear tombstones one at a time.
   *
   * On non-macOS platforms, falls through to "open the note" — the recency
   * log still works as a navigation aid even when terminal launch isn't
   * supported.
   */
  private async runResumeLastCommand(): Promise<void> {
    // Prune all leading tombstones in one O(n) pass so a single invocation
    // always reaches the first surviving entry (§8 adversarial: multiple
    // deleted heads — would otherwise require one invocation per stale entry).
    let cursor = 0;
    while (cursor < this.settings.recent.length) {
      const candidate = this.settings.recent[cursor];
      const e = this.store.byId(candidate.id);
      if (e && e.type === "issue") break;
      cursor++;
    }
    const staleCount = cursor;
    if (staleCount > 0) {
      const staleIds = this.settings.recent.slice(0, staleCount).map((e) => e.id);
      this.settings.recent = this.settings.recent.slice(staleCount);
      await this.saveSettings();
      if (staleCount === 1) {
        new Notice(`op: ${staleIds[0]} is no longer in the vault — cleared from recency log.`);
      } else {
        new Notice(`op: cleared ${staleCount} stale entries from recency log.`);
      }
    }
    const head = this.settings.recent[0] as (typeof this.settings.recent)[number] | undefined;
    if (!head) {
      new Notice("op: no recent issues to resume — touch one via op:work or op:open-agent first.");
      return;
    }
    const entry = this.store.byId(head.id);
    if (!entry || entry.type !== "issue") {
      // Shouldn't be reachable — the loop above would have advanced cursor past
      // this entry — but guard defensively.
      return;
    }
    await this.openIssue(entry);
    if (process.platform !== "darwin") return;
    const probe = await probeLiveTmuxWindows(
      this.settings.tmuxBinary,
      tmuxSessionsForCleanup(this.settings.orchestratorState),
    );
    if (probe.ok && probe.live.has(tmuxWindowName(head.id))) {
      await revealAgentSession(this.settings, head.id);
    }
  }

  private async revealSidebar(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(OP_SIDEBAR_VIEW_TYPE);
    let leaf: WorkspaceLeaf | null = existing[0] ?? null;
    if (!leaf) {
      leaf = this.app.workspace.getRightLeaf(false);
      if (!leaf) return;
      await leaf.setViewState({ type: OP_SIDEBAR_VIEW_TYPE, active: true });
    }
    this.app.workspace.revealLeaf(leaf);
  }

  private runScaffoldCommand(): void {
    new ScaffoldProjectModal(this.app, async (input) => {
      try {
        const res = await scaffoldProject(this.app, this.store, {
          slug: input.slug,
          prefix: input.prefix,
          repoPath: input.repoPath,
          seedTitle: input.seedTitle,
          seedPriority: input.seedPriority,
        });
        const extra = res.seed ? ` · seeded ${res.seed.id}` : "";
        notify(`op-scaffold: ${res.slug} (${res.prefix})${extra}`);
        const status = this.app.vault.getAbstractFileByPath(res.statusPath);
        if (status instanceof TFile) {
          await this.app.workspace.getLeaf(false).openFile(status);
        }
      } catch (err: any) {
        console.error("[op-obsidian] op-scaffold failed", err);
        notify(`op-scaffold failed: ${err?.message ?? err}`);
      }
    }).open();
  }

  private runNewIssueCommand(): void {
    const projects = applyProjectOrder(listProjects(this.app), this.settings.projectOrder);
    if (projects.length === 0) {
      notify("No projects found under Projects/");
      return;
    }
    new ProjectSuggestModal(this.app, projects, (project) => {
      new NewIssueModal(
        this.app,
        project,
        (input, opts) => {
          this.submitCreateIssue(input, opts);
        },
        { autoCreateGithubIssue: this.settings.github.autoCreateGithubIssue },
      ).open();
    }).open();
  }

  /**
   * Open the New Issue modal for a quick-capture command (selection or
   * clipboard). The capture path resolves the project per spec §8 — active
   * note's `project:` frontmatter, then the recency log, falling through to
   * the picker — and pre-fills the modal with the captured title + scope so
   * the user only has to confirm. The modal still pauses for explicit
   * confirmation per the op-skill rule.
   */
  private openQuickCaptureModal(args: { title: string; scopeBody: string; activeFile?: TFile | null }): void {
    const projects = applyProjectOrder(listProjects(this.app), this.settings.projectOrder);
    if (projects.length === 0) {
      notify("op: no projects found under Projects/");
      return;
    }
    const activeFm = args.activeFile
      ? this.app.metadataCache.getFileCache(args.activeFile)?.frontmatter
      : undefined;
    const activeProjectSlug =
      typeof activeFm?.project === "string" ? activeFm.project : undefined;
    const resolved = resolveCaptureProject({
      activeProjectSlug,
      recent: this.settings.recent,
      projects,
    });
    const initial = {
      title: args.title,
      scopeRaw: args.scopeBody,
      scopeMode: "body" as const,
    };
    const open = (project: typeof projects[number]): void => {
      new NewIssueModal(
        this.app,
        project,
        (input, opts) => {
          this.submitCreateIssue(input, opts);
        },
        {
          autoCreateGithubIssue: this.settings.github.autoCreateGithubIssue,
          initial,
        },
      ).open();
    };
    if (resolved) {
      open(resolved);
      return;
    }
    new ProjectSuggestModal(this.app, projects, open).open();
  }

  private runNewFromSelectionCommand(editor: Editor, view: MarkdownView): void {
    const selection = editor.somethingSelected() ? editor.getSelection() : "";
    const file = view.file ?? null;
    let title: string;
    let scopeBody: string;
    if (selection.trim().length > 0) {
      title = deriveTitle(selection);
      scopeBody = packScope({ text: selection });
    } else {
      // No selection — fall back to "title = active note title", scope = backlink
      // to that note. Spec §8: "If no selection, falls back to the current
      // note's title + a backlink to the source note in scope."
      const noteTitle = file?.basename ?? "";
      title = noteTitle;
      scopeBody = packScope({ text: "", fallbackBacklinkTo: noteTitle });
    }
    this.openQuickCaptureModal({ title, scopeBody, activeFile: file });
  }

  private async runNewFromClipboardCommand(): Promise<void> {
    let text = "";
    try {
      // navigator.clipboard.readText() rejects when the document doesn't have
      // focus or the user hasn't granted clipboard permission. Treat that as
      // "fall through to a plain modal" rather than a hard failure — the user
      // can still capture by hand.
      text = (await navigator.clipboard.readText()) ?? "";
    } catch (err) {
      console.warn("[op-obsidian] clipboard read failed", err);
      new Notice("op: clipboard unavailable — fill the form manually.");
      text = "";
    }
    // readText() resolves with "" when the clipboard is empty (no rejection).
    // Surface a Notice so the user understands why the modal opened blank.
    if (!text.trim()) {
      new Notice("op: clipboard was empty — fill the form manually.");
    }
    const file = this.app.workspace.getActiveFile();
    const title = deriveTitle(text);
    const scopeBody = packScope({ text });
    this.openQuickCaptureModal({ title, scopeBody, activeFile: file ?? null });
  }

  private runFindIssueCommand(): void {
    new FindIssueModal(this.app, (raw) => {
      const projects = listProjects(this.app);
      const result = findIssue(this.store, { raw, projects });
      if (result.matches.length === 0) {
        notify(
          `op: no match for ${result.interpretation}. Try an ID (e.g. OP-12) or a title fragment.`,
        );
        return;
      }
      if (result.matches.length === 1) {
        this.openIssue(result.matches[0]);
        return;
      }
      this.pickOneOf(result.matches);
    }).open();
  }

  private pickOneOf(issues: IssueEntry[]): void {
    new IssuePickerModal(this.app, issues, (e) => this.openIssue(e)).open();
  }

  private async openIssue(entry: IssueEntry): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(entry.path);
    if (file instanceof TFile) {
      await this.app.workspace.getLeaf(false).openFile(file);
    } else {
      notify(`op: file not found on disk: ${entry.path}`);
    }
  }

  private async submitCreateIssue(
    input: CreateIssueInput,
    opts: { launchPlan?: boolean; startFlow?: boolean } = {},
  ): Promise<void> {
    try {
      const res = await createIssue(this.app, this.store, input);
      const file = this.app.vault.getAbstractFileByPath(res.path);
      if (file instanceof TFile) {
        await this.app.workspace.getLeaf(false).openFile(file);
      }
      notifyAction({
        text: `op: created ${res.id}`,
        actions: [
          {
            label: "Open",
            onClick: () => {
              void this.openIssue(res.entry);
            },
          },
          {
            label: "Start agent",
            onClick: () => {
              void this.doOpenAgent(res.entry, {});
            },
          },
        ],
      });
      if (!input.githubIssue && this.settings.github.autoCreateGithubIssue) {
        await this.autoCreateGithubIssueFor(res.path, res.id, input).catch((err) => {
          console.error("[op-obsidian] auto-create github issue failed", err);
          notify(`op: gh create failed — ${err?.message ?? err}`);
        });
      }
      if (opts.launchPlan) {
        void this.doOpenAgent(res.entry, { mode: "plan" });
      }
      if (opts.startFlow) {
        void this.runEvaluatorForIssue(res.entry, input);
      }
    } catch (err: any) {
      console.error("[op-obsidian] createIssue failed", err);
      notify(`op: create failed — ${err?.message ?? err}`);
    }
  }

  private async runEvaluatorForIssue(
    entry: IssueEntry,
    input: CreateIssueInput,
  ): Promise<void> {
    notify(`op: evaluating ${entry.id} — running op-evaluate…`, 6000);
    const body = (input.scope ?? []).map((s) => `- ${s}`).join("\n");
    try {
      // OP-197: visibility-tenet relay for the headless evaluator subtask.
      // The evaluator runs in the Obsidian plugin process (no tmux pane), so
      // statusLine flows to a `Notice` and paneStream to `console.log` — both
      // surfaces the user can watch live. `target` carries the issue id so log
      // lines correlate back to a launch. OP-185 will wire a richer streaming
      // pane; this is the type-level enforcement of the contract today.
      const relaySession = makeTmuxRelay({
        target: `obsidian-plugin:${entry.id}`,
        statusLine: (line) => notify(`op-evaluate ${entry.id}: ${line}`),
        paneStream: (chunk) => console.log(`[op-evaluate ${entry.id}] ${chunk}`),
      });
      // OP-199 (2b): compose the workflow's `evaluate` step and prepend it
      // to the evaluator's prompt. Launch context is best-effort here (no `wd`
      // resolution because the evaluator runs in-process, not in a terminal)
      // — `repoPath` from `resolveRepoPath`, `branch` via `git rev-parse` at
      // that path. Evaluator-step modules that reference `{{branch}}` etc.
      // resolve to either the real value or a `missing-var` diagnostic, never
      // break the launch. OP-208 (8a, cutover) dropped the `workflowMode ===
      // "modules"` gate — modules is now the only path; vanilla WORKFLOW.md
      // routes through the composer's legacy-fallback ladder.
      const composeWorkflowSectionFn = async () => {
        const profile = resolveProfile(this.settings, this.settings.defaultAgent);
        const repoPath = resolveRepoPath(this.app, this.settings, entry.project);
        const branch = repoPath ? await gitBranchAt(repoPath) : undefined;
        const parentRaw = (this.app.metadataCache.getFileCache(
          this.app.vault.getAbstractFileByPath(entry.path) as TFile,
        )?.frontmatter as Record<string, unknown> | undefined)?.parent;
        // Mirrors `readParentId` in openAgent.ts: null on cache miss,
        // no-cache, or non-string (including YAML arrays for multi-parent).
        const parentId =
          typeof parentRaw === "string" && parentRaw.trim().length > 0
            ? parentRaw
            : null;
        return composeWorkflowSection(this.app, {
          entry,
          profile,
          // OP-199 (2b): clamp maxWorkflowChars for the evaluator — it's
          // a quick triage agent that doesn't need the full budget. A long
          // workflow section would slow the evaluator and could confuse the
          // COMPLEXITY: trailer parser.
          injection: {
            ...this.settings.injection,
            maxWorkflowChars: Math.min(
              this.settings.injection.maxWorkflowChars,
              EVALUATOR_MAX_WORKFLOW_CHARS,
            ),
          },
          vaultBasePath: (this.app.vault.adapter as unknown as { basePath?: string }).basePath,
          mode: "evaluate",
          workflowMode: this.settings.workflowMode,
          workflowVars: this.settings.workflowVars,
          workflowStep: modeToWorkflowStep("evaluate"),
          repoPath,
          branch,
          parentId,
        });
      };
      const result = await runEvaluatorFlow(
        {
          launch: launchHeadlessSubtask,
          setEvaluation: (e, evaluation) => setEvaluation(this.app, e, evaluation),
          setFlow: (e, i) => setFlow(this.app, e, i),
          relaySession,
          composeWorkflowSection: composeWorkflowSectionFn,
        },
        entry,
        body,
      );
      notify(
        `op: ${entry.id} evaluated — complexity=${result.complexity}. Advance manually via the command palette.`,
        8000,
      );
    } catch (err: any) {
      console.error("[op-obsidian] evaluator flow failed", err);
      notify(
        `op: evaluator failed for ${entry.id} — ${err?.message ?? err}. Leaving flow unset; retry manually.`,
        10000,
      );
    }
  }

  private async autoCreateGithubIssueFor(
    path: string,
    id: string,
    input: CreateIssueInput,
  ): Promise<void> {
    const repoPath = resolveRepoPath(this.app, this.settings, input.slug);
    if (!repoPath) {
      notify(`op: no repo_path for ${input.slug} — skipping gh create`);
      return;
    }
    const body = buildGithubBody(id, input);
    const url = await createGithubIssue({ repoPath, title: input.title, body });
    const entry = this.store.byPath(path);
    if (entry && entry.type === "issue") {
      await setGithubIssue(this.app, entry, url);
      notify(`op: linked ${id} → ${url}`);
    }
  }

  private runWorkCommand(): void {
    this.pickIssueInteractive(async (entry) => {
      try {
        const res = await workIssue(this.app, this.store, entry);
        const extra = res.createdTaskPath ? ` · created ${res.createdTaskPath.split("/").pop()}` : "";
        notify(`op-work: ${res.issueId} → in-progress${extra}`);
        await this.recordRecency(res.issueId);
        await this.openIssue(entry);
      } catch (err: any) {
        console.error("[op-obsidian] op-work failed", err);
        notify(`op-work failed: ${err?.message ?? err}`);
      }
    });
  }

  private runAppendCommitCommand(): void {
    this.pickIssueInteractive((entry) => {
      new AppendCommitModal(this.app, entry, async (sha, subject) => {
        try {
          const res = await appendCommit(this.app, entry, { sha, subject });
          notify(
            res.added
              ? `op: appended commit to ${res.issueId}`
              : `op: commit already present on ${res.issueId}`,
          );
        } catch (err: any) {
          console.error("[op-obsidian] op-append-commit failed", err);
          notify(`op-append-commit failed: ${err?.message ?? err}`);
        }
      }).open();
    });
  }

  private runSetPrCommand(): void {
    this.pickIssueInteractive((entry) => {
      new SetPrModal(this.app, entry, async (url) => {
        try {
          const res = await setPr(this.app, entry, url);
          notify(`op: pr set on ${res.issueId}`);
        } catch (err: any) {
          console.error("[op-obsidian] op-set-pr failed", err);
          notify(`op-set-pr failed: ${err?.message ?? err}`);
        }
      }).open();
    });
  }

  private runSetLinkCommand(): void {
    this.pickIssueInteractive((srcEntry) => {
      new RelationPickerModal(
        this.app,
        RELATION_NAMES,
        (relation) => this.pickSetLinkTarget(srcEntry, relation),
        `Pick relation for ${srcEntry.id}`,
      ).open();
    });
  }

  private pickSetLinkTarget(srcEntry: IssueEntry, relation: RelationName): void {
    new FindIssueModal(this.app, (raw) => {
      const projects = listProjects(this.app);
      const result = findIssue(this.store, { raw, projects });
      if (result.matches.length === 0) {
        new Notice(
          `op: no match for ${result.interpretation}. Try an ID (e.g. OP-12) or a title fragment.`,
        );
        return;
      }
      if (result.matches.length === 1) {
        void this.doApplyLink(srcEntry, relation, result.matches[0]);
        return;
      }
      new IssuePickerModal(this.app, result.matches, (dst) =>
        void this.doApplyLink(srcEntry, relation, dst),
      ).open();
    }).open();
  }

  private async doApplyLink(
    src: IssueEntry,
    relation: RelationName,
    dst: IssueEntry,
  ): Promise<void> {
    try {
      const res = await applyLink(this.app, this.store, {
        srcId: src.id,
        dstId: dst.id,
        relation,
      });
      const cleanedNote = res.cleaned.length ? ` · cleaned ${res.cleaned.join(", ")}` : "";
      const changeNote = res.changed ? "linked" : "already linked";
      new Notice(`op: ${src.id} ${relation} → ${dst.id} (${changeNote})${cleanedNote}`);
    } catch (err: any) {
      console.error("[op-obsidian] op-set-link failed", err);
      new Notice(`op-set-link failed: ${err?.message ?? err}`);
    }
  }

  private runRemoveLinkCommand(): void {
    this.pickIssueInteractive((srcEntry) => {
      new RelationPickerModal(
        this.app,
        RELATION_NAMES,
        (relation) => this.pickRemoveLinkTarget(srcEntry, relation),
        `Pick relation to remove from ${srcEntry.id}`,
      ).open();
    });
  }

  private pickRemoveLinkTarget(srcEntry: IssueEntry, relation: RelationName): void {
    const linked = listLinkedTargets(this.app, this.store, srcEntry.id, relation);
    if (linked.length === 0) {
      const dangling = listDanglingLinkedIds(this.app, this.store, srcEntry.id, relation);
      if (dangling.length > 0) {
        new Notice(
          `op: ${srcEntry.id} has no resolvable ${relation} links` +
            ` (${dangling.length} dangling — run 'op: check issue link drift' to repair)`,
        );
      } else {
        new Notice(`op: ${srcEntry.id} has no ${relation} links to remove`);
      }
      return;
    }
    if (linked.length === 1) {
      void this.doRemoveLink(srcEntry, relation, linked[0]);
      return;
    }
    new IssuePickerModal(this.app, linked, (dst) =>
      void this.doRemoveLink(srcEntry, relation, dst),
    ).open();
  }

  private async doRemoveLink(
    src: IssueEntry,
    relation: RelationName,
    dst: IssueEntry,
  ): Promise<void> {
    try {
      const res = await removeLink(this.app, this.store, {
        srcId: src.id,
        dstId: dst.id,
        relation,
      });
      const changeNote = res.changed ? "removed" : "already absent";
      new Notice(`op: ${src.id} ${relation} ✗ ${dst.id} (${changeNote})`);
    } catch (err: any) {
      console.error("[op-obsidian] op-remove-link failed", err);
      new Notice(`op-remove-link failed: ${err?.message ?? err}`);
    }
  }

  private runSetGithubIssueCommand(): void {
    this.pickIssueInteractive((entry) => {
      new SetGithubIssueModal(this.app, entry, async (url) => {
        try {
          const res = await setGithubIssue(this.app, entry, url);
          notify(`op: github_issue set on ${res.issueId}`);
        } catch (err: any) {
          console.error("[op-obsidian] op-set-github-issue failed", err);
          notify(`op-set-github-issue failed: ${err?.message ?? err}`);
        }
      }).open();
    });
  }

  private runCreateGithubIssueCommand(): void {
    const run = async (entry: IssueEntry) => {
      try {
        const repoPath = resolveRepoPath(this.app, this.settings, entry.project);
        if (!repoPath) {
          notify(`op: no repo_path for ${entry.project}`);
          return;
        }
        const title = entry.title.replace(/^[A-Z]+-\d+\s+/, "");
        const body = await this.readIssueBody(entry.path);
        const url = await createGithubIssue({ repoPath, title, body });
        await setGithubIssue(this.app, entry, url);
        notify(`op: created ${url}`);
      } catch (err: any) {
        console.error("[op-obsidian] op-create-github-issue failed", err);
        notify(`op-create-github-issue failed: ${err?.message ?? err}`);
      }
    };
    const activePath = this.activeIssuePath();
    const active = activePath ? this.store.byPath(activePath) : undefined;
    if (active && active.type === "issue") {
      void run(active);
      return;
    }
    this.pickIssueInteractive(run);
  }

  private runOpenGithubIssueCommand(): void {
    this.pickIssueInteractive((entry) => {
      const url = entry.githubIssue;
      if (!url) {
        notify(`${entry.id} has no github_issue URL`);
        return;
      }
      window.open(url, "_blank");
    });
  }

  private async readIssueBody(path: string): Promise<string> {
    const f = this.app.vault.getAbstractFileByPath(path);
    if (!(f instanceof TFile)) return "";
    const raw = await this.app.vault.read(f);
    // strip leading frontmatter block
    const m = raw.match(/^---\n[\s\S]*?\n---\n?/);
    return (m ? raw.slice(m[0].length) : raw).trim();
  }

  private pickIssueInteractive(onPick: (entry: IssueEntry) => void): void {
    new FindIssueModal(this.app, (raw) => {
      const projects = listProjects(this.app);
      const result = findIssue(this.store, { raw, projects });
      if (result.matches.length === 0) {
        notify(
          `op: no match for ${result.interpretation}. Try an ID (e.g. OP-12) or a title fragment.`,
        );
        return;
      }
      if (result.matches.length === 1) {
        onPick(result.matches[0]);
        return;
      }
      new IssuePickerModal(this.app, result.matches, onPick).open();
    }).open();
  }

  private resolveByIdOrThrow(id: string): IssueEntry {
    return findIssueByIdPure(this.store, id);
  }

  private uriDeps(): UriHandlerDeps {
    return {
      store: this.store,
      workIssue: (entry, args) => workIssue(this.app, this.store, entry, args),
      appendCommit: (entry, input) => appendCommit(this.app, entry, input),
      setPr: (entry, url) => setPr(this.app, entry, url),
      setScope: (entry, scope, options) => setScope(this.app, entry, scope, options),
      setEvaluation: (entry, evaluation) => setEvaluation(this.app, entry, evaluation),
      setSection: (entry, name, content, options) =>
        setSection(this.app, entry, name, content, options),
      setFlow: (entry, input) => setFlow(this.app, entry, input),
      applyLink: (args) => applyLink(this.app, this.store, args),
      removeLink: (args) => removeLink(this.app, this.store, args),
      linkCheck: (opts) => linkCheck(this.app, this.store, opts),
      migrateLinks: () => migrateLinks(this.app, this.store),
      getWorkflow: (project) => getWorkflow(this.app, project),
      explainWorkflow: (args) =>
        explainWorkflow(
          this.app,
          { settings: this.settings, resolveIssue: (id) => this.resolveByIdOrThrow(id) },
          args,
        ),
      listVars: (args) =>
        listVars(
          this.app,
          { settings: this.settings, resolveIssue: (id) => this.resolveByIdOrThrow(id) },
          args,
        ),
    };
  }

  private runUri(
    command: string,
    params: Record<string, string>,
    handler: (params: Record<string, string>) => Promise<UriResponsePayload>,
  ): void {
    handler(params)
      .then((payload) => writeUriResponse(this.app, payload))
      .catch(async (err) => {
        console.error(`[op-obsidian] ${command} URI failed`, err);
        const msg = err?.message ?? String(err);
        notify(`${command} failed: ${msg}`);
        await writeUriResponse(this.app, {
          ok: false,
          command,
          error: msg,
          params,
        });
      });
  }

  private async handleOpWorkUri(params: Record<string, string>): Promise<UriResponsePayload> {
    const payload = await handleOpWorkUriPure(this.uriDeps(), params);
    if (payload.ok) {
      const id =
        typeof (payload as { issueId?: unknown }).issueId === "string"
          ? (payload as { issueId: string }).issueId
          : undefined;
      if (id) await this.recordRecency(id);
    }
    return payload;
  }

  private handleOpAppendCommitUri(
    params: Record<string, string>,
  ): Promise<UriResponsePayload> {
    return handleOpAppendCommitUriPure(this.uriDeps(), params);
  }

  private handleOpSetPrUri(params: Record<string, string>): Promise<UriResponsePayload> {
    return handleOpSetPrUriPure(this.uriDeps(), params);
  }

  private handleOpGetWorkflowUri(
    params: Record<string, string>,
  ): Promise<UriResponsePayload> {
    return handleOpGetWorkflowUriPure(this.uriDeps(), params);
  }

  private handleOpSetScopeUri(
    params: Record<string, string>,
  ): Promise<UriResponsePayload> {
    return handleOpSetScopeUriPure(this.uriDeps(), params);
  }

  private handleOpSetEvaluationUri(
    params: Record<string, string>,
  ): Promise<UriResponsePayload> {
    return handleOpSetEvaluationUriPure(this.uriDeps(), params);
  }

  private handleOpSetSectionUri(
    params: Record<string, string>,
  ): Promise<UriResponsePayload> {
    return handleOpSetSectionUriPure(this.uriDeps(), params);
  }

  private handleOpSetFlowUri(
    params: Record<string, string>,
  ): Promise<UriResponsePayload> {
    return handleOpSetFlowUriPure(this.uriDeps(), params);
  }

  private activeIssuePath(): string | undefined {
    const f = this.app.workspace.getActiveFile();
    if (!f) return undefined;
    const entry = this.store.byPath(f.path);
    return entry && entry.type === "issue" ? f.path : undefined;
  }

  private withGhCloseHook(args: ResolveArgs): ResolveArgs {
    if (!this.settings.github.closeGithubIssueOnResolve) return args;
    return {
      ...args,
      onAfterMove: async (entry) => {
        if (!entry.githubIssue) return;
        const repoPath = resolveRepoPath(this.app, this.settings, entry.project);
        if (!repoPath) {
          notify(`op: no repo_path for ${entry.project} — skipping gh issue close`);
          return;
        }
        await closeGithubIssue(repoPath, entry.githubIssue, closeReasonForStatus(entry.status));
      },
    };
  }

  /**
   * Wraps `args.probeAgentLive` with the default tmux probe so callers don't
   * have to assemble the same boilerplate. Caller-supplied probes win — if
   * `args.probeAgentLive` is already set (e.g., in tests), this is a no-op.
   *
   * All current resolve paths (palette, sidebar `r`, URI, CLI) go through
   * `runResolveTracked` which always applies this wrapper, so they all receive
   * the live tmux probe. For a CLI-driven agent self-resolve the probe returns
   * alive=true (the agent's own window is running), `agent:` is kept, and
   * the agent's own SessionEnd hook clears it on exit — the "SessionEnd-wins"
   * contract.
   *
   * §5: a single `tmux list-windows` per session via `probeLiveTmuxWindows`.
   * No separate `has-session` probe — TOCTOU-safe by construction.
   */
  private withAgentProbe(args: ResolveArgs): ResolveArgs {
    if (args.probeAgentLive) return args;
    return {
      ...args,
      probeAgentLive: async (issueId) => {
        const probe = await probeLiveTmuxWindows(
          this.settings.tmuxBinary,
          tmuxSessionsForCleanup(this.settings.orchestratorState),
        );
        if (!probe.ok) return { ok: false };
        return { ok: true, alive: probe.live.has(tmuxWindowName(issueId)) };
      },
    };
  }

  private resolveUriArgs(params: Record<string, string>): ResolveArgs {
    return resolveUriArgsPure(params);
  }

  /**
   * Call {@link runResolve} while tracking the issue's vault path in
   * {@link inFlightResolvePaths}. The `issue:status-changed` auto-mover
   * consults that set to skip the re-entrant event `runResolve` emits when it
   * writes `status`/`resolved` frontmatter before renaming.
   *
   * Best-effort path resolution: we try to resolve args to a vault path up
   * front so we can register it before any frontmatter write. If we can't
   * (bad id, ambiguous match), we still dispatch to `runResolve` — which
   * surfaces the same error — and the prev-vs-next guard alone is enough to
   * prevent a runaway loop on that call.
   */
  private async runResolveTracked(args: ResolveArgs) {
    const path = this.resolveArgsToPath(args);
    if (path) this.inFlightResolvePaths.add(path);
    try {
      const result = await runResolve(
        this.app,
        this.store,
        this.withAgentProbe(this.withGhCloseHook(args)),
      );
      this.surfaceResolveResult(result, args.issue);
      return result;
    } finally {
      if (path) this.inFlightResolvePaths.delete(path);
    }
  }

  /**
   * Surface a resolve result as user-facing Notices. Two paths converge here:
   * the explicit `op-resolve` command and the `issue:status-changed`
   * auto-resolver. Both want the same actionable output:
   *
   *  - on success: `op: <ID> resolved · [Open]`, where [Open] navigates to
   *    the post-move RESOLVED ISSUES path
   *  - on github close failure: `op: gh issue close failed · [Retry] · [Open log]`
   */
  private surfaceResolveResult(
    result: Awaited<ReturnType<typeof runResolve>>,
    rawId?: string,
  ): void {
    if (result.ok) {
      const id = result.issueId ?? rawId ?? "issue";
      const trashed = result.trashed?.length ?? 0;
      const status = result.status ?? "resolved";
      const movedTo = result.movedTo;
      const tail = trashed ? ` (${trashed} task${trashed === 1 ? "" : "s"} trashed)` : "";
      notifyAction({
        text: `op: ${id} ${status}${tail}`,
        actions: movedTo
          ? [
              {
                label: "Open",
                onClick: () => {
                  const f = this.app.vault.getAbstractFileByPath(movedTo);
                  if (f instanceof TFile) {
                    void this.app.workspace.getLeaf(false).openFile(f);
                  }
                },
              },
            ]
          : [],
      });

      // §5: surface a second, actionable Notice when `agent:` survived the
      // resolve (live tmux window) or when tmux was unreachable. [Open agent]
      // re-attaches via the existing reveal command; [Detach] kills the
      // window and clears `agent:`.
      if (result.agentKept && result.issueId) {
        const issueId = result.issueId;
        const probeOk = result.agentProbeOk !== false;
        const text = probeOk
          ? `op: ${issueId} — agent session still attached, agent: kept`
          : `op: ${issueId} — tmux unreachable, agent: kept`;
        notifyAction({
          text,
          actions: [
            {
              label: "Open agent",
              onClick: () => {
                void revealAgentSession(this.settings, issueId);
              },
            },
            {
              label: "Detach",
              onClick: () => {
                void this.runDetachAgentCommand(issueId);
              },
            },
          ],
        });
      }
    }
    if (result.githubCloseError && result.issueId) {
      const entry = this.store.issues().find((e) => e.id === result.issueId);
      const url = entry?.githubIssue;
      const repoPath = entry
        ? resolveRepoPath(this.app, this.settings, entry.project)
        : undefined;
      const reason =
        entry && (entry.status === "resolved" || entry.status === "wontfix")
          ? closeReasonForStatus(entry.status)
          : closeReasonForStatus("resolved");
      void this.surfaceGhCloseError({
        entryId: result.issueId,
        repoPath,
        url,
        reason,
        msg: result.githubCloseError,
      });
    }
  }

  /**
   * Show the actionable `gh issue close failed` Notice. `[Retry]` re-runs
   * `closeGithubIssue` directly; `[Open log]` writes the error to a vault
   * scratch note and opens it. When the retry context is incomplete (we
   * couldn't resolve a repo path or URL), the retry action is dropped — the
   * Notice still informs the user and offers `[Open log]`.
   */
  private async surfaceGhCloseError(args: {
    entryId: string;
    repoPath?: string;
    url?: string;
    reason: ReturnType<typeof closeReasonForStatus>;
    msg: string;
  }): Promise<void> {
    const logPath = await writeErrorLog(
      this.app,
      `gh issue close (${args.entryId})`,
      [`url: ${args.url ?? "<unknown>"}`, `repo: ${args.repoPath ?? "<unknown>"}`, `error: ${args.msg}`].join("\n"),
    ).catch((err) => {
      console.error("[op-obsidian] errorLog.write failed", err);
      return undefined;
    });
    const actions: Array<{ label: string; onClick: () => void }> = [];
    if (args.repoPath && args.url) {
      const { repoPath, url, reason, entryId } = args;
      let retryFired = false;
      actions.push({
        label: "Retry",
        onClick: () => {
          if (retryFired) return;
          retryFired = true;
          void closeGithubIssue(repoPath, url, reason)
            .then(() => {
              notifyAction({ text: `op: gh issue closed for ${entryId}` });
            })
            .catch((err: any) => {
              const msg = err?.message ?? String(err);
              console.error("[op-obsidian] gh issue close retry failed", msg);
              notifyAction({
                text: `op: gh issue close retry failed — ${msg}`,
                actions: logPath
                  ? [{ label: "Open log", onClick: () => void openErrorLog(this.app) }]
                  : [],
              });
            });
        },
      });
    }
    if (logPath) {
      actions.push({ label: "Open log", onClick: () => void openErrorLog(this.app) });
    }
    notifyAction({
      text: `op: gh issue close failed for ${args.entryId}`,
      actions,
    });
  }

  private resolveArgsToPath(args: ResolveArgs): string | undefined {
    if (args.path) return args.path;
    if (!args.issue) return undefined;
    const res = findIssue(this.store, { raw: args.issue, projects: listProjects(this.app) });
    if (res.matches.length === 1) return res.matches[0].path;
    return undefined;
  }

  private async runResolveCommand(args: ResolveArgs): Promise<void> {
    const command = "op-resolve";
    try {
      const result = await this.runResolveTracked(args);
      await writeUriResponse(this.app, {
        ok: result.ok,
        command,
        issueId: result.issueId,
        path: result.sourcePath,
        movedTo: result.movedTo,
        trashed: result.trashed,
        status: result.status,
        error: result.error,
        agentKept: result.agentKept,
        agentProbeOk: result.agentProbeOk,
      });
    } catch (err: any) {
      console.error("[op-obsidian]", command, err);
      const msg = err?.message ?? String(err);
      notify(`${command} failed: ${msg}`);
      await writeUriResponse(this.app, { ok: false, command, error: msg });
    }
  }

  /**
   * `op: detach agent` runner — used by the palette command, the URI handler,
   * and the [Detach] action on the resolve-time agent-kept Notice. Idempotent:
   * safe to call when the tmux window is already gone (covers crash zombies
   * where SessionEnd never fired).
   */
  private async runDetachAgentCommand(issueId: string): Promise<void> {
    const command = "op-detach-agent";
    try {
      const result = await detachAgent({
        app: this.app,
        store: this.store,
        settings: this.settings,
        saveSettings: () => this.saveSettings(),
        issueId,
      });
      if (!result.found) {
        notify(`op: ${issueId} not found — nothing to detach`);
      } else if (result.killed.length === 0 && !result.cleared) {
        notify(`op: ${issueId} — no agent attached`);
      } else {
        const killed = result.killed.length
          ? ` (killed ${result.killed.length} window${result.killed.length === 1 ? "" : "s"})`
          : "";
        notify(`op: ${issueId} agent detached${killed}`);
      }
      await writeUriResponse(this.app, {
        ok: result.ok,
        command,
        issueId: result.issueId,
        path: result.path,
        found: result.found,
        cleared: result.cleared,
        killed: result.killed,
        prunedSurfaces: result.prunedSurfaces,
        closedWindows: result.closedWindows,
        error: result.error,
      });
    } catch (err: any) {
      console.error("[op-obsidian]", command, err);
      const msg = err?.message ?? String(err);
      notify(`${command} failed: ${msg}`);
      await writeUriResponse(this.app, { ok: false, command, error: msg });
    }
  }

  /**
   * Look up an issue by id with a brief retry to absorb the metadataCache
   * refresh window after `op-resolve` renames a file. Up to 5×50ms = 250ms.
   * Returns the entry or `undefined` if it never appears (genuinely unknown id).
   */
  private async findIssueByIdWithRetry(
    id: string,
    retries = 5,
    delayMs = 50,
  ): Promise<IssueEntry | undefined> {
    for (let i = 0; i < retries; i++) {
      const found = this.store.issues().find((e) => e.id === id);
      if (found) return found;
      if (i < retries - 1) await new Promise((r) => setTimeout(r, delayMs));
    }
    return undefined;
  }

  private async handleOpDetachAgentUri(
    params: Record<string, string>,
  ): Promise<UriResponsePayload> {
    const id = params.id ?? params.issue;
    if (!id) throw new Error("op-detach-agent URI requires id");
    const result = await detachAgent({
      app: this.app,
      store: this.store,
      settings: this.settings,
      saveSettings: () => this.saveSettings(),
      issueId: id,
    });
    return {
      ok: result.ok,
      command: "op-detach-agent",
      issueId: result.issueId,
      path: result.path,
      found: result.found,
      cleared: result.cleared,
      killed: result.killed,
      prunedSurfaces: result.prunedSurfaces,
      closedWindows: result.closedWindows,
      error: result.error,
    };
  }

  private async handleOpScaffoldUri(
    params: Record<string, string>,
  ): Promise<UriResponsePayload> {
    const res = await this.doScaffold(params);
    return {
      ok: true,
      command: "op-scaffold",
      slug: res.slug,
      prefix: res.prefix,
      projectFolder: res.projectFolder,
      basePath: res.basePath,
      statusPath: res.statusPath,
      workflowPath: res.workflowPath,
      seedIssueId: res.seed?.id,
      seedPath: res.seed?.path,
    };
  }

  private async handleOpScaffoldCli(params: Record<string, string>): Promise<string> {
    const command = "op-scaffold";
    try {
      const res = await this.doScaffold(params);
      await writeUriResponse(this.app, {
        ok: true,
        command,
        slug: res.slug,
        prefix: res.prefix,
        projectFolder: res.projectFolder,
        basePath: res.basePath,
        statusPath: res.statusPath,
        workflowPath: res.workflowPath,
        seedIssueId: res.seed?.id,
        seedPath: res.seed?.path,
      });
      const seedMsg = res.seed ? ` · seeded ${res.seed.id} at ${res.seed.path}` : "";
      return `${command}: created ${res.projectFolder} (prefix ${res.prefix})${seedMsg}`;
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error("[op-obsidian]", command, err);
      await writeUriResponse(this.app, { ok: false, command, error: msg });
      return `${command} failed: ${msg}`;
    }
  }

  private async doScaffold(params: Record<string, string>): Promise<ScaffoldProjectResult> {
    const slug = params.slug;
    const prefix = params.prefix;
    if (!slug) throw new Error("--slug is required");
    if (!prefix) throw new Error("--prefix is required");
    const seedTitle = params.title?.trim() || undefined;
    const seedPriority = seedTitle
      ? ((params.priority as Priority | undefined) ?? "med")
      : undefined;
    const seedScopeShape = seedTitle ? resolveScopeParams(params) : {};
    const repoPath = params.repo_path?.trim() || undefined;
    return scaffoldProject(this.app, this.store, {
      slug,
      prefix,
      repoPath,
      seedTitle,
      seedPriority,
      seedScope: seedScopeShape.scope,
      seedScopeBody: seedScopeShape.scopeBody,
    });
  }

  private async handleOpNewCli(params: Record<string, string>): Promise<string> {
    const command = "op-new";
    try {
      const parsed = parseNewParams(params);
      if (!parsed.ok) return parsed.error;
      const { slug, title, priority } = parsed.value;
      const { scope, scopeBody } = resolveScopeParams(params);
      const res = await createIssue(this.app, this.store, {
        slug,
        title,
        priority,
        scope,
        scopeBody,
      });
      // Persist the scratch payload + return the stdout one-liner BEFORE
      // kicking off `gh issue create`. The gh call takes ~5s, which blew past
      // the obsidian-cli stdout-bridge wait window (OP-137, same shape as
      // OP-121). `autoCreateGithubIssueFor` writes the resulting URL to the
      // issue's `github_issue:` frontmatter via `setGithubIssue` once gh
      // returns, so async URL landing is preserved — callers needing the URL
      // synchronously must re-read the issue file after a short delay.
      await writeUriResponse(this.app, {
        ok: true,
        command,
        issueId: res.id,
        path: res.path,
      });
      if (this.settings.github.autoCreateGithubIssue) {
        void this.autoCreateGithubIssueFor(res.path, res.id, {
          slug,
          title,
          priority,
          scope,
          scopeBody,
        }).catch(
          (err) => console.error("[op-obsidian] cli auto-create github issue failed", err),
        );
      }
      return `${command}: created ${res.id} at ${res.path}`;
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error("[op-obsidian]", command, err);
      await writeUriResponse(this.app, { ok: false, command, error: msg });
      return `${command} failed: ${msg}`;
    }
  }

  private async handleOpWorkCli(params: Record<string, string>): Promise<string> {
    const command = "op-work";
    try {
      const parsed = parseWorkParams(params);
      if (!parsed.ok) return parsed.error;
      const entry = this.resolveByIdOrThrow(parsed.value.id);
      const res = await workIssue(this.app, this.store, entry, {
        agent: parsed.value.agent,
        agentSession: parsed.value.agentSession,
        force: parsed.value.force,
      });
      await writeUriResponse(this.app, {
        ok: true,
        command,
        issueId: res.issueId,
        path: res.path,
        previousStatus: res.previousStatus,
        createdTaskPath: res.createdTaskPath,
        registered: res.registered,
        registration: res.registration,
        alreadyHeld: res.alreadyHeld,
        conflict: res.conflict,
      });
      await this.recordRecency(res.issueId);
      const extra = res.createdTaskPath ? ` · created ${res.createdTaskPath.split("/").pop()}` : "";
      const regNote = formatRegistrationNote(res);
      return `${command}: ${res.issueId} → in-progress${extra}${regNote}`;
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error("[op-obsidian]", command, err);
      await writeUriResponse(this.app, { ok: false, command, error: msg });
      return `${command} failed: ${msg}`;
    }
  }

  private async handleOpAppendCommitCli(params: Record<string, string>): Promise<string> {
    const command = "op-append-commit";
    try {
      const parsed = parseAppendCommitParams(params);
      if (!parsed.ok) return parsed.error;
      const { id, sha, subject } = parsed.value;
      const entry = this.resolveByIdOrThrow(id);
      const res = await appendCommit(this.app, entry, { sha, subject });
      await writeUriResponse(this.app, {
        ok: true,
        command,
        issueId: res.issueId,
        path: res.path,
        entry: res.entry,
        added: res.added,
        commits: res.commits,
      });
      return res.added
        ? `${command}: appended ${res.entry} to ${res.issueId}`
        : `${command}: ${res.entry} already present on ${res.issueId}`;
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error("[op-obsidian]", command, err);
      await writeUriResponse(this.app, { ok: false, command, error: msg });
      return `${command} failed: ${msg}`;
    }
  }

  private async handleOpSetPrCli(params: Record<string, string>): Promise<string> {
    const command = "op-set-pr";
    try {
      const parsed = parseSetPrParams(params);
      if (!parsed.ok) return parsed.error;
      const { id, url } = parsed.value;
      const entry = this.resolveByIdOrThrow(id);
      const res = await setPr(this.app, entry, url);
      await writeUriResponse(this.app, {
        ok: true,
        command,
        issueId: res.issueId,
        path: res.path,
        pr: res.pr,
      });
      return `${command}: ${res.issueId} pr=${res.pr}`;
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error("[op-obsidian]", command, err);
      await writeUriResponse(this.app, { ok: false, command, error: msg });
      return `${command} failed: ${msg}`;
    }
  }

  private async handleOpGetWorkflowCli(params: Record<string, string>): Promise<string> {
    const command = "op-get-workflow";
    try {
      const parsed = parseGetWorkflowParams(params);
      if (!parsed.ok) return parsed.error;
      const res = await getWorkflow(this.app, parsed.value.project);
      await writeUriResponse(this.app, {
        ok: true,
        command,
        project: res.project,
        path: res.path,
        exists: res.exists,
        content: res.content,
        size: res.size,
      });
      return res.exists
        ? `${command}: ${res.project} → ${res.path} (${res.size} chars)`
        : `${command}: ${res.project} → no WORKFLOW.md (would live at ${res.path})`;
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error("[op-obsidian]", command, err);
      await writeUriResponse(this.app, { ok: false, command, error: msg });
      return `${command} failed: ${msg}`;
    }
  }

  private async handleOpGetSkillCli(params: Record<string, string>): Promise<string> {
    const command = "op-get-skill";
    try {
      const parsed = parseGetSkillParams(params);
      if (!parsed.ok) return parsed.error;
      const res = getSkill(parsed.value.name);
      await writeUriResponse(this.app, {
        ok: true,
        command,
        name: res.name,
        content: res.content,
        size: res.size,
      });
      return `${command}: ${res.name} (${res.size} chars)`;
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error("[op-obsidian]", command, err);
      await writeUriResponse(this.app, { ok: false, command, error: msg });
      return `${command} failed: ${msg}`;
    }
  }

  private async handleOpEditWorkflowCli(params: Record<string, string>): Promise<string> {
    const command = "op-edit-workflow";
    try {
      const parsed = parseEditWorkflowParams(params);
      if (!parsed.ok) return parsed.error;
      const res = await editWorkflow(
        this.app,
        this.settings,
        this.detector,
        () => this.saveSettings(),
        parsed.value.project,
      );
      if (!res) {
        const msg = "cancelled or no agent available";
        await writeUriResponse(this.app, { ok: false, command, error: msg });
        return `${command} failed: ${msg}`;
      }
      await writeUriResponse(this.app, {
        ok: true,
        command,
        project: res.project,
        agent: res.agent,
        workingDir: res.workingDir,
        workflowPath: res.workflowPath,
        scriptPath: res.scriptPath,
        tmuxSession: res.tmuxSession,
        tmuxWindow: res.tmuxWindow,
      });
      return `${command}: ${res.project} → ${res.agent} (tmux: ${res.tmuxSession}:${res.tmuxWindow})`;
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error("[op-obsidian]", command, err);
      await writeUriResponse(this.app, { ok: false, command, error: msg });
      return `${command} failed: ${msg}`;
    }
  }

  private async handleOpExplainWorkflowCli(params: Record<string, string>): Promise<string> {
    const command = "op-explain-workflow";
    try {
      const parsed = parseExplainWorkflowParams(params);
      if (!parsed.ok) return parsed.error;
      const { id, mode, agent } = parsed.value;
      const args: { issueId: string; mode: string; agent?: string } = { issueId: id, mode };
      if (agent !== undefined) args.agent = agent;
      const payload = await explainWorkflow(
        this.app,
        { settings: this.settings, resolveIssue: (i) => this.resolveByIdOrThrow(i) },
        args,
      );
      await writeUriResponse(this.app, { ok: true, command, ...payload });
      return summarizeExplainPayload(payload);
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error("[op-obsidian]", command, err);
      await writeUriResponse(this.app, { ok: false, command, error: msg });
      return `${command} failed: ${msg}`;
    }
  }

  private async handleOpListVarsCli(params: Record<string, string>): Promise<string> {
    const command = "op-list-vars";
    try {
      const parsed = parseListVarsParams(params);
      if (!parsed.ok) return parsed.error;
      const args: { project?: string; issue?: string } = {};
      if (parsed.value.project !== undefined) args.project = parsed.value.project;
      if (parsed.value.issue !== undefined) args.issue = parsed.value.issue;
      const payload = await listVars(
        this.app,
        { settings: this.settings, resolveIssue: (i) => this.resolveByIdOrThrow(i) },
        args,
      );
      await writeUriResponse(this.app, { ok: true, command, ...payload });
      return summarizeListVarsPayload(payload);
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error("[op-obsidian]", command, err);
      await writeUriResponse(this.app, { ok: false, command, error: msg });
      return `${command} failed: ${msg}`;
    }
  }

  private async handleOpEditModuleCli(params: Record<string, string>): Promise<string> {
    const command = "op-edit-module";
    try {
      const parsed = parseEditModuleParams(params);
      if (!parsed.ok) return parsed.error;
      const res = await editModule(
        this.app,
        this.settings,
        this.detector,
        () => this.saveSettings(),
        {
          moduleId: parsed.value.moduleId,
          scopeKind: parsed.value.scopeKind,
          projectSlug: parsed.value.project,
        },
      );
      if (!res) {
        const msg = "cancelled or no agent available";
        await writeUriResponse(this.app, { ok: false, command, error: msg });
        return `${command} failed: ${msg}`;
      }
      await writeUriResponse(this.app, {
        ok: true,
        command,
        moduleId: res.moduleId,
        scopeKind: res.scopeKind,
        project: res.projectSlug ?? null,
        agent: res.agent,
        workingDir: res.workingDir,
        modulePath: res.modulePath,
        scriptPath: res.scriptPath,
        tmuxSession: res.tmuxSession,
        tmuxWindow: res.tmuxWindow,
      });
      return `${command}: ${res.moduleId} (${res.scopeKind}${res.projectSlug ? ` ${res.projectSlug}` : ""}) → ${res.agent} (tmux: ${res.tmuxSession}:${res.tmuxWindow})`;
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error("[op-obsidian]", command, err);
      await writeUriResponse(this.app, { ok: false, command, error: msg });
      return `${command} failed: ${msg}`;
    }
  }

  private async handleOpSetScopeCli(params: Record<string, string>): Promise<string> {
    const command = "op-set-scope";
    try {
      const parsed = parseSetScopeParams(params);
      if (!parsed.ok) return parsed.error;
      const { id, scope, mode } = parsed.value;
      const entry = this.resolveByIdOrThrow(id);
      const res = await setScope(this.app, entry, scope, { mode });
      await writeUriResponse(this.app, {
        ok: true,
        command,
        issueId: res.issueId,
        path: res.path,
        replaced: res.replaced,
        mode: res.mode,
      });
      const target = res.mode === "body" ? "body" : "scope";
      return `${command}: ${res.issueId} ${target} ${res.replaced ? "replaced" : "appended"}`;
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error("[op-obsidian]", command, err);
      await writeUriResponse(this.app, { ok: false, command, error: msg });
      return `${command} failed: ${msg}`;
    }
  }

  private async handleOpSetSectionCli(params: Record<string, string>): Promise<string> {
    const command = "op-set-section";
    try {
      const parsed = parseSetSectionParams(params);
      if (!parsed.ok) return parsed.error;
      const { id, name, content, append } = parsed.value;
      const entry = this.resolveByIdOrThrow(id);
      const res = await setSection(this.app, entry, name, content, { append });
      await writeUriResponse(this.app, {
        ok: true,
        command,
        issueId: res.issueId,
        path: res.path,
        section: res.section,
        replaced: res.replaced,
        appended: res.appended,
      });
      const verb = res.appended
        ? "appended"
        : res.replaced
          ? "replaced"
          : "created";
      return `${command}: ${res.issueId} ${res.section} ${verb}`;
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error("[op-obsidian]", command, err);
      await writeUriResponse(this.app, { ok: false, command, error: msg });
      return `${command} failed: ${msg}`;
    }
  }

  private async handleOpSetEvaluationCli(params: Record<string, string>): Promise<string> {
    const command = "op-set-evaluation";
    try {
      const parsed = parseSetEvaluationParams(params);
      if (!parsed.ok) return parsed.error;
      const { id, evaluation } = parsed.value;
      const entry = this.resolveByIdOrThrow(id);
      const res = await setEvaluation(this.app, entry, evaluation);
      await writeUriResponse(this.app, {
        ok: true,
        command,
        issueId: res.issueId,
        path: res.path,
        replaced: res.replaced,
      });
      return `${command}: ${res.issueId} evaluation ${res.replaced ? "replaced" : "appended"}`;
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error("[op-obsidian]", command, err);
      await writeUriResponse(this.app, { ok: false, command, error: msg });
      return `${command} failed: ${msg}`;
    }
  }

  private async handleOpSetFlowCli(params: Record<string, string>): Promise<string> {
    const command = "op-set-flow";
    try {
      const parsed = parseSetFlowParams(params);
      if (!parsed.ok) return parsed.error;
      const { id, flow, complexity } = parsed.value;
      const entry = this.resolveByIdOrThrow(id);
      const input: { flow?: typeof flow; complexity?: typeof complexity } = {};
      if (Object.prototype.hasOwnProperty.call(parsed.value, "flow")) input.flow = flow;
      if (Object.prototype.hasOwnProperty.call(parsed.value, "complexity"))
        input.complexity = complexity;
      const res = await setFlow(this.app, entry, input);
      await writeUriResponse(this.app, {
        ok: true,
        command,
        issueId: res.issueId,
        path: res.path,
        flow: res.flow ?? undefined,
        complexity: res.complexity ?? undefined,
      });
      const parts: string[] = [];
      if (res.flow) parts.push(`flow=${res.flow}`);
      if (res.complexity) parts.push(`complexity=${res.complexity}`);
      return `${command}: ${res.issueId} ${parts.join(" ") || "(cleared)"}`;
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error("[op-obsidian]", command, err);
      await writeUriResponse(this.app, { ok: false, command, error: msg });
      return `${command} failed: ${msg}`;
    }
  }

  private async handleOpSetLinkCli(params: Record<string, string>): Promise<string> {
    const command = "op-set-link";
    try {
      const parsed = parseSetLinkParams(params);
      if (!parsed.ok) return parsed.error;
      const { srcId, dstId, relation } = parsed.value;
      const res = await applyLink(this.app, this.store, { srcId, dstId, relation });
      await writeUriResponse(this.app, { ...res });
      const cleanedNote =
        res.cleaned.length > 0 ? ` · cleaned ${res.cleaned.join(", ")}` : "";
      const changedNote = res.changed ? "linked" : "already linked";
      return `${command}: ${res.srcId} ${res.relation}=${res.dstId} (${changedNote})${cleanedNote}`;
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error("[op-obsidian]", command, err);
      await writeUriResponse(this.app, { ok: false, command, error: msg });
      return `${command} failed: ${msg}`;
    }
  }

  private async handleOpRemoveLinkCli(params: Record<string, string>): Promise<string> {
    const command = "op-remove-link";
    try {
      const parsed = parseRemoveLinkParams(params);
      if (!parsed.ok) return parsed.error;
      const { srcId, dstId, relation } = parsed.value;
      const res = await removeLink(this.app, this.store, { srcId, dstId, relation });
      await writeUriResponse(this.app, { ...res });
      const changedNote = res.changed ? "removed" : "no-op";
      return `${command}: ${res.srcId} ${res.relation}=${res.dstId} (${changedNote})`;
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error("[op-obsidian]", command, err);
      await writeUriResponse(this.app, { ok: false, command, error: msg });
      return `${command} failed: ${msg}`;
    }
  }

  private async handleOpLinkCheckCli(params: Record<string, string>): Promise<string> {
    const command = "op-link-check";
    try {
      const parsed = parseLinkCheckParams(params);
      if (!parsed.ok) return parsed.error;
      const res = await linkCheck(this.app, this.store, { repair: parsed.value.repair });
      await writeUriResponse(this.app, { ...res });
      const driftCount = res.drift.length;
      const repairedCount = res.repaired.length;
      const danglingCount = res.unrepaired.filter(
        (d) => d.problem === "dangling-target",
      ).length;
      const parts = [`scanned ${res.scanned}`, `drift ${driftCount}`];
      if (parsed.value.repair) parts.push(`repaired ${repairedCount}`);
      if (danglingCount > 0) parts.push(`dangling ${danglingCount}`);
      return `${command}: ${parts.join(" · ")}`;
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error("[op-obsidian]", command, err);
      await writeUriResponse(this.app, { ok: false, command, error: msg });
      return `${command} failed: ${msg}`;
    }
  }

  private async handleOpMigrateLinksCli(_params: Record<string, string>): Promise<string> {
    const command = "op-migrate-links";
    try {
      const res = await migrateLinks(this.app, this.store);
      await writeUriResponse(this.app, { ...res });
      return `${command}: scanned ${res.scanned} · rewrote ${res.rewrites.length}`;
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error("[op-obsidian]", command, err);
      await writeUriResponse(this.app, { ok: false, command, error: msg });
      return `${command} failed: ${msg}`;
    }
  }

  private async runLinkCheckCommand(repair: boolean): Promise<void> {
    try {
      const res = await linkCheck(this.app, this.store, { repair });
      await writeUriResponse(this.app, { ...res });
      const dangling = res.unrepaired.filter(
        (d) => d.problem === "dangling-target",
      ).length;
      const parts = [`drift ${res.drift.length}`];
      if (repair) parts.push(`repaired ${res.repaired.length}`);
      if (dangling > 0) parts.push(`dangling ${dangling}`);
      notify(`op-link-check: scanned ${res.scanned} · ${parts.join(" · ")}`);
    } catch (err: any) {
      console.error("[op-obsidian] op-link-check failed", err);
      notify(`op-link-check failed: ${err?.message ?? err}`);
    }
  }

  private async runMigrateLinksCommand(): Promise<void> {
    try {
      const res = await migrateLinks(this.app, this.store);
      await writeUriResponse(this.app, { ...res });
      notify(
        `op-migrate-links: scanned ${res.scanned} · rewrote ${res.rewrites.length}`,
      );
    } catch (err: any) {
      console.error("[op-obsidian] op-migrate-links failed", err);
      notify(`op-migrate-links failed: ${err?.message ?? err}`);
    }
  }

  private async handleOpResolveCli(
    params: Record<string, string>,
    command: string,
    fallbackActive: boolean,
  ): Promise<string> {
    try {
      const args = this.resolveUriArgs(params);
      // CLI caller is an agent — default to confirmed unless explicitly opted out.
      if (!("confirmed" in params)) args.confirmed = true;
      if (fallbackActive && !args.issue && !args.path) {
        const p = this.activeIssuePath();
        if (p) args.path = p;
      }
      const result = await this.runResolveTracked(args);
      await writeUriResponse(this.app, {
        ok: result.ok,
        command,
        issueId: result.issueId,
        path: result.sourcePath,
        movedTo: result.movedTo,
        trashed: result.trashed,
        status: result.status,
        error: result.error,
        agentKept: result.agentKept,
        agentProbeOk: result.agentProbeOk,
      });
      if (!result.ok) return `${command} failed: ${result.error ?? "unknown error"}`;
      const tCount = result.trashed?.length ?? 0;
      const agentTail = result.agentKept
        ? result.agentProbeOk === false
          ? " · agent: kept (tmux unreachable)"
          : " · agent: kept (session live)"
        : "";
      return `${command}: ${result.issueId} → ${result.status} · moved to ${result.movedTo} · trashed ${tCount} task(s)${agentTail}`;
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error("[op-obsidian]", command, err);
      await writeUriResponse(this.app, { ok: false, command, error: msg });
      return `${command} failed: ${msg}`;
    }
  }

  private async handleOpResolveUri(
    params: Record<string, string>,
    command: string,
    fallbackActive = false,
  ): Promise<UriResponsePayload> {
    const args = this.resolveUriArgs(params);
    if (fallbackActive && !args.issue && !args.path) {
      const p = this.activeIssuePath();
      if (p) args.path = p;
    }
    const result = await this.runResolveTracked(args);
    if (!result.ok) throw new Error(result.error ?? "resolve failed");
    return {
      ok: true,
      command,
      issueId: result.issueId,
      path: result.sourcePath,
      movedTo: result.movedTo,
      trashed: result.trashed,
      status: result.status,
      agentKept: result.agentKept,
      agentProbeOk: result.agentProbeOk,
    };
  }

  private async handleOpDetachAgentCli(
    params: Record<string, string>,
  ): Promise<string> {
    const command = "op-detach-agent";
    const id = params.issue ?? params.id;
    if (!id) {
      const msg = `${command} failed: --issue (or --id) required`;
      await writeUriResponse(this.app, { ok: false, command, error: msg });
      return msg;
    }
    try {
      const result = await detachAgent({
        app: this.app,
        store: this.store,
        settings: this.settings,
        saveSettings: () => this.saveSettings(),
        issueId: id,
      });
      await writeUriResponse(this.app, {
        ok: result.ok,
        command,
        issueId: result.issueId,
        path: result.path,
        found: result.found,
        cleared: result.cleared,
        killed: result.killed,
        prunedSurfaces: result.prunedSurfaces,
        closedWindows: result.closedWindows,
        error: result.error,
      });
      if (!result.ok) return `${command} failed: ${result.error ?? "unknown error"}`;
      if (!result.found) return `${command}: ${id} not found`;
      const killed = result.killed.length;
      return `${command}: ${id} · killed ${killed} window${killed === 1 ? "" : "s"} · cleared=${result.cleared}`;
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error("[op-obsidian]", command, err);
      await writeUriResponse(this.app, { ok: false, command, error: msg });
      return `${command} failed: ${msg}`;
    }
  }

  private runOpenAgentCommand(forcePick: boolean, mode: AgentLaunchMode = "work"): void {
    const activePath = this.activeIssuePath();
    if (activePath) {
      const entry = this.store.byPath(activePath);
      if (entry && entry.type === "issue") {
        void this.doOpenAgent(entry, { forcePick, mode });
        return;
      }
    }
    this.pickIssueInteractive((entry) => {
      void this.doOpenAgent(entry, { forcePick, mode });
    });
  }

  /**
   * Open the `op: pick & act` modal — fuzzy-pick any issue and dispatch one of
   * five actions via modifier-enter. See {@link PickAndActModal}.
   */
  private runPickAndActCommand(): void {
    new PickAndActModal(this.app, () => this.store.issues(), {
      open: (entry) => this.openIssue(entry),
      launch: (entry) => this.doOpenAgent(entry, {}),
      plan: (entry) => this.doOpenAgent(entry, { mode: "plan" }),
      resolve: (entry) => this.runResolveCommand({ path: entry.path }),
      commit: (entry) => this.runPickAndActCommitFor(entry),
    }).open();
  }

  /**
   * Append the project repo's HEAD commit to the issue's `commits:` list. Used
   * by `op: pick & act` when the user hits `⌃↵` on an issue.
   */
  private async runPickAndActCommitFor(entry: IssueEntry): Promise<void> {
    try {
      const repoPath = resolveRepoPath(this.app, this.settings, entry.project);
      if (!repoPath) {
        new Notice(`op: no repo_path for ${entry.project} — cannot append commit`);
        return;
      }
      const { stdout: shaRaw } = await pExecFile(
        "git",
        ["rev-parse", "--short=7", "HEAD"],
        { cwd: repoPath },
      );
      const { stdout: subjRaw } = await pExecFile(
        "git",
        ["log", "-1", "--pretty=%s"],
        { cwd: repoPath },
      );
      const sha = shaRaw.trim();
      const subject = subjRaw.trim();
      if (!sha || !subject) {
        new Notice(`op: empty git output in ${repoPath} — skipping append`);
        return;
      }
      const res = await appendCommit(this.app, entry, { sha, subject });
      new Notice(
        res.added
          ? `op: appended ${sha} to ${res.issueId}`
          : `op: ${sha} already on ${res.issueId}`,
      );
    } catch (err: any) {
      console.error("[op-obsidian] pick-and-act commit failed", err);
      new Notice(`op: pick & act commit failed — ${err?.message ?? err}`);
    }
  }

  /**
   * Open the next/previous issue in the same project as `currentPath`, sorted
   * numerically by ID and skipping resolved entries. Wraps around at the
   * boundaries.
   */
  private runRotateIssueCommand(currentPath: string, direction: 1 | -1): void {
    const current = this.store.byPath(currentPath);
    if (!current || current.type !== "issue") return;
    const peers = this.store
      .issues()
      .filter(
        (e) =>
          e.project === current.project &&
          !e.resolvedFolder &&
          !["resolved", "wontfix"].includes(e.status),
      )
      .sort((a, b) => issueIdNumericSuffix(a.id) - issueIdNumericSuffix(b.id));
    if (peers.length === 0) {
      new Notice(`op: no other open issues in ${current.project}`);
      return;
    }
    const idx = peers.findIndex((e) => e.path === current.path);
    if (idx === -1) {
      // current is resolved — jump to the first/last open peer
      void this.openIssue(direction > 0 ? peers[0] : peers[peers.length - 1]);
      return;
    }
    const next = peers[(idx + direction + peers.length) % peers.length];
    if (next.path === current.path) {
      new Notice(`op: only one open issue in ${current.project}`);
      return;
    }
    void this.openIssue(next);
  }

  private runEditWorkflowCommand(): void {
    const projects = applyProjectOrder(listProjects(this.app), this.settings.projectOrder);
    if (projects.length === 0) {
      notify("op: no projects found under Projects/");
      return;
    }
    new ProjectSuggestModal(this.app, projects, (project) => {
      void this.doEditWorkflow(project.slug);
    }).open();
  }

  private runEditModuleCommand(): void {
    const projects = applyProjectOrder(listProjects(this.app), this.settings.projectOrder);
    // Discover existing modules across the vault — globals + per-project.
    // Listing them here is best-effort (the agent itself can author a new
    // file at any path); the picker exposes "create new" entries below the
    // existing ones so users always have a way out of the discovery list.
    const all = loadModules(this.app, {});
    type Pick =
      | { kind: "existing"; moduleId: string; scopeKind: "global" | "project"; projectSlug?: string; label: string }
      | { kind: "new-global"; label: string }
      | { kind: "new-project"; projectSlug: string; label: string };
    const items: Pick[] = [];
    for (const m of all.modules) {
      if (m.source.kind === "global") {
        items.push({
          kind: "existing",
          moduleId: m.id,
          scopeKind: "global",
          label: `${m.id}  (global)`,
        });
      } else {
        items.push({
          kind: "existing",
          moduleId: m.id,
          scopeKind: "project",
          projectSlug: m.source.projectSlug,
          label: `${m.id}  (project: ${m.source.projectSlug})`,
        });
      }
    }
    items.push({ kind: "new-global", label: "+ New global module…" });
    for (const p of projects) {
      items.push({
        kind: "new-project",
        projectSlug: p.slug,
        label: `+ New project module in ${p.slug}…`,
      });
    }
    new ModulePickerModal(this.app, items, (pick) => {
      void this.handleEditModulePick(pick);
    }).open();
  }

  /**
   * OP-205 (3e): proactive recovery surface. Picks a project, loads its
   * workflow file, scans `validateWorkflowModels`-derived diagnostics for the
   * first `bad-model` entry, and opens the dialog in advisory mode (no
   * launch in flight). When no bad-model warnings are present, surfaces a
   * Notice rather than opening an empty dialog.
   */
  private async runOpenRecoveryDialogCommand(): Promise<void> {
    const projects = applyProjectOrder(listProjects(this.app), this.settings.projectOrder);
    if (projects.length === 0) {
      notify("op: no projects found under Projects/");
      return;
    }
    new ProjectSuggestModal(this.app, projects, (project) => {
      void this.openRecoveryDialogForProject(project.slug);
    }).open();
  }

  private async openRecoveryDialogForProject(slug: string): Promise<void> {
    const { diagnostics } = await loadWorkflowFile(this.app, slug);
    const bad = diagnostics.find((d) => d.code === "bad-model");
    if (!bad) {
      notify(`op: no bad-model warnings in Projects/${slug}/WORKFLOW.md`);
      return;
    }
    const err = synthesizeBadModelErrorFromDiagnostic(bad);
    if (!err) {
      notify(
        `op: bad-model diagnostic for Projects/${slug}/WORKFLOW.md is malformed — open the file directly to fix.`,
      );
      return;
    }
    openRecoveryDialog({
      app: this.app,
      issueId: `Projects/${slug}`,
      project: slug,
      error: err,
      mode: "advisory",
      onResolved: () => {},
    });
  }

  /**
   * OP-205 (3e): one-step undo. Picks a project, finds the latest `.bak-*`
   * sibling of its WORKFLOW.md, and restores it (trashing the backup).
   */
  private async runRevertWorkflowPatchCommand(): Promise<void> {
    const projects = applyProjectOrder(listProjects(this.app), this.settings.projectOrder);
    if (projects.length === 0) {
      notify("op: no projects found under Projects/");
      return;
    }
    new ProjectSuggestModal(this.app, projects, (project) => {
      void this.revertWorkflowPatchForProject(project.slug);
    }).open();
  }

  private async revertWorkflowPatchForProject(slug: string): Promise<void> {
    const path = `Projects/${slug}/WORKFLOW.md`;
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      notify(`op: ${path} not found`);
      return;
    }
    const vault: VaultLike = {
      read: (f) => this.app.vault.read(f as TFile),
      modify: (f, data) => this.app.vault.modify(f as TFile, data),
      create: async (p, data) => (await this.app.vault.create(p, data)) as VaultFileLike,
      trash: (f, system) => this.app.vault.trash(f as TFile, system),
      getFileByPath: (p) => {
        const x = this.app.vault.getAbstractFileByPath(p);
        return x instanceof TFile ? (x as VaultFileLike) : null;
      },
      listSiblingPaths: (parentFolder) => {
        const folder = parentFolder
          ? this.app.vault.getAbstractFileByPath(parentFolder)
          : this.app.vault.getRoot();
        const children = (folder as { children?: Array<{ path: string }> } | null)?.children;
        return Array.isArray(children) ? children.map((c) => c.path) : [];
      },
    };
    try {
      const r = await revertLastWorkflowPatch({
        vault,
        // Pass the live TFile via getFileByPath so vault.modify / vault.trash
        // get the real Obsidian-resolved file instance (a plain `{path}`
        // object would be cast through `f as TFile` but isn't actually a
        // TFile and fails on the trash() seam).
        workflowFile: vault.getFileByPath(path) ?? { path },
      });
      if (r.status === "no-backup") {
        notify(`op: no backup found for ${path}`);
        return;
      }
      notify(`op: reverted ${path} from ${r.restoredFromPath}`);
    } catch (err) {
      const e = err as Error;
      console.error(
        "[op-obsidian] op-revert-workflow-patch failed",
        e?.stack ?? e?.message ?? err,
      );
      notify(`op-revert-workflow-patch failed: ${e?.message ?? String(err)}`);
    }
  }

  private async handleEditModulePick(
    pick:
      | { kind: "existing"; moduleId: string; scopeKind: "global" | "project"; projectSlug?: string }
      | { kind: "new-global" }
      | { kind: "new-project"; projectSlug: string },
  ): Promise<void> {
    if (pick.kind === "existing") {
      await this.doEditModule({
        moduleId: pick.moduleId,
        scopeKind: pick.scopeKind,
        projectSlug: pick.projectSlug,
      });
      return;
    }
    const scopeKind: "global" | "project" = pick.kind === "new-global" ? "global" : "project";
    const projectSlug = pick.kind === "new-project" ? pick.projectSlug : undefined;
    new NewModuleIdModal(this.app, scopeKind, projectSlug, (moduleId) => {
      void this.doEditModule({ moduleId, scopeKind, projectSlug });
    }).open();
  }

  private async doEditModule(args: {
    moduleId: string;
    scopeKind: "global" | "project";
    projectSlug?: string;
  }): Promise<void> {
    try {
      const res = await editModule(
        this.app,
        this.settings,
        this.detector,
        () => this.saveSettings(),
        args,
      );
      if (res) {
        notify(
          `op-edit-module: ${res.moduleId} (${res.scopeKind}) → ${res.agent} in ${res.workingDir} (tmux: ${res.tmuxSession}:${res.tmuxWindow})`,
        );
      }
    } catch (err: any) {
      console.error("[op-obsidian] op-edit-module failed", err);
      notify(`op-edit-module failed: ${err?.message ?? err}`);
    }
  }

  // -------------------------------------------------------------------------
  // OP-187 export / import / undo
  // -------------------------------------------------------------------------

  /**
   * Palette entry point for op-export-module. Wraps the active project's
   * working dir as a hint when one is active, otherwise prompts the user via
   * a tiny modal for `id=<id>` or `project=<slug>`.
   */
  private async runExportModuleCommand(): Promise<void> {
    const { ExportModulePromptModal } = await import("./modals");
    new ExportModulePromptModal(this.app, async (args) => {
      try {
        const result = await exportModules(this.app, args);
        const summary = result.files.map((f) => f.exportPath).join(", ");
        notify(
          `op-export-module: wrote ${result.files.length} file${result.files.length === 1 ? "" : "s"} → ${summary}`,
        );
        await writeUriResponse(this.app, {
          ok: true,
          command: "op-export-module",
          mode: args.kind,
          files: result.files,
        });
      } catch (err: any) {
        console.error("[op-obsidian] op-export-module failed", err);
        notify(`op-export-module failed: ${err?.message ?? err}`);
      }
    }).open();
  }

  /**
   * Palette entry point for op-import-module. Prompts for the path + scope,
   * then for each missing var (one inline prompt with the module-default
   * pre-filled), then commits.
   */
  private async runImportModuleCommand(): Promise<void> {
    const { ImportModulePromptModal, ImportVarPromptModal } = await import("./modals");
    new ImportModulePromptModal(this.app, async (input) => {
      try {
        const prepared = await prepareImport(this.app, this.settings, {
          sourcePath: input.sourcePath,
          targetScope: input.scope,
          ...(input.projectSlug ? { targetProjectSlug: input.projectSlug } : {}),
        });
        const answers: Record<string, string> = {};
        for (const prompt of prepared.plan.promptsNeeded) {
          const answer = await new Promise<string | undefined>((resolve) => {
            new ImportVarPromptModal(this.app, prompt, resolve).open();
          });
          if (answer === undefined) {
            notify("op-import-module: cancelled — no module landed.");
            return;
          }
          answers[prompt.name] = answer;
        }
        const result = await commitImport(
          this.app,
          this.settings,
          () => this.saveSettings(),
          { prepared, varAnswers: answers },
        );
        notify(
          `op-import-module: ${result.targetPath} (${result.varsWritten.length} var${result.varsWritten.length === 1 ? "" : "s"}; tx ${result.transactionPath})`,
        );
        await writeUriResponse(this.app, {
          ok: true,
          command: "op-import-module",
          ...result,
        });
      } catch (err: any) {
        console.error("[op-obsidian] op-import-module failed", err);
        notify(`op-import-module failed: ${err?.message ?? err}`);
      }
    }).open();
  }

  /**
   * Palette entry point for op-undo-last-import. No prompts — runs immediately
   * and surfaces a Notice with the result. Idempotent on no-history.
   */
  private async runUndoLastImportCommand(): Promise<void> {
    try {
      const result = await undoLastImport(
        this.app,
        this.settings,
        () => this.saveSettings(),
      );
      if (result.status === "no-history") {
        notify("op-undo-last-import: no transaction history to undo.");
      } else {
        notify(
          `op-undo-last-import: reverted ${result.modulesReverted.length} module(s), removed ${result.varsRemoved.length} var(s) (${result.varsPreserved.length} preserved as preexisting).`,
        );
      }
      await writeUriResponse(this.app, {
        ok: true,
        command: "op-undo-last-import",
        ...result,
      });
    } catch (err: any) {
      console.error("[op-obsidian] op-undo-last-import failed", err);
      notify(`op-undo-last-import failed: ${err?.message ?? err}`);
    }
  }

  // ---- URI handlers ----

  private async handleOpExportModuleUri(
    params: Record<string, string>,
  ): Promise<UriResponsePayload> {
    const parsed = parseExportModuleParams(params);
    if (!parsed.ok) throw new Error(parsed.error);
    const args =
      parsed.value.mode === "id"
        ? { kind: "id" as const, moduleId: parsed.value.moduleId }
        : { kind: "project" as const, projectSlug: parsed.value.projectSlug };
    const result = await exportModules(this.app, args);
    return {
      ok: true,
      command: "op-export-module",
      mode: parsed.value.mode,
      files: result.files,
    };
  }

  private async handleOpImportModuleUri(
    params: Record<string, string>,
  ): Promise<UriResponsePayload> {
    const parsed = parseImportModuleParams(params);
    if (!parsed.ok) throw new Error(parsed.error);
    // Default scope when unset: derive from the bundle's project: field at
    // prepare time. For URI/CLI we default to `global` so the call is fully
    // self-contained — callers that want per-project landing pass
    // `scope=project&project=<slug>`.
    const scope = parsed.value.scope ?? "global";
    if (scope === "project" && !parsed.value.project) {
      throw new Error("op-import-module: --project is required when scope=project");
    }
    const prepared = await prepareImport(this.app, this.settings, {
      sourcePath: parsed.value.sourcePath,
      targetScope: scope,
      ...(parsed.value.project ? { targetProjectSlug: parsed.value.project } : {}),
      varAnswers: parsed.value.varAnswers,
    });
    const missing = prepared.plan.promptsNeeded.filter(
      (p) => !Object.prototype.hasOwnProperty.call(parsed.value.varAnswers, p.name),
    );
    if (missing.length > 0) {
      // Headless callers can't drive the modal — surface a structured
      // needs-input payload with each missing var's pre-fill so the caller
      // can re-dispatch with `var.<name>=<value>` filled in.
      return {
        ok: false,
        command: "op-import-module",
        status: "needs-input",
        plan: prepared.plan,
        needsInput: {
          vars: missing.map((m) => ({
            name: m.name,
            prefill: m.prefill,
            hasModuleDefault: m.hasModuleDefault,
            ...(m.description ? { description: m.description } : {}),
          })),
        },
        error: `Missing var answer(s): ${missing.map((m) => m.name).join(", ")}. Re-dispatch with --var.<name>=<value> for each.`,
      };
    }
    const result = await commitImport(
      this.app,
      this.settings,
      () => this.saveSettings(),
      { prepared, varAnswers: parsed.value.varAnswers },
    );
    return {
      ok: true,
      command: "op-import-module",
      ...result,
    };
  }

  private async handleOpUndoLastImportUri(): Promise<UriResponsePayload> {
    const result = await undoLastImport(
      this.app,
      this.settings,
      () => this.saveSettings(),
    );
    return {
      ok: true,
      command: "op-undo-last-import",
      ...result,
    };
  }

  // ---- CLI handlers (return one-line summary, also write JSON to scratch) ----

  private async handleOpExportModuleCli(params: Record<string, string>): Promise<string> {
    const command = "op-export-module";
    try {
      const parsed = parseExportModuleParams(params);
      if (!parsed.ok) return parsed.error;
      const args =
        parsed.value.mode === "id"
          ? { kind: "id" as const, moduleId: parsed.value.moduleId }
          : { kind: "project" as const, projectSlug: parsed.value.projectSlug };
      const result = await exportModules(this.app, args);
      await writeUriResponse(this.app, {
        ok: true,
        command,
        mode: parsed.value.mode,
        files: result.files,
      });
      return `${command}: wrote ${result.files.length} file${result.files.length === 1 ? "" : "s"} (${result.files.map((f) => f.exportPath).join(", ")})`;
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error("[op-obsidian]", command, err);
      await writeUriResponse(this.app, { ok: false, command, error: msg });
      return `${command} failed: ${msg}`;
    }
  }

  private async handleOpImportModuleCli(params: Record<string, string>): Promise<string> {
    const command = "op-import-module";
    try {
      const parsed = parseImportModuleParams(params);
      if (!parsed.ok) return parsed.error;
      const scope = parsed.value.scope ?? "global";
      if (scope === "project" && !parsed.value.project) {
        return `${command} failed: --project is required when --scope=project`;
      }
      const prepared = await prepareImport(this.app, this.settings, {
        sourcePath: parsed.value.sourcePath,
        targetScope: scope,
        ...(parsed.value.project ? { targetProjectSlug: parsed.value.project } : {}),
        varAnswers: parsed.value.varAnswers,
      });
      const missing = prepared.plan.promptsNeeded.filter(
        (p) => !Object.prototype.hasOwnProperty.call(parsed.value.varAnswers, p.name),
      );
      if (missing.length > 0) {
        const payload = {
          ok: false,
          command,
          status: "needs-input",
          needsInput: {
            vars: missing.map((m) => ({
              name: m.name,
              prefill: m.prefill,
              hasModuleDefault: m.hasModuleDefault,
              ...(m.description ? { description: m.description } : {}),
            })),
          },
          plan: prepared.plan,
        };
        await writeUriResponse(this.app, payload);
        return `${command}: needs-input — supply --var.<name>=<value> for: ${missing.map((m) => m.name).join(", ")}`;
      }
      const result = await commitImport(
        this.app,
        this.settings,
        () => this.saveSettings(),
        { prepared, varAnswers: parsed.value.varAnswers },
      );
      await writeUriResponse(this.app, { ok: true, command, ...result });
      return `${command}: ${result.targetPath} (${result.varsWritten.length} var${result.varsWritten.length === 1 ? "" : "s"}; tx ${result.transactionPath})`;
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error("[op-obsidian]", command, err);
      await writeUriResponse(this.app, { ok: false, command, error: msg });
      return `${command} failed: ${msg}`;
    }
  }

  private async handleOpUndoLastImportCli(): Promise<string> {
    const command = "op-undo-last-import";
    try {
      const result = await undoLastImport(
        this.app,
        this.settings,
        () => this.saveSettings(),
      );
      await writeUriResponse(this.app, { ok: true, command, ...result });
      if (result.status === "no-history") return `${command}: no transaction history to undo.`;
      return `${command}: reverted ${result.modulesReverted.length} module(s), removed ${result.varsRemoved.length} var(s).`;
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error("[op-obsidian]", command, err);
      await writeUriResponse(this.app, { ok: false, command, error: msg });
      return `${command} failed: ${msg}`;
    }
  }

  /**
   * Returns the active workflow file iff it qualifies for the keyed-map
   * affordance per OP-202: file is `Projects/<slug>/WORKFLOW.md`, declares
   * more than one agent in `default_agent`, and `default_model` is currently
   * a scalar/list (not yet a per-agent map). Pure-ish — only `app.workspace`
   * and `metadataCache` are touched. Returns `null` when the affordance does
   * not apply (this is the gate for the palette command's checkCallback).
   */
  private activeKeyedMapCandidate():
    | {
        path: string;
        workflow: {
          defaultAgent: string[];
          defaultModelValues: string[];
        };
      }
    | null {
    const file = this.app.workspace.getActiveFile();
    if (!file) return null;
    if (!file.path.endsWith("/WORKFLOW.md")) return null;
    const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
    if (!fm) return null;
    const agents = readAgentList(fm.default_agent);
    if (agents.length < 2) return null;
    const modelValues = readModelScalarOrList(fm.default_model);
    if (modelValues === null) return null; // already a per-agent map (or invalid)
    // Don't offer conversion when there are no model values to distribute —
    // an empty / absent default_model isn't meaningful to promote to a
    // per-agent keyed map (every agent would get an empty string, which is
    // no more informative than leaving the field absent).
    if (modelValues.length === 0) return null;
    return {
      path: file.path,
      workflow: { defaultAgent: agents, defaultModelValues: modelValues },
    };
  }

  private async runSwitchModelToKeyedMap(
    path: string,
    workflow: { defaultAgent: string[]; defaultModelValues: string[] },
  ): Promise<void> {
    try {
      const file = this.app.vault.getAbstractFileByPath(path);
      if (!file || !(file instanceof TFile)) {
        notify(`op-switch-model: file not found at ${path}`);
        return;
      }
      const map: Record<string, string | string[]> = {};
      for (const agent of workflow.defaultAgent) {
        map[agent] =
          workflow.defaultModelValues.length === 1
            ? workflow.defaultModelValues[0]
            : workflow.defaultModelValues.slice();
      }
      await this.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
        fm.default_model = map;
      });
      notify(
        `op-switch-model: ${path} default_model converted to per-agent map (${workflow.defaultAgent.length} agents).`,
      );
    } catch (err: any) {
      console.error("[op-obsidian] op-switch-model failed", err);
      notify(`op-switch-model failed: ${err?.message ?? err}`);
    }
  }

  private async doEditWorkflow(slug: string): Promise<void> {
    try {
      const res = await editWorkflow(
        this.app,
        this.settings,
        this.detector,
        () => this.saveSettings(),
        slug,
      );
      if (res) {
        notify(
          `op-edit-workflow: ${res.project} → ${res.agent} in ${res.workingDir} (tmux: ${res.tmuxSession}:${res.tmuxWindow})`,
        );
      }
    } catch (err: any) {
      console.error("[op-obsidian] op-edit-workflow failed", err);
      notify(`op-edit-workflow failed: ${err?.message ?? err}`);
    }
  }

  private async runDebugAgentLaunch(): Promise<void> {
    try {
      const detection = this.detector.get() ?? (await this.detector.refresh());
      const agentId: AgentId = AGENT_IDS.find((id) => detection[id]?.installed) ?? this.settings.defaultAgent;
      const profile = resolveProfile(this.settings, agentId);
      const det = detection[agentId];
      const binary = det?.path ?? profile.binary;

      const vaultBasePath = (this.app.vault.adapter as unknown as { basePath?: string }).basePath;
      const cwd = vaultBasePath ?? process.env.HOME ?? "/tmp";
      const issueId = `debug-${Date.now().toString(36)}`;

      const res = await launchInTerminal({
        cwd,
        binary,
        launchFlags: profile.launchFlags,
        prompt: "",
        terminalApp: this.settings.terminal,
        iTermPlacement: this.settings.iTermPlacement,
        tmuxBinary: this.settings.tmuxBinary,
        issueId,
        agentId,
        debug: true,
        backgroundLaunch: this.settings.backgroundLaunch,
      });
      notify(
        `op-debug-agent-launch: ${issueId} (tmux: ${res.tmuxSession}:${res.tmuxWindow})`,
      );
    } catch (err: any) {
      console.error("[op-obsidian] op-debug-agent-launch failed", err);
      notify(`op-debug-agent-launch failed: ${err?.message ?? err}`);
    }
  }

  private async doOpenAgent(
    entry: IssueEntry,
    opts: {
      forcePick?: boolean;
      agentOverride?: AgentId;
      mode?: AgentLaunchMode;
      /** OP-204 (3d): per-launch user-var overrides from the launch modal,
       *  the URI parser, or the auto-advance carry-through. */
      launchVars?: Record<string, string>;
      /** OP-205 (3e): see {@link OpenAgentArgs.interactive}. */
      interactive?: boolean;
      /** OP-205 (3e): see {@link OpenAgentArgs.launchModelOverride}. */
      launchModelOverride?: string;
    } = {},
  ): Promise<void> {
    try {
      // OP-204 (3d): forcePick paths route through the new launch modal so the
      // user can both pick the agent AND set Workflow-variable overrides at
      // the same time. Silent default-agent launches skip the modal — no
      // regression for the zero-friction happy path.
      let effectiveAgentOverride = opts.agentOverride;
      let effectiveLaunchVars = opts.launchVars;
      if (opts.forcePick) {
        const detection = this.detector.get() ?? (await this.detector.refresh());
        const installed = AGENT_IDS.filter((id) => detection?.[id]?.installed);
        if (installed.length === 0) {
          notify("op: no supported agent binaries found on PATH");
          return;
        }
        const carried =
          opts.launchVars && Object.keys(opts.launchVars).length > 0
            ? opts.launchVars
            : this.readLaunchVarsFrontmatter(entry.path);
        const result = await openLaunchAgentModal(this.app, {
          project: entry.project,
          installed,
          defaultAgent: this.settings.defaultAgent,
          settings: this.settings,
          initialLaunchVars: carried,
          saveSettings: () => this.saveSettings(),
        });
        if (!result) return; // user cancelled
        effectiveAgentOverride = result.agentId;
        effectiveLaunchVars = result.launchVars;
      }
      const res = await openAgent(
        this.app,
        this.store,
        this.settings,
        this.detector,
        () => this.saveSettings(),
        {
          entry,
          forcePick: false,
          agentOverride: effectiveAgentOverride,
          mode: opts.mode,
          launchVars: effectiveLaunchVars,
          interactive: opts.interactive,
          launchModelOverride: opts.launchModelOverride,
          // OP-205 (3e): when the recovery dialog resolves with a usable
          // outcome, retry the launch automatically — the user already told
          // us how to proceed (override or patched-and-good).
          onResolverFailureResolved: (outcome) => {
            if (outcome.kind === "override") {
              void this.doOpenAgent(entry, {
                ...opts,
                launchModelOverride: outcome.canonicalModel,
              });
            } else if (outcome.kind === "patched") {
              void this.doOpenAgent(entry, opts);
            }
            // `cancelled` / `reverted` — no retry; user closes the loop.
          },
        },
      );
      if (res) {
        await this.recordRecency(res.issueId);
        const modeLabel =
          res.mode === "work" || res.mode === "implement"
            ? ""
            : ` [${res.mode.toUpperCase()} MODE]`;
        notify(
          `op-open-agent: ${res.issueId} → ${res.agent}${modeLabel} in ${res.workingDir} (tmux: ${res.tmuxSession}:${res.tmuxWindow})`,
        );
      }
    } catch (err: any) {
      console.error("[op-obsidian] op-open-agent failed", err);
      notify(`op-open-agent failed: ${err?.message ?? err}`);
    }
  }

  private async handleOpOpenAgentUri(
    params: Record<string, string>,
  ): Promise<UriResponsePayload> {
    const id = params.id ?? params.issue;
    if (!id) throw new Error("op-open-agent URI requires id");
    const entry = this.resolveByIdOrThrow(id);
    const agentOverride =
      params.agent && AGENT_IDS.includes(params.agent as AgentId)
        ? (params.agent as AgentId)
        : undefined;
    const forcePick = params.pick === "1" || params.pick === "true";
    const mode: AgentLaunchMode = isAgentLaunchMode(params.mode) ? params.mode : "work";
    // OP-204 (3d): collect any `var.<name>=<value>` URI keys (or the packed
    // `vars=` form) into the launch-override map. URIs are automation; we do
    // NOT show the modal even when overrides are present — caller is
    // expressing intent in the URI shape itself.
    const launchVarsFromUri = parseLaunchVarsFromUri(params);
    const launchVars =
      Object.keys(launchVarsFromUri).length > 0 ? launchVarsFromUri : undefined;
    const res = await openAgent(
      this.app,
      this.store,
      this.settings,
      this.detector,
      () => this.saveSettings(),
      // OP-205 (3e): URI launches are automation — do NOT yank the user into
      // the recovery modal on a bad-model error; surface via actionable Notice
      // instead. The URI caller expressed intent in the URI shape and cannot
      // participate in a modal dialog callback loop.
      { entry, agentOverride, forcePick, mode, launchVars, interactive: false },
    );
    if (!res) throw new Error("op-open-agent was cancelled or no agent available");
    await this.recordRecency(res.issueId);
    return {
      ok: true,
      command: "op-open-agent",
      issueId: res.issueId,
      agent: res.agent,
      mode: res.mode,
      workingDir: res.workingDir,
      scriptPath: res.scriptPath,
      tmuxSession: res.tmuxSession,
      tmuxWindow: res.tmuxWindow,
    };
  }

  private async handleOpEditWorkflowUri(
    params: Record<string, string>,
  ): Promise<UriResponsePayload> {
    const parsed = parseEditWorkflowParams(params);
    if (!parsed.ok) throw new Error(parsed.error);
    const res = await editWorkflow(
      this.app,
      this.settings,
      this.detector,
      () => this.saveSettings(),
      parsed.value.project,
    );
    if (!res) {
      throw new Error("op-edit-workflow was cancelled or no agent available");
    }
    return {
      ok: true,
      command: "op-edit-workflow",
      project: res.project,
      agent: res.agent,
      workingDir: res.workingDir,
      workflowPath: res.workflowPath,
      scriptPath: res.scriptPath,
      tmuxSession: res.tmuxSession,
      tmuxWindow: res.tmuxWindow,
    };
  }

  private async handleOpEditModuleUri(
    params: Record<string, string>,
  ): Promise<UriResponsePayload> {
    const parsed = parseEditModuleParams(params);
    if (!parsed.ok) throw new Error(parsed.error);
    const res = await editModule(
      this.app,
      this.settings,
      this.detector,
      () => this.saveSettings(),
      {
        moduleId: parsed.value.moduleId,
        scopeKind: parsed.value.scopeKind,
        projectSlug: parsed.value.project,
      },
    );
    if (!res) {
      throw new Error("op-edit-module was cancelled or no agent available");
    }
    return {
      ok: true,
      command: "op-edit-module",
      moduleId: res.moduleId,
      scopeKind: res.scopeKind,
      project: res.projectSlug ?? null,
      agent: res.agent,
      workingDir: res.workingDir,
      modulePath: res.modulePath,
      scriptPath: res.scriptPath,
      tmuxSession: res.tmuxSession,
      tmuxWindow: res.tmuxWindow,
    };
  }

  private async handleOpAgentEndedUri(
    params: Record<string, string>,
  ): Promise<UriResponsePayload> {
    const id = params.id ?? params.issue;
    if (!id) throw new Error("op-agent-ended URI requires id");
    // OP-156 Q1 follow-up: when SessionEnd fires immediately after a resolve
    // that retained `agent:` (live tmux at probe time), the file has just been
    // renamed into RESOLVED ISSUES/. The IssueStore refreshes on the
    // metadataCache `changed` event, which is async; in the gap the store has
    // no entry for the moved file and this lookup misses, leaving `agent:`
    // permanently pinned on the resolved note. Brief retry closes the gap
    // without blocking the URI handler.
    const entry = await this.findIssueByIdWithRetry(id);
    if (!entry) {
      return { ok: true, command: "op-agent-ended", issueId: id, cleared: false };
    }
    await clearAgentOnIssue(this.app, entry.path);
    colorRegistry.release(id);
    // V1: the SessionEnd shell hook can't pass an exit code, so any URI hit is
    // treated as a clean exit. Crashes don't fire SessionEnd at all, so they
    // leave `flow:` pinned automatically. Future: hook reads `reason` from
    // stdin and forwards `exit_status=abnormal`.
    const exitStatus: FlowExitStatus = params.exit_status === "abnormal" ? "abnormal" : "clean";
    let advanced: FlowAdvanceOutput | null = null;
    if (this.settings.flow.autoAdvance) {
      try {
        advanced = await this.advanceFlowAndLaunch(entry, exitStatus);
      } catch (err: any) {
        console.error("[op-obsidian] flow auto-advance failed", err);
        notify(`op: flow auto-advance failed — ${err?.message ?? err}`);
      }
    }
    return {
      ok: true,
      command: "op-agent-ended",
      issueId: id,
      path: entry.path,
      cleared: true,
      exitStatus,
      autoAdvance: this.settings.flow.autoAdvance,
      advancedTo: advanced ? advanced.nextFlow : undefined,
      launchedMode: advanced ? advanced.nextMode : undefined,
    };
  }

  /**
   * Read `flow`/`complexity` from the issue's frontmatter, run the orchestrator
   * decision, write the new `flow:` value, then launch the next stage's agent.
   * Returns the decision so callers can include it in their response payload.
   * Returns `null` when no advance is possible (terminal stage, missing
   * complexity at evaluate, or abnormal exit).
   */
  private async advanceFlowAndLaunch(
    entry: IssueEntry,
    exitStatus: FlowExitStatus,
  ): Promise<FlowAdvanceOutput | null> {
    const { flow, complexity } = this.readFlowState(entry.path);
    // OP-188: load the project's workflow file so flowAdvanceDecision can
    // walk its `steps:` list. `loadWorkflowFile` returns `null` for missing
    // files and `isLegacy: true` for synthesised legacy shapes — both cases
    // route through the orchestrator's hardcoded-matrix fallback so
    // pre-modules projects keep auto-advancing until OP-189 migrates them.
    const { workflow } = await loadWorkflowFile(this.app, entry.project);
    const decision = flowAdvanceDecision({ workflow, flow, complexity, exitStatus });
    if (!decision) return null;
    await setFlow(this.app, entry, { flow: decision.nextFlow });
    // Yield once so the metadataCache `changed` event has a chance to fan
    // through IssueStore before we re-read. openAgent itself is fine with the
    // stale entry, but we prefer the freshly-parsed copy when available so any
    // dependent state (status, path after rename) is current.
    await new Promise((r) => setTimeout(r, 0));
    const refreshed = this.store.byId(entry.id);
    const target = refreshed && refreshed.type === "issue" ? refreshed : entry;
    // OP-204 (3d): carry the prior stage's `launch_vars:` forward so a level-4
    // override the user typed in stage N is still active in stage N+1. Read
    // off the cached frontmatter via metadataCache (no disk re-read needed —
    // openAgent just wrote the field if there were any overrides).
    const carriedLaunchVars = this.readLaunchVarsFrontmatter(target.path);
    // OP-205 (3e): auto-advance is headless — surface bad-model failures via
    // the actionable Notice rather than yanking the user into a modal they
    // didn't trigger.
    await this.doOpenAgent(target, {
      mode: decision.nextMode,
      interactive: false,
      launchVars:
        Object.keys(carriedLaunchVars).length > 0 ? carriedLaunchVars : undefined,
    });
    return decision;
  }

  /**
   * OP-204 (3d): read `launch_vars:` from the issue note's cached frontmatter
   * via metadataCache. Returns `{}` when the key is missing or unusable —
   * mirrors {@link readLaunchVarsFromFrontmatter} but bound to a path rather
   * than a raw value.
   */
  private readLaunchVarsFrontmatter(path: string): Record<string, string> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return {};
    const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
    return readLaunchVarsFromFrontmatter(fm?.launch_vars);
  }

  private runLaunchNextStageCommand(): void {
    this.pickIssueInteractive(async (entry) => {
      try {
        const decision = await this.advanceFlowAndLaunch(entry, "clean");
        if (!decision) {
          notify(
            `op: ${entry.id} has no next flow stage to launch — set complexity, or current stage is terminal`,
          );
        }
      } catch (err: any) {
        console.error("[op-obsidian] op-launch-next-stage failed", err);
        notify(`op-launch-next-stage failed: ${err?.message ?? err}`);
      }
    });
  }

  private runResetFlowCommand(): void {
    this.pickIssueInteractive(async (entry) => {
      try {
        await setFlow(this.app, entry, { flow: null, complexity: null });
        notify(`op: ${entry.id} flow + complexity cleared`);
      } catch (err: any) {
        console.error("[op-obsidian] op-reset-flow failed", err);
        notify(`op-reset-flow failed: ${err?.message ?? err}`);
      }
    });
  }

  private async handleOpLaunchNextStageUri(
    params: Record<string, string>,
  ): Promise<UriResponsePayload> {
    const id = params.id ?? params.issue;
    if (!id) throw new Error("op-launch-next-stage URI requires id");
    const entry = this.resolveByIdOrThrow(id);
    const decision = await this.advanceFlowAndLaunch(entry, "clean");
    return {
      ok: true,
      command: "op-launch-next-stage",
      issueId: entry.id,
      path: entry.path,
      advancedTo: decision ? decision.nextFlow : undefined,
      launchedMode: decision ? decision.nextMode : undefined,
    };
  }

  private async handleOpResetFlowUri(
    params: Record<string, string>,
  ): Promise<UriResponsePayload> {
    const id = params.id ?? params.issue;
    if (!id) throw new Error("op-reset-flow URI requires id");
    const entry = this.resolveByIdOrThrow(id);
    const res = await setFlow(this.app, entry, { flow: null, complexity: null });
    return {
      ok: true,
      command: "op-reset-flow",
      issueId: res.issueId,
      path: res.path,
    };
  }

  private async handleOpLaunchNextStageCli(params: Record<string, string>): Promise<string> {
    const command = "op-launch-next-stage";
    try {
      const id = params.issue ?? params.id;
      if (!id) {
        const error = `${command} failed: --issue is required`;
        await writeUriResponse(this.app, { ok: false, command, error });
        return error;
      }
      const entry = this.resolveByIdOrThrow(id);
      const decision = await this.advanceFlowAndLaunch(entry, "clean");
      await writeUriResponse(this.app, {
        ok: true,
        command,
        issueId: entry.id,
        path: entry.path,
        advancedTo: decision ? decision.nextFlow : undefined,
        launchedMode: decision ? decision.nextMode : undefined,
      });
      if (!decision) {
        return `${command}: ${entry.id} no advance available (set complexity, or stage is terminal)`;
      }
      return `${command}: ${entry.id} → ${decision.nextFlow} (mode ${decision.nextMode})`;
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error("[op-obsidian]", command, err);
      await writeUriResponse(this.app, { ok: false, command, error: msg });
      return `${command} failed: ${msg}`;
    }
  }

  private async handleOpResetFlowCli(params: Record<string, string>): Promise<string> {
    const command = "op-reset-flow";
    try {
      const id = params.issue ?? params.id;
      if (!id) {
        const error = `${command} failed: --issue is required`;
        await writeUriResponse(this.app, { ok: false, command, error });
        return error;
      }
      const entry = this.resolveByIdOrThrow(id);
      const res = await setFlow(this.app, entry, { flow: null, complexity: null });
      await writeUriResponse(this.app, {
        ok: true,
        command,
        issueId: res.issueId,
        path: res.path,
      });
      return `${command}: ${res.issueId} flow + complexity cleared`;
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error("[op-obsidian]", command, err);
      await writeUriResponse(this.app, { ok: false, command, error: msg });
      return `${command} failed: ${msg}`;
    }
  }

  /**
   * Read `flow:` and `complexity:` from the issue note's cached frontmatter.
   * Returns undefined for fields that are missing or not strings; the caller
   * passes both into `flowAdvanceDecision` which handles `undefined` cleanly.
   */
  private readFlowState(path: string): { flow?: Flow; complexity?: Complexity } {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return {};
    const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
    if (!fm) return {};
    const flow = typeof fm.flow === "string" ? (fm.flow as Flow) : undefined;
    const complexity =
      typeof fm.complexity === "string" ? (fm.complexity as Complexity) : undefined;
    return { flow, complexity };
  }

  private async runInstallAgentHooks(announce: boolean): Promise<void> {
    try {
      const res: HookInstallResult = await installAgentHooks({
        enforceWorktree: this.settings.agents.enforceWorktree,
      });
      if (announce) {
        const summary = res.installed.length
          ? `installed: ${res.installed.join(", ")}`
          : "no changes";
        const skipped = res.skipped.length ? ` · skipped: ${res.skipped.join(", ")}` : "";
        const guardParts: string[] = [];
        if (res.guardInstalled.length) guardParts.push(`guard on: ${res.guardInstalled.join(", ")}`);
        if (res.guardUninstalled.length) guardParts.push(`guard off: ${res.guardUninstalled.join(", ")}`);
        const guard = guardParts.length ? ` · ${guardParts.join(" · ")}` : "";
        notify(`op: agent hooks ${summary}${skipped}${guard}`);
      }
    } catch (err: any) {
      console.error("[op-obsidian] agent hook install failed", err);
      if (announce) notify(`op: agent hook install failed — ${err?.message ?? err}`);
    }
  }

  /**
   * Re-run {@link installAgentHooks} and show a `Notice` summarizing the
   * result. Called from the settings tab after the user toggles
   * “Enforce worktree for delegated agents”.
   */
  async reinstallAgentHooks(): Promise<void> {
    await this.runInstallAgentHooks(true);
  }

  private async handleOpNewUri(params: Record<string, string>): Promise<void> {
    const slug = params.project ?? params.slug;
    const title = params.title;
    if (!slug || !title) {
      throw new Error("op-new URI requires project and title");
    }
    const priority = (params.priority as Priority | undefined) ?? "med";
    const { scope, scopeBody } = resolveScopeParams(params);
    const githubIssue = params.github_issue?.trim() || undefined;
    const res = await createIssue(this.app, this.store, {
      slug,
      title,
      priority,
      scope,
      scopeBody,
      githubIssue,
    });
    notify(`Created ${res.id}`);
    const file = this.app.vault.getAbstractFileByPath(res.path);
    if (file instanceof TFile) {
      await this.app.workspace.getLeaf(false).openFile(file);
    }
    // Fire-and-forget gh create — see OP-137 / handleOpNewCli for context.
    if (!githubIssue && this.settings.github.autoCreateGithubIssue) {
      void this.autoCreateGithubIssueFor(res.path, res.id, {
        slug,
        title,
        priority,
        scope,
        scopeBody,
      }).catch(
        (err) => console.error("[op-obsidian] uri auto-create failed", err),
      );
    }
  }

  /**
   * OP-151 chip helper — reopen a resolved/wontfix issue. Flips
   * `status: open`, clears `resolved:`, moves the file out of
   * `RESOLVED ISSUES/`. Idempotent on `RESOLVED ISSUES/` membership: if
   * the file is already in `ISSUES/` we only flip the frontmatter.
   */
  private async runReopenCommand(path: string): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      new Notice(`op: reopen — file not found at ${path}`);
      return;
    }
    await this.app.fileManager.processFrontMatter(file, (fm) => {
      fm.status = "open";
      delete (fm as Record<string, unknown>).resolved;
    });
    if (path.includes("/RESOLVED ISSUES/")) {
      const newPath = path.replace("/RESOLVED ISSUES/", "/ISSUES/");
      const dir = newPath.slice(0, newPath.lastIndexOf("/"));
      const dirEntry = this.app.vault.getAbstractFileByPath(dir);
      if (!dirEntry) await this.app.vault.createFolder(dir);
      try {
        await this.app.fileManager.renameFile(file, newPath);
      } catch (err: any) {
        new Notice(`op: reopen — move failed (${err?.message ?? err})`);
        return;
      }
    }
    new Notice("op: issue reopened");
    dispatchChipRefresh(this.app);
  }

  /** OP-151 chip helper — set priority via prompt. Tiny wrapper. */
  private async runSetPriorityCommand(path: string): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return;
    const cycle: Array<"low" | "med" | "high"> = ["low", "med", "high"];
    const current =
      (this.app.metadataCache.getFileCache(file)?.frontmatter as
        | { priority?: string }
        | undefined)?.priority ?? "med";
    const next = cycle[(cycle.indexOf(current as any) + 1) % cycle.length];
    await this.app.fileManager.processFrontMatter(file, (fm) => {
      fm.priority = next;
    });
    new Notice(`op: priority → ${next}`);
  }

  /** OP-161 chip helper — scaffold the demo project. */
  private async runStartTourCommand(): Promise<void> {
    try {
      const result = await scaffoldDemoProject(this.app);
      if (!result.created) {
        new Notice("op: demo project already present at " + DEMO_PROJECT_FOLDER);
      } else {
        new Notice("op: demo project scaffolded at " + DEMO_PROJECT_FOLDER);
        const status = this.app.vault.getAbstractFileByPath(result.statusPath);
        if (status instanceof TFile) {
          await this.app.workspace.getLeaf(false).openFile(status);
        }
      }
    } catch (err: any) {
      console.error("[op-obsidian] start-tour failed", err);
      new Notice("op: start tour failed — " + (err?.message ?? err));
    }
  }

  /** OP-161 chip helper — trash the demo project. */
  private async runRemoveDemoCommand(): Promise<void> {
    try {
      const result = await removeDemoProject(this.app);
      if (!result.removed) {
        new Notice("op: demo project not found (already removed?).");
      } else {
        new Notice("op: demo project trashed.");
      }
    } catch (err: any) {
      console.error("[op-obsidian] remove-demo failed", err);
      new Notice("op: remove demo failed — " + (err?.message ?? err));
    }
  }

  /**
   * Synchronous "is the agent's tmux window alive?" probe used by the
   * note chip. Reuses {@link findAgentTmuxLocation} via the cached
   * orchestrator session list. Returns `null` when the agent field is
   * empty (the chip treats that as "no agent set" — irrelevant) or
   * when we can't read tmux output (treat as live to avoid false-stale
   * chips). The chip's signature includes the result so a `metadataCache`
   * change will recompute, but we don't expensively poll on every paint.
   */
  private isAgentLiveSync(id: string, agent: string | undefined): boolean | null {
    if (!agent || agent.trim().length === 0) return null;
    const live = this.liveTmuxWindowsCache;
    if (!live) return null;
    return live.has(tmuxWindowName(id));
  }
}

function formatRegistrationNote(res: WorkIssueResult): string {
  if (res.conflict) {
    const parts: string[] = [];
    if (res.conflict.agent) parts.push(`agent=${res.conflict.agent}`);
    if (res.conflict.session) parts.push(`session=${res.conflict.session}`);
    return ` · registration conflict (${parts.join(", ")}; pass force=true to override)`;
  }
  if (res.alreadyHeld) return " · registration unchanged";
  if (res.registration) return ` · registered as ${res.registration.agent}`;
  return "";
}

function issueIdNumericSuffix(id: string): number {
  const m = id.match(/-(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
}

function defaultBinaryFor(id: AgentId): string {
  switch (id) {
    case "claude":
      return "claude";
    case "gemini":
      return "gemini";
    case "copilot":
      return "copilot";
  }
}

function buildGithubBody(id: string, input: CreateIssueInput): string {
  const lines = [`Tracked as op issue **${id}**.`, ""];
  if (input.scopeBody && input.scopeBody.trim().length > 0) {
    lines.push("## Scope", "", input.scopeBody.replace(/\s+$/g, ""));
  } else if (input.scope && input.scope.length > 0) {
    lines.push("## Scope", "");
    for (const b of input.scope) lines.push(`- [ ] ${b}`);
  }
  return lines.join("\n").trim();
}

// Resolve the raw `scope=` / `scope_mode=` params into either bullets or a
// verbatim body. Reject H2/code-fence payloads in bullets mode (OP-124).
// Returns an empty object when no scope was supplied.
function resolveScopeParams(
  params: Record<string, string>,
): { scope?: string[]; scopeBody?: string } {
  const raw = params.scope;
  if (typeof raw !== "string" || raw.trim() === "") return {};
  const rawMode = params.scope_mode;
  let mode: NewScopeMode = "bullets";
  if (rawMode !== undefined && rawMode !== "") {
    if (rawMode !== "bullets" && rawMode !== "body") {
      throw new Error("scope_mode must be 'bullets' or 'body'");
    }
    mode = rawMode;
  }
  const parsed = parseNewScopePayload(raw, mode);
  return parsed.kind === "bullets"
    ? { scope: parsed.bullets }
    : { scopeBody: parsed.body };
}
