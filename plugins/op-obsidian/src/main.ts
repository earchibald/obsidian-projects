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
import {
  closeGithubIssue,
  createGithubIssue,
  setGithubIssue,
} from "./github";
import { resolveRepoPath } from "./repoPath";
import { writeUriResponse, type UriResponsePayload } from "./uriResponse";
import { normalizeUriParams, collectRepeated } from "./uriParams";
import { runResolve, type ResolveArgs, type ResolveStatus } from "./resolve";
import type { IssueEntry, LifecycleEvent } from "./types";
import { DEFAULT_SETTINGS, mergeSettings, OpSettingsTab, type OpSettings } from "./settings";
import { AgentDetector } from "./agentDetect";
import { AGENT_IDS, type AgentId } from "./agentProfiles";
import { openAgent, clearAgentOnIssue, resolveProfile } from "./openAgent";
import { launchInTerminal } from "./terminalLaunch";
import { installAgentHooks, type HookInstallResult } from "./agentHooks";
import { cleanupAgentSessions } from "./agentSessionCleanup";

export default class OpPlugin extends Plugin {
  bus!: EventBus;
  store!: IssueStore;
  settings: OpSettings = { ...DEFAULT_SETTINGS };
  detector!: AgentDetector;

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async onload(): Promise<void> {
    this.settings = mergeSettings(await this.loadData());
    this.detector = new AgentDetector((id) => {
      const overlay = this.settings.agentOverlays[id];
      return overlay?.binary ?? defaultBinaryFor(id);
    });
    // Kick a probe in the background so the first launch is instant.
    void this.detector.refresh().catch((err) => {
      console.debug("[op-obsidian] agent detection probe failed", err);
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
      void this.cleanupAgentStateFor([ev.prev.id]);
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
      id: "op-debug-agent-launch",
      name: "op: open agent to debug agent launch",
      callback: () => void this.runDebugAgentLaunch(),
    });

    this.addCommand({
      id: "op-dump-store",
      name: "op: dev — dump IssueStore to console",
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
      name: "op: dev — rebuild IssueStore",
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

    this.addCommand({
      id: "op-install-agent-hooks",
      name: "op: install SessionEnd hooks for agents",
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
  }

  onunload(): void {
    this.bus?.clear();
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
        (input) => {
          this.submitCreateIssue(input);
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
        new Notice(`op: no match — ${result.interpretation}`);
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

  private async submitCreateIssue(input: CreateIssueInput): Promise<void> {
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
    } catch (err: any) {
      console.error("[op-obsidian] createIssue failed", err);
      new Notice(`op: create failed — ${err?.message ?? err}`);
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
    this.pickIssueInteractive(async (entry) => {
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
    });
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
        new Notice(`op: no match — ${result.interpretation}`);
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
    const entry = this.store
      .issues()
      .find((e) => e.id === id);
    if (!entry) throw new Error(`Issue not found: ${id}`);
    return entry;
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

  private async handleOpWorkUri(params: Record<string, string>): Promise<UriResponsePayload> {
    const id = params.id ?? params.issue;
    if (!id) throw new Error("op-work URI requires id");
    const entry = this.resolveByIdOrThrow(id);
    const res = await workIssue(this.app, this.store, entry);
    return {
      ok: true,
      command: "op-work",
      issueId: res.issueId,
      path: res.path,
      previousStatus: res.previousStatus,
      createdTaskPath: res.createdTaskPath,
    };
  }

  private async handleOpAppendCommitUri(
    params: Record<string, string>,
  ): Promise<UriResponsePayload> {
    const id = params.id ?? params.issue;
    const sha = params.sha;
    const subject = params.subject;
    if (!id || !sha || !subject) {
      throw new Error("op-append-commit URI requires id, sha, subject");
    }
    const entry = this.resolveByIdOrThrow(id);
    const res = await appendCommit(this.app, entry, { sha, subject });
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

  private async handleOpSetPrUri(params: Record<string, string>): Promise<UriResponsePayload> {
    const id = params.id ?? params.issue;
    const url = params.url ?? params.pr;
    if (!id || !url) throw new Error("op-set-pr URI requires id and url");
    const entry = this.resolveByIdOrThrow(id);
    const res = await setPr(this.app, entry, url);
    return {
      ok: true,
      command: "op-set-pr",
      issueId: res.issueId,
      path: res.path,
      pr: res.pr,
    };
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

  private async runResolveCommand(args: ResolveArgs): Promise<void> {
    const command = "op-resolve";
    try {
      const result = await runResolve(this.app, this.store, this.withGhCloseHook(args));
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
      const slug = params.project ?? params.slug;
      const title = params.title;
      if (!slug) return `${command} failed: --project is required`;
      if (!title) return `${command} failed: --title is required`;
      const priority = (params.priority as Priority | undefined) ?? "med";
      const scope = collectRepeated(params, "scope");
      const res = await createIssue(this.app, this.store, { slug, title, priority, scope });
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
      const id = params.issue ?? params.id;
      if (!id) return `${command} failed: --issue is required`;
      const entry = this.resolveByIdOrThrow(id);
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
      const id = params.issue ?? params.id;
      const sha = params.sha;
      const subject = params.subject;
      if (!id || !sha || !subject) {
        return `${command} failed: --issue, --sha, --subject all required`;
      }
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
      const id = params.issue ?? params.id;
      const url = params.url ?? params.pr;
      if (!id || !url) return `${command} failed: --issue and --url required`;
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
      const result = await runResolve(this.app, this.store, this.withGhCloseHook(args));
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
    const result = await runResolve(this.app, this.store, args);
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

  private runOpenAgentCommand(forcePick: boolean): void {
    const activePath = this.activeIssuePath();
    if (activePath) {
      const entry = this.store.byPath(activePath);
      if (entry && entry.type === "issue") {
        void this.doOpenAgent(entry, { forcePick });
        return;
      }
    }
    this.pickIssueInteractive((entry) => {
      void this.doOpenAgent(entry, { forcePick });
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
    opts: { forcePick?: boolean; agentOverride?: AgentId } = {},
  ): Promise<void> {
    try {
      const res = await openAgent(
        this.app,
        this.store,
        this.settings,
        this.detector,
        () => this.saveSettings(),
        { entry, forcePick: opts.forcePick, agentOverride: opts.agentOverride },
      );
      if (res) {
        new Notice(
          `op-open-agent: ${res.issueId} → ${res.agent} in ${res.workingDir} (tmux: ${res.tmuxSession}:${res.tmuxWindow})`,
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
    const res = await openAgent(
      this.app,
      this.store,
      this.settings,
      this.detector,
      () => this.saveSettings(),
      { entry, agentOverride, forcePick },
    );
    if (!res) throw new Error("op-open-agent was cancelled or no agent available");
    return {
      ok: true,
      command: "op-open-agent",
      issueId: res.issueId,
      agent: res.agent,
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
    return { ok: true, command: "op-agent-ended", issueId: id, path: entry.path, cleared: true };
  }

  private async runInstallAgentHooks(announce: boolean): Promise<void> {
    try {
      const res: HookInstallResult = await installAgentHooks();
      if (announce) {
        const summary = res.installed.length
          ? `installed: ${res.installed.join(", ")}`
          : "no changes";
        const skipped = res.skipped.length ? ` · skipped: ${res.skipped.join(", ")}` : "";
        new Notice(`op: agent hooks ${summary}${skipped}`);
      }
    } catch (err: any) {
      console.error("[op-obsidian] agent hook install failed", err);
      if (announce) new Notice(`op: agent hook install failed — ${err?.message ?? err}`);
    }
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

