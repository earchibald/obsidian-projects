import { Notice, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { OP_SIDEBAR_VIEW_TYPE, OpSidebarView } from "./sidebarView";
import { revealAgentSession } from "./revealAgentSession";
import { EventBus } from "./eventBus";
import { IssueStore } from "./issueStore";
import { createIssue, type CreateIssueInput, type Priority } from "./createIssue";
import { findIssue } from "./findIssue";
import { listProjects } from "./projects";
import {
  AppendCommitModal,
  FindIssueModal,
  IssuePickerModal,
  NewIssueModal,
  ProjectSuggestModal,
  ScaffoldProjectModal,
  SetGithubIssueModal,
  SetPrModal,
} from "./modals";
import { scaffoldProject, type ScaffoldProjectResult } from "./scaffoldProject";
import { workIssue } from "./workIssue";
import { appendCommit, setPr } from "./commits";
import { setScope } from "./setScope";
import { setEvaluation } from "./setEvaluation";
import { setFlow, type Complexity, type Flow } from "./setFlow";
import { applyLink, removeLink, linkCheck, migrateLinks } from "./links";
import { RELATION_NAMES } from "./relations";
import { runEvaluatorFlow } from "./evaluator";
import { launchHeadless } from "./launchHeadless";
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
import { resolveRepoPath } from "./repoPath";
import { writeUriResponse, type UriResponsePayload } from "./uriResponse";
import { normalizeUriParams, collectRepeated } from "./uriParams";
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
  handleOpSetFlowUri as handleOpSetFlowUriPure,
  handleOpSetLinkUri as handleOpSetLinkUriPure,
  handleOpRemoveLinkUri as handleOpRemoveLinkUriPure,
  handleOpLinkCheckUri as handleOpLinkCheckUriPure,
  handleOpMigrateLinksUri as handleOpMigrateLinksUriPure,
  type UriHandlerDeps,
} from "./uriHandlers";
import {
  parseWorkParams,
  parseAppendCommitParams,
  parseSetPrParams,
  parseSetScopeParams,
  parseSetEvaluationParams,
  parseSetFlowParams,
  parseNewParams,
  parseSetLinkParams,
  parseRemoveLinkParams,
  parseLinkCheckParams,
} from "./cliHandlers";
import type { IssueEntry, LifecycleEvent } from "./types";
import { DEFAULT_SETTINGS, mergeSettings, OpSettingsTab, type OpSettings } from "./settings";
import { AgentDetector } from "./agentDetect";
import { AGENT_IDS, isAgentLaunchMode, type AgentId, type AgentLaunchMode } from "./agentProfiles";
import { openAgent, clearAgentOnIssue, resolveProfile } from "./openAgent";
import { launchInTerminal } from "./terminalLaunch";
import { installAgentHooks, type HookInstallResult } from "./agentHooks";
import { userError } from "./userError";
import { cleanupAgentSessions } from "./agentSessionCleanup";
import { detectTmux } from "./tmuxDetect";
import { configureClient } from "./iterm/client";
import { closeTransport } from "./iterm/connection";
import { existsSync } from "fs";

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
        new Notice(
          `op: tmux not found at ${this.settings.tmuxBinary} or common paths — agent launches will fail until you install tmux or set the path in Settings → op.`,
        );
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
        new Notice(`op: no repo_path for ${entry.project} — skipping gh issue close`);
        return;
      }
      return closeGithubIssue(repoPath, entry.githubIssue).catch((err: any) => {
        const msg = err?.message ?? String(err);
        console.error("[op-obsidian] gh issue close failed", msg);
        new Notice(`op: gh issue close failed — ${msg}`);
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
            new Notice(`op: auto-resolve failed — ${result.error ?? "unknown error"}`);
          }
        })
        .catch((err: any) => {
          const msg = err?.message ?? String(err);
          console.error("[op-obsidian] auto-resolve threw", args.path, msg);
          new Notice(`op: auto-resolve threw — ${msg}`);
        });
    });

    // Startup reconciliation: deletions that happened while the plugin
    // wasn't listening (Finder, CLI, or while Obsidian was closed) leave
    // stale tmux windows + registry surfaces. Reap any registry surface
    // whose issue no longer exists in the vault.
    this.app.workspace.onLayoutReady(() => {
      void this.reconcileAgentStateOnStartup();
    });

    this.registerView(
      OP_SIDEBAR_VIEW_TYPE,
      (leaf: WorkspaceLeaf) =>
        new OpSidebarView(
          leaf,
          this.store,
          this.bus,
          () => this.settings.view,
          (entry) => revealAgentSession(this.settings, entry.id),
          (entry, mode) => void this.doOpenAgent(entry, { mode }),
        ),
    );

    this.addCommand({
      id: "op-open-sidebar",
      name: "op: open sidebar",
      callback: () => this.revealSidebar(),
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
          new Notice("op: open an issue note first");
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
      name: "op: open agent (pick at runtime)",
      callback: () => this.runOpenAgentCommand(true),
    });

    this.addCommand({
      id: "op-open-agent-plan",
      name: "op: open agent for issue in PLAN MODE",
      callback: () => this.runOpenAgentCommand(false, "plan"),
    });

    this.addCommand({
      id: "op-open-agent-plan-pick",
      name: "op: open agent in PLAN MODE (pick at runtime)",
      callback: () => this.runOpenAgentCommand(true, "plan"),
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
      name: "op: migrate legacy parent_issue/subissues to parent/children",
      callback: () => void this.runMigrateLinksCommand(),
    });

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
        new Notice(`op: ${issues.length} issues, ${tasks.length} tasks (see console)`);
      },
    });

    this.addCommand({
      id: "op-rebuild-store",
      name: "op-dev: rebuild IssueStore",
      callback: () => {
        this.store.rebuild();
        new Notice("op: store rebuilt");
      },
    });

    this.registerObsidianProtocolHandler("op-scaffold", (params) => {
      this.runUri("op-scaffold", normalizeUriParams(params), (p) => this.handleOpScaffoldUri(p));
    });

    this.registerObsidianProtocolHandler("op-new", (params) => {
      this.handleOpNewUri(normalizeUriParams(params)).catch((err) => {
        console.error("[op-obsidian] op-new URI failed", err);
        new Notice(`op-new failed: ${err.message ?? err}`);
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

    this.registerObsidianProtocolHandler("op-set-scope", (params) => {
      this.runUri("op-set-scope", normalizeUriParams(params), (p) => this.handleOpSetScopeUri(p));
    });

    this.registerObsidianProtocolHandler("op-set-evaluation", (params) => {
      this.runUri("op-set-evaluation", normalizeUriParams(params), (p) =>
        this.handleOpSetEvaluationUri(p),
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

    this.addCommand({
      id: "op-install-agent-hooks",
      name: "op-dev: install SessionEnd hooks for agents",
      callback: () => {
        void this.runInstallAgentHooks(true);
      },
    });

    // Install hooks in the background so SessionEnd reports land reliably.
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
      });
      if (res.killed.length || res.prunedSurfaces.length) {
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
        new Notice(`op-scaffold: ${res.slug} (${res.prefix})${extra}`);
        const status = this.app.vault.getAbstractFileByPath(res.statusPath);
        if (status instanceof TFile) {
          await this.app.workspace.getLeaf(false).openFile(status);
        }
      } catch (err: any) {
        console.error("[op-obsidian] op-scaffold failed", err);
        new Notice(`op-scaffold failed: ${err?.message ?? err}`);
      }
    }).open();
  }

  private runNewIssueCommand(): void {
    const projects = listProjects(this.app);
    if (projects.length === 0) {
      new Notice("No projects found under Projects/");
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

  private runFindIssueCommand(): void {
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
      new Notice(`op: file not found on disk: ${entry.path}`);
    }
  }

  private async submitCreateIssue(
    input: CreateIssueInput,
    opts: { launchPlan?: boolean; startFlow?: boolean } = {},
  ): Promise<void> {
    try {
      const res = await createIssue(this.app, this.store, input);
      new Notice(`Created ${res.id}`);
      const file = this.app.vault.getAbstractFileByPath(res.path);
      if (file instanceof TFile) {
        await this.app.workspace.getLeaf(false).openFile(file);
      }
      if (!input.githubIssue && this.settings.github.autoCreateGithubIssue) {
        await this.autoCreateGithubIssueFor(res.path, res.id, input).catch((err) => {
          console.error("[op-obsidian] auto-create github issue failed", err);
          new Notice(`op: gh create failed — ${err?.message ?? err}`);
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
      new Notice(`op: create failed — ${err?.message ?? err}`);
    }
  }

  private async runEvaluatorForIssue(
    entry: IssueEntry,
    input: CreateIssueInput,
  ): Promise<void> {
    new Notice(`op: evaluating ${entry.id} — running op-evaluate…`, 6000);
    const body = (input.scope ?? []).map((s) => `- ${s}`).join("\n");
    try {
      const result = await runEvaluatorFlow(
        {
          launch: launchHeadless,
          setEvaluation: (e, evaluation) => setEvaluation(this.app, e, evaluation),
          setFlow: (e, i) => setFlow(this.app, e, i),
        },
        entry,
        body,
      );
      new Notice(
        `op: ${entry.id} evaluated — complexity=${result.complexity}. Advance manually via the command palette.`,
        8000,
      );
    } catch (err: any) {
      console.error("[op-obsidian] evaluator flow failed", err);
      new Notice(
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
      new Notice(`op: no repo_path for ${input.slug} — skipping gh create`);
      return;
    }
    const body = buildGithubBody(id, input);
    const url = await createGithubIssue({ repoPath, title: input.title, body });
    const entry = this.store.byPath(path);
    if (entry && entry.type === "issue") {
      await setGithubIssue(this.app, entry, url);
      new Notice(`op: linked ${id} → ${url}`);
    }
  }

  private runWorkCommand(): void {
    this.pickIssueInteractive(async (entry) => {
      try {
        const res = await workIssue(this.app, this.store, entry);
        const extra = res.createdTaskPath ? ` · created ${res.createdTaskPath.split("/").pop()}` : "";
        new Notice(`op-work: ${res.issueId} → in-progress${extra}`);
        await this.openIssue(entry);
      } catch (err: any) {
        console.error("[op-obsidian] op-work failed", err);
        new Notice(`op-work failed: ${err?.message ?? err}`);
      }
    });
  }

  private runAppendCommitCommand(): void {
    this.pickIssueInteractive((entry) => {
      new AppendCommitModal(this.app, entry, async (sha, subject) => {
        try {
          const res = await appendCommit(this.app, entry, { sha, subject });
          new Notice(
            res.added
              ? `op: appended commit to ${res.issueId}`
              : `op: commit already present on ${res.issueId}`,
          );
        } catch (err: any) {
          console.error("[op-obsidian] op-append-commit failed", err);
          new Notice(`op-append-commit failed: ${err?.message ?? err}`);
        }
      }).open();
    });
  }

  private runSetPrCommand(): void {
    this.pickIssueInteractive((entry) => {
      new SetPrModal(this.app, entry, async (url) => {
        try {
          const res = await setPr(this.app, entry, url);
          new Notice(`op: pr set on ${res.issueId}`);
        } catch (err: any) {
          console.error("[op-obsidian] op-set-pr failed", err);
          new Notice(`op-set-pr failed: ${err?.message ?? err}`);
        }
      }).open();
    });
  }

  private runSetGithubIssueCommand(): void {
    this.pickIssueInteractive((entry) => {
      new SetGithubIssueModal(this.app, entry, async (url) => {
        try {
          const res = await setGithubIssue(this.app, entry, url);
          new Notice(`op: github_issue set on ${res.issueId}`);
        } catch (err: any) {
          console.error("[op-obsidian] op-set-github-issue failed", err);
          new Notice(`op-set-github-issue failed: ${err?.message ?? err}`);
        }
      }).open();
    });
  }

  private runCreateGithubIssueCommand(): void {
    const run = async (entry: IssueEntry) => {
      try {
        const repoPath = resolveRepoPath(this.app, this.settings, entry.project);
        if (!repoPath) {
          new Notice(`op: no repo_path for ${entry.project}`);
          return;
        }
        const title = entry.title.replace(/^[A-Z]+-\d+\s+/, "");
        const body = await this.readIssueBody(entry.path);
        const url = await createGithubIssue({ repoPath, title, body });
        await setGithubIssue(this.app, entry, url);
        new Notice(`op: created ${url}`);
      } catch (err: any) {
        console.error("[op-obsidian] op-create-github-issue failed", err);
        new Notice(`op-create-github-issue failed: ${err?.message ?? err}`);
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
        new Notice(`${entry.id} has no github_issue URL`);
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
        new Notice(
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
      workIssue: (entry) => workIssue(this.app, this.store, entry),
      appendCommit: (entry, input) => appendCommit(this.app, entry, input),
      setPr: (entry, url) => setPr(this.app, entry, url),
      setScope: (entry, scope, options) => setScope(this.app, entry, scope, options),
      setEvaluation: (entry, evaluation) => setEvaluation(this.app, entry, evaluation),
      setFlow: (entry, input) => setFlow(this.app, entry, input),
      applyLink: (args) => applyLink(this.app, this.store, args),
      removeLink: (args) => removeLink(this.app, this.store, args),
      linkCheck: (opts) => linkCheck(this.app, this.store, opts),
      migrateLinks: () => migrateLinks(this.app, this.store),
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
        new Notice(`${command} failed: ${msg}`);
        await writeUriResponse(this.app, {
          ok: false,
          command,
          error: msg,
          params,
        });
      });
  }

  private handleOpWorkUri(params: Record<string, string>): Promise<UriResponsePayload> {
    return handleOpWorkUriPure(this.uriDeps(), params);
  }

  private handleOpAppendCommitUri(
    params: Record<string, string>,
  ): Promise<UriResponsePayload> {
    return handleOpAppendCommitUriPure(this.uriDeps(), params);
  }

  private handleOpSetPrUri(params: Record<string, string>): Promise<UriResponsePayload> {
    return handleOpSetPrUriPure(this.uriDeps(), params);
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
          new Notice(`op: no repo_path for ${entry.project} — skipping gh issue close`);
          return;
        }
        await closeGithubIssue(repoPath, entry.githubIssue);
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
      return await runResolve(this.app, this.store, this.withGhCloseHook(args));
    } finally {
      if (path) this.inFlightResolvePaths.delete(path);
    }
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
      });
    } catch (err: any) {
      console.error("[op-obsidian]", command, err);
      const msg = err?.message ?? String(err);
      new Notice(`${command} failed: ${msg}`);
      await writeUriResponse(this.app, { ok: false, command, error: msg });
    }
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
    const seedScope = seedTitle ? collectRepeated(params, "scope") : undefined;
    const repoPath = params.repo_path?.trim() || undefined;
    return scaffoldProject(this.app, this.store, {
      slug,
      prefix,
      repoPath,
      seedTitle,
      seedPriority,
      seedScope,
    });
  }

  private async handleOpNewCli(params: Record<string, string>): Promise<string> {
    const command = "op-new";
    try {
      const parsed = parseNewParams(params);
      if (!parsed.ok) return parsed.error;
      const { slug, title, priority } = parsed.value;
      const scope = collectRepeated(params, "scope");
      const res = await createIssue(this.app, this.store, { slug, title, priority, scope });
      if (this.settings.github.autoCreateGithubIssue) {
        await this.autoCreateGithubIssueFor(res.path, res.id, { slug, title, priority, scope }).catch(
          (err) => console.error("[op-obsidian] cli auto-create github issue failed", err),
        );
      }
      await writeUriResponse(this.app, {
        ok: true,
        command,
        issueId: res.id,
        path: res.path,
      });
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
      const res = await workIssue(this.app, this.store, entry);
      await writeUriResponse(this.app, {
        ok: true,
        command,
        issueId: res.issueId,
        path: res.path,
        previousStatus: res.previousStatus,
        createdTaskPath: res.createdTaskPath,
      });
      const extra = res.createdTaskPath ? ` · created ${res.createdTaskPath.split("/").pop()}` : "";
      return `${command}: ${res.issueId} → in-progress${extra}`;
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
      new Notice(`op-link-check: scanned ${res.scanned} · ${parts.join(" · ")}`);
    } catch (err: any) {
      console.error("[op-obsidian] op-link-check failed", err);
      new Notice(`op-link-check failed: ${err?.message ?? err}`);
    }
  }

  private async runMigrateLinksCommand(): Promise<void> {
    try {
      const res = await migrateLinks(this.app, this.store);
      await writeUriResponse(this.app, { ...res });
      new Notice(
        `op-migrate-links: scanned ${res.scanned} · rewrote ${res.rewrites.length}`,
      );
    } catch (err: any) {
      console.error("[op-obsidian] op-migrate-links failed", err);
      new Notice(`op-migrate-links failed: ${err?.message ?? err}`);
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
      });
      if (!result.ok) return `${command} failed: ${result.error ?? "unknown error"}`;
      const tCount = result.trashed?.length ?? 0;
      return `${command}: ${result.issueId} → ${result.status} · moved to ${result.movedTo} · trashed ${tCount} task(s)`;
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
    };
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
      });
      new Notice(
        `op-debug-agent-launch: ${issueId} (tmux: ${res.tmuxSession}:${res.tmuxWindow})`,
      );
    } catch (err: any) {
      console.error("[op-obsidian] op-debug-agent-launch failed", err);
      new Notice(`op-debug-agent-launch failed: ${err?.message ?? err}`);
    }
  }

  private async doOpenAgent(
    entry: IssueEntry,
    opts: { forcePick?: boolean; agentOverride?: AgentId; mode?: AgentLaunchMode } = {},
  ): Promise<void> {
    try {
      const res = await openAgent(
        this.app,
        this.store,
        this.settings,
        this.detector,
        () => this.saveSettings(),
        {
          entry,
          forcePick: opts.forcePick,
          agentOverride: opts.agentOverride,
          mode: opts.mode,
        },
      );
      if (res) {
        const modeLabel =
          res.mode === "work" || res.mode === "implement"
            ? ""
            : ` [${res.mode.toUpperCase()} MODE]`;
        new Notice(
          `op-open-agent: ${res.issueId} → ${res.agent}${modeLabel} in ${res.workingDir} (tmux: ${res.tmuxSession}:${res.tmuxWindow})`,
        );
      }
    } catch (err: any) {
      console.error("[op-obsidian] op-open-agent failed", err);
      new Notice(`op-open-agent failed: ${err?.message ?? err}`);
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
    const res = await openAgent(
      this.app,
      this.store,
      this.settings,
      this.detector,
      () => this.saveSettings(),
      { entry, agentOverride, forcePick, mode },
    );
    if (!res) throw new Error("op-open-agent was cancelled or no agent available");
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

  private async handleOpAgentEndedUri(
    params: Record<string, string>,
  ): Promise<UriResponsePayload> {
    const id = params.id ?? params.issue;
    if (!id) throw new Error("op-agent-ended URI requires id");
    const entry = this.store.issues().find((e) => e.id === id);
    if (!entry) {
      return { ok: true, command: "op-agent-ended", issueId: id, cleared: false };
    }
    await clearAgentOnIssue(this.app, entry.path);
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
        new Notice(`op: flow auto-advance failed — ${err?.message ?? err}`);
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
    const decision = flowAdvanceDecision({ flow, complexity, exitStatus });
    if (!decision) return null;
    await setFlow(this.app, entry, { flow: decision.nextFlow });
    // Yield once so the metadataCache `changed` event has a chance to fan
    // through IssueStore before we re-read. openAgent itself is fine with the
    // stale entry, but we prefer the freshly-parsed copy when available so any
    // dependent state (status, path after rename) is current.
    await new Promise((r) => setTimeout(r, 0));
    const refreshed = this.store.byId(entry.id);
    const target = refreshed && refreshed.type === "issue" ? refreshed : entry;
    await this.doOpenAgent(target, { mode: decision.nextMode });
    return decision;
  }

  private runLaunchNextStageCommand(): void {
    this.pickIssueInteractive(async (entry) => {
      try {
        const decision = await this.advanceFlowAndLaunch(entry, "clean");
        if (!decision) {
          new Notice(
            `op: ${entry.id} has no next flow stage to launch — set complexity, or current stage is terminal`,
          );
        }
      } catch (err: any) {
        console.error("[op-obsidian] op-launch-next-stage failed", err);
        new Notice(`op-launch-next-stage failed: ${err?.message ?? err}`);
      }
    });
  }

  private runResetFlowCommand(): void {
    this.pickIssueInteractive(async (entry) => {
      try {
        await setFlow(this.app, entry, { flow: null, complexity: null });
        new Notice(`op: ${entry.id} flow + complexity cleared`);
      } catch (err: any) {
        console.error("[op-obsidian] op-reset-flow failed", err);
        new Notice(`op-reset-flow failed: ${err?.message ?? err}`);
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
        new Notice(`op: agent hooks ${summary}${skipped}${guard}`);
      }
    } catch (err: any) {
      console.error("[op-obsidian] agent hook install failed", err);
      if (announce) new Notice(`op: agent hook install failed — ${err?.message ?? err}`);
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
    const scope = collectRepeated(params, "scope");
    const githubIssue = params.github_issue?.trim() || undefined;
    const res = await createIssue(this.app, this.store, {
      slug,
      title,
      priority,
      scope,
      githubIssue,
    });
    new Notice(`Created ${res.id}`);
    if (!githubIssue && this.settings.github.autoCreateGithubIssue) {
      await this.autoCreateGithubIssueFor(res.path, res.id, { slug, title, priority, scope }).catch(
        (err) => console.error("[op-obsidian] uri auto-create failed", err),
      );
    }
    const file = this.app.vault.getAbstractFileByPath(res.path);
    if (file instanceof TFile) {
      await this.app.workspace.getLeaf(false).openFile(file);
    }
  }
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
  if (input.scope && input.scope.length > 0) {
    lines.push("## Scope", "");
    for (const b of input.scope) lines.push(`- [ ] ${b}`);
  }
  return lines.join("\n").trim();
}

