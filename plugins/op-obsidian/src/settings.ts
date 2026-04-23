import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import { existsSync } from "fs";
import * as path from "path";
import type OpPlugin from "./main";
import { AGENT_IDS, type AgentId, type ProfileOverlay } from "./agentProfiles";
import type { ITermPlacement } from "./terminalLaunch";
import { LAYOUT_IDS, type LayoutId } from "./layout/layouts";
import { type RegistryData, emptyRegistry, mergeRegistry } from "./layout/registry";
import type { OrchestratorSettings } from "./orchestrator";
import { validateOverlay } from "./overlayValidate";
import { detectTmux } from "./tmuxDetect";

export const EXTRA_PREAMBLE_MAX = 4000;

export interface InjectionSettings {
  injectBody: boolean;
  maxBodyChars: number;
  includeTasksList: boolean;
  includeRecentCommits: number;
  extraPreamble: string;
}

export type SidebarTab = "issues" | "in-flight" | "resolved";

export interface ViewSettings {
  defaultTab: SidebarTab;
  recentResolvedLimit: number;
  openOnStartup: boolean;
}

export interface GithubSettings {
  autoCreateGithubIssue: boolean;
  closeGithubIssueOnResolve: boolean;
}

export interface AgentsSettings {
  enforceWorktree: boolean;
}

export interface OpSettings {
  defaultAgent: AgentId;
  alwaysPick: boolean;
  agentOverlays: Partial<Record<AgentId, ProfileOverlay>>;
  injection: InjectionSettings;
  workingDirs: Record<string, string>;
  terminal: "Terminal" | "iTerm";
  iTermPlacement: ITermPlacement;
  tmuxBinary: string;
  view: ViewSettings;
  github: GithubSettings;
  agents: AgentsSettings;
  orchestrator: OrchestratorSettings;
  orchestratorState: RegistryData;
}

export const DEFAULT_SETTINGS: OpSettings = {
  defaultAgent: "claude",
  alwaysPick: false,
  agentOverlays: {},
  injection: {
    injectBody: true,
    maxBodyChars: 8000,
    includeTasksList: true,
    includeRecentCommits: 5,
    extraPreamble: "",
  },
  workingDirs: {},
  terminal: "Terminal",
  iTermPlacement: "new-tab",
  tmuxBinary: "/opt/homebrew/bin/tmux",
  view: {
    defaultTab: "issues",
    recentResolvedLimit: 20,
    openOnStartup: false,
  },
  github: {
    autoCreateGithubIssue: false,
    closeGithubIssueOnResolve: true,
  },
  agents: {
    enforceWorktree: false,
  },
  orchestrator: {
    enabled: false,
    maxRows: 3,
    maxCols: 3,
    preferred: "2x2",
  },
  orchestratorState: emptyRegistry(),
};

const SIDEBAR_TABS: ReadonlySet<SidebarTab> = new Set(["issues", "in-flight", "resolved"]);

export function mergeSettings(loaded: unknown): OpSettings {
  const base: OpSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  if (!loaded || typeof loaded !== "object") return base;
  const l = loaded as Partial<OpSettings>;
  if (l.defaultAgent && AGENT_IDS.includes(l.defaultAgent as AgentId)) {
    base.defaultAgent = l.defaultAgent as AgentId;
  }
  if (typeof l.alwaysPick === "boolean") base.alwaysPick = l.alwaysPick;
  if (l.agentOverlays && typeof l.agentOverlays === "object") {
    base.agentOverlays = l.agentOverlays;
  }
  if (l.injection && typeof l.injection === "object") {
    base.injection = { ...base.injection, ...l.injection };
  }
  if (l.workingDirs && typeof l.workingDirs === "object") {
    base.workingDirs = { ...l.workingDirs };
  }
  if (l.terminal === "Terminal" || l.terminal === "iTerm") base.terminal = l.terminal;
  if (l.iTermPlacement === "new-tab" || l.iTermPlacement === "new-window") {
    base.iTermPlacement = l.iTermPlacement;
  }
  if (typeof l.tmuxBinary === "string" && l.tmuxBinary.trim()) {
    base.tmuxBinary = l.tmuxBinary.trim();
  }
  if (l.view && typeof l.view === "object") {
    const v = l.view as Partial<ViewSettings>;
    if (v.defaultTab && SIDEBAR_TABS.has(v.defaultTab)) base.view.defaultTab = v.defaultTab;
    if (typeof v.recentResolvedLimit === "number" && v.recentResolvedLimit > 0) {
      base.view.recentResolvedLimit = Math.floor(v.recentResolvedLimit);
    }
    if (typeof v.openOnStartup === "boolean") base.view.openOnStartup = v.openOnStartup;
  }
  if (l.orchestrator && typeof l.orchestrator === "object") {
    const o = l.orchestrator as Partial<OrchestratorSettings>;
    if (typeof o.enabled === "boolean") base.orchestrator.enabled = o.enabled;
    if (typeof o.maxRows === "number" && o.maxRows >= 1 && o.maxRows <= 3) {
      base.orchestrator.maxRows = Math.floor(o.maxRows);
    }
    if (typeof o.maxCols === "number" && o.maxCols >= 1 && o.maxCols <= 3) {
      base.orchestrator.maxCols = Math.floor(o.maxCols);
    }
    if (o.preferred && LAYOUT_IDS.includes(o.preferred as LayoutId)) {
      base.orchestrator.preferred = o.preferred as LayoutId;
    }
  }
  base.orchestratorState = mergeRegistry((l as { orchestratorState?: unknown }).orchestratorState);
  if (l.github && typeof l.github === "object") {
    const g = l.github as Partial<GithubSettings>;
    if (typeof g.autoCreateGithubIssue === "boolean") {
      base.github.autoCreateGithubIssue = g.autoCreateGithubIssue;
    }
    if (typeof g.closeGithubIssueOnResolve === "boolean") {
      base.github.closeGithubIssueOnResolve = g.closeGithubIssueOnResolve;
    }
  }
  if (l.agents && typeof l.agents === "object") {
    const a = l.agents as Partial<AgentsSettings>;
    if (typeof a.enforceWorktree === "boolean") {
      base.agents.enforceWorktree = a.enforceWorktree;
    }
  }
  return base;
}

export class OpSettingsTab extends PluginSettingTab {
  constructor(app: App, private plugin: OpPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    const s = this.plugin.settings;

    // Glossary — one place to define the jargon the individual settings
    // descriptions refer to (tmux, iTerm control mode, orchestrator, overlay,
    // worktree). Individual descriptions stay short and link back here in
    // spirit; this block is the source of truth for the terminology.
    const glossary = containerEl.createEl("details");
    glossary.createEl("summary", { text: "Glossary — tmux, orchestrator, overlay, worktree" });
    const gl = glossary.createEl("div", { cls: "setting-item-description" });
    const addTerm = (term: string, body: string): void => {
      const p = gl.createEl("p");
      p.createEl("strong", { text: `${term} — ` });
      p.appendText(body);
    };
    addTerm(
      "tmux",
      "Terminal multiplexer. op runs every agent inside a single shared tmux session (`op-agents`), with one window per issue id. Agents survive closing the terminal; reattach with `tmux attach -t op-agents`.",
    );
    addTerm(
      "iTerm control mode (`tmux -CC`)",
      "iTerm-specific integration where tmux drives native iTerm tabs/panes instead of rendering its own UI. op uses this when the terminal is set to iTerm.",
    );
    addTerm(
      "Orchestrator",
      "Optional layout engine that tiles agent panes into a grid inside the current iTerm window (macOS + iTerm only). Overflow spills to a new iTerm window. Off by default.",
    );
    addTerm(
      "Profile overlay",
      "Per-agent JSON patch merged on top of the built-in agent profile. Keys: `binary`, `launchFlags` (string[]), `promptPreamble`, `skillTrigger`, `label`. Unknown keys are flagged but saved.",
    );
    addTerm(
      "Working directory",
      "Absolute path to the code repo an agent is launched into. Resolved in order: the issue's project `repo_path:` frontmatter, then the slug → path map below, then an interactive modal prompt.",
    );
    addTerm(
      "Worktree enforcement",
      "An opt-in PreToolUse hook (Claude Code + Gemini only) that blocks Edit/Write on the main checkout for op-launched agents. Agents must `git worktree add` or export `OP_ALLOW_MAIN_EDIT=1` to override.",
    );

    containerEl.createEl("h2", { text: "Agents" });

    new Setting(containerEl)
      .setName("Default agent")
      .setDesc("Agent launched by “op: open agent for issue” when no override is given — e.g. claude, gemini, codex. The picker only appears when this agent isn't detected on PATH, or “Always prompt for agent” is on.")
      .addDropdown((d) => {
        for (const id of AGENT_IDS) d.addOption(id, id);
        d.setValue(s.defaultAgent).onChange(async (v) => {
          s.defaultAgent = v as AgentId;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Always prompt for agent")
      .setDesc("Show the picker modal every time, even when a default is set.")
      .addToggle((t) =>
        t.setValue(s.alwaysPick).onChange(async (v) => {
          s.alwaysPick = v;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("Detection")
      .setDesc(detectionSummary(this.plugin))
      .addButton((b) =>
        b.setButtonText("Re-probe").onClick(async () => {
          this.plugin.detector.invalidate();
          await this.plugin.detector.refresh();
          new Notice("op: agent detection refreshed");
          this.display();
        }),
      );

    containerEl.createEl("h3", { text: "Profile overlays (JSON per agent)" });
    containerEl.createEl("p", {
      text: "Overlays are a JSON patch merged on top of the built-in profile for each agent. See Glossary → Profile overlay. Allowed keys: `binary` (string — absolute path or PATH lookup), `launchFlags` (string[] appended to the command line), `promptPreamble` (string prepended to every prompt), `skillTrigger` (string — first line of the prompt), `label` (string for the sidebar badge). Example: `{ \"binary\": \"/opt/homebrew/bin/claude\", \"launchFlags\": [\"--dangerously-skip-permissions\"] }`.",
      cls: "setting-item-description",
    });
    for (const id of AGENT_IDS) {
      new Setting(containerEl)
        .setName(`${id} overlay`)
        .addTextArea((t) => {
          const existing = s.agentOverlays[id];
          t.setValue(existing ? JSON.stringify(existing, null, 2) : "");
          t.inputEl.rows = 5;
          t.inputEl.style.width = "100%";
          t.inputEl.addEventListener("blur", async () => {
            const raw = t.getValue().trim();
            if (!raw) {
              delete s.agentOverlays[id];
              await this.plugin.saveSettings();
              return;
            }
            let parsed: unknown;
            try {
              parsed = JSON.parse(raw);
            } catch (err: any) {
              new Notice(`${id} overlay: invalid JSON — ${err?.message ?? err}`);
              return;
            }
            const result = validateOverlay(parsed);
            if (!result.ok || !result.overlay) {
              new Notice(`${id} overlay: ${result.errors.join("; ")}`);
              return;
            }
            if (result.warnings.length) {
              new Notice(`${id} overlay saved with warnings: ${result.warnings.join("; ")}`);
            }
            s.agentOverlays[id] = result.overlay;
            await this.plugin.saveSettings();
          });
        });
    }

    containerEl.createEl("h2", { text: "Injection" });

    new Setting(containerEl)
      .setName("Inject issue body")
      .setDesc("Append the issue note's body (after frontmatter) to the launched prompt so the agent sees the scope without having to read the note.")
      .addToggle((t) =>
        t.setValue(s.injection.injectBody).onChange(async (v) => {
          s.injection.injectBody = v;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("Max body characters")
      .setDesc("Truncate the injected body to this many characters. Default 8000 ≈ ~2000 tokens.")
      .addText((t) =>
        t
          .setValue(String(s.injection.maxBodyChars))
          .onChange(async (v) => {
            const n = parseInt(v, 10);
            if (Number.isFinite(n) && n > 0) {
              s.injection.maxBodyChars = n;
              await this.plugin.saveSettings();
            }
          }),
      );

    new Setting(containerEl)
      .setName("Include linked TASKS")
      .setDesc("Include the titles of the issue's linked TASKS notes (auxiliary subtasks) in the prompt.")
      .addToggle((t) =>
        t.setValue(s.injection.includeTasksList).onChange(async (v) => {
          s.injection.includeTasksList = v;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("Recent commits to include")
      .setDesc("Number of recent entries from the issue's `commits:` frontmatter list to append to the prompt. 0 disables.")
      .addText((t) =>
        t.setValue(String(s.injection.includeRecentCommits)).onChange(async (v) => {
          const n = parseInt(v, 10);
          if (Number.isFinite(n) && n >= 0) {
            s.injection.includeRecentCommits = n;
            await this.plugin.saveSettings();
          }
        }),
      );

    const preambleSetting = new Setting(containerEl)
      .setName("Extra preamble")
      .setDesc(
        `Prepended verbatim to every launched prompt. ${s.injection.extraPreamble.length}/${EXTRA_PREAMBLE_MAX} chars.`,
      );
    preambleSetting.addTextArea((t) => {
      t.setValue(s.injection.extraPreamble);
      t.inputEl.rows = 3;
      t.inputEl.style.width = "100%";
      t.inputEl.maxLength = EXTRA_PREAMBLE_MAX;
      const updateCount = () => {
        preambleSetting.setDesc(
          `Prepended verbatim to every launched prompt. ${t.getValue().length}/${EXTRA_PREAMBLE_MAX} chars.`,
        );
      };
      t.inputEl.addEventListener("input", updateCount);
      t.inputEl.addEventListener("blur", async () => {
        const v = t.getValue().slice(0, EXTRA_PREAMBLE_MAX);
        if (v !== t.getValue()) t.setValue(v);
        s.injection.extraPreamble = v;
        await this.plugin.saveSettings();
        updateCount();
      });
    });

    containerEl.createEl("h2", { text: "Working directories" });
    containerEl.createEl("p", {
      text: "Per-project repository paths. Overridden by repo_path in STATUS.md frontmatter.",
      cls: "setting-item-description",
    });

    const slugs = Object.keys(s.workingDirs).sort();
    for (const slug of slugs) {
      const p = s.workingDirs[slug];
      const row = new Setting(containerEl).setName(slug).setDesc(describeWorkingDir(p));
      row.addText((t) =>
        t.setValue(p).onChange(async (v) => {
          const trimmed = v.trim();
          if (trimmed) s.workingDirs[slug] = trimmed;
          else delete s.workingDirs[slug];
          await this.plugin.saveSettings();
          row.setDesc(describeWorkingDir(trimmed));
        }),
      );
      row.addButton((b) =>
        b.setButtonText("Remove").onClick(async () => {
          delete s.workingDirs[slug];
          await this.plugin.saveSettings();
          this.display();
        }),
      );
    }

    let newSlug = "";
    let newPath = "";
    new Setting(containerEl)
      .setName("Add mapping")
      .addText((t) => t.setPlaceholder("project-slug").onChange((v) => (newSlug = v)))
      .addText((t) => t.setPlaceholder("/absolute/path/to/repo").onChange((v) => (newPath = v)))
      .addButton((b) =>
        b.setButtonText("Add").onClick(async () => {
          const slug = newSlug.trim();
          const p = newPath.trim();
          if (!slug || !p) {
            new Notice("Both slug and path are required");
            return;
          }
          if (!path.isAbsolute(p)) {
            new Notice(`Path must be absolute: ${p}`);
            return;
          }
          if (!existsSync(p)) {
            new Notice(`Path does not exist (saved anyway): ${p}`);
          }
          s.workingDirs[slug] = p;
          await this.plugin.saveSettings();
          this.display();
        }),
      );

    new Setting(containerEl)
      .setName("Bulk edit (JSON)")
      .setDesc("Paste a JSON object of { slug: absolutePath } pairs to replace all mappings.")
      .addTextArea((t) => {
        t.setValue(JSON.stringify(s.workingDirs, null, 2));
        t.inputEl.rows = 6;
        t.inputEl.style.width = "100%";
        t.inputEl.addEventListener("blur", async () => {
          const raw = t.getValue().trim();
          if (!raw) return;
          let parsed: unknown;
          try {
            parsed = JSON.parse(raw);
          } catch (err: any) {
            new Notice(`workingDirs: invalid JSON — ${err?.message ?? err}`);
            return;
          }
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            new Notice(`workingDirs: must be a JSON object of slug → absolute path`);
            return;
          }
          const next: Record<string, string> = {};
          const warnings: string[] = [];
          for (const [slug, v] of Object.entries(parsed as Record<string, unknown>)) {
            if (typeof v !== "string" || !v.trim()) {
              new Notice(`workingDirs[${slug}]: value must be a non-empty string`);
              return;
            }
            const p = v.trim();
            if (!path.isAbsolute(p)) {
              new Notice(`workingDirs[${slug}]: path must be absolute — ${p}`);
              return;
            }
            if (!existsSync(p)) warnings.push(`${slug}: missing ${p}`);
            next[slug] = p;
          }
          s.workingDirs = next;
          await this.plugin.saveSettings();
          if (warnings.length) new Notice(`workingDirs saved. Warnings: ${warnings.join("; ")}`);
          this.display();
        });
      });

    containerEl.createEl("h2", { text: "Terminal" });
    new Setting(containerEl)
      .setName("Terminal app")
      .setDesc(
        "All agents share a single tmux session (`op-agents`), one window per issue (window name = issue id). Agents survive the terminal closing — reattach with `tmux attach -t op-agents`. Re-launching an agent whose window already exists selects that window instead of creating a duplicate. iTerm uses tmux control mode (`tmux -CC`); Terminal.app uses plain tmux.",
      )
      .addDropdown((d) =>
        d
          .addOption("Terminal", "Terminal")
          .addOption("iTerm", "iTerm")
          .setValue(s.terminal)
          .onChange(async (v) => {
            s.terminal = v as "Terminal" | "iTerm";
            await this.plugin.saveSettings();
          }),
      );

    const tmuxStatus = (p: string) =>
      existsSync(p) ? `✓ exists: ${p}` : `⚠ not found: ${p}`;
    const tmuxSetting = new Setting(containerEl)
      .setName("tmux binary")
      .setDesc(
        `Absolute path to the tmux executable. Obsidian's PATH omits /opt/homebrew/bin, so bare \`tmux\` fails on Apple Silicon brew installs. ${tmuxStatus(s.tmuxBinary)}`,
      );
    tmuxSetting.addText((t) =>
      t.setValue(s.tmuxBinary).onChange(async (v) => {
        const trimmed = v.trim();
        if (trimmed) {
          s.tmuxBinary = trimmed;
          await this.plugin.saveSettings();
          tmuxSetting.setDesc(
            `Absolute path to the tmux executable. Obsidian's PATH omits /opt/homebrew/bin, so bare \`tmux\` fails on Apple Silicon brew installs. ${tmuxStatus(trimmed)}`,
          );
        }
      }),
    );
    tmuxSetting.addButton((b) =>
      b.setButtonText("Auto-detect").onClick(async () => {
        const found = detectTmux();
        if (found.path) {
          s.tmuxBinary = found.path;
          await this.plugin.saveSettings();
          new Notice(`op: tmux found at ${found.path}`);
          this.display();
        } else {
          new Notice(`op: tmux not found in any of: ${found.tried.join(", ")}`);
        }
      }),
    );

    new Setting(containerEl)
      .setName("iTerm window placement")
      .setDesc("Where to open the agent when Terminal app is iTerm.")
      .addDropdown((d) =>
        d
          .addOption("new-tab", "New tab in front window")
          .addOption("new-window", "New window")
          .setValue(s.iTermPlacement)
          .onChange(async (v) => {
            s.iTermPlacement = v as ITermPlacement;
            await this.plugin.saveSettings();
          }),
      );

    containerEl.createEl("h2", { text: "iTerm layout orchestrator" });
    containerEl.createEl("p", {
      text: "When enabled, op lays out agent panes in the current iTerm window per the chosen layout. Overflow spills to a new iTerm window backed by a fresh tmux session. macOS + iTerm only.",
      cls: "setting-item-description",
    });

    new Setting(containerEl)
      .setName("Enable orchestrator")
      .setDesc("Route iTerm launches through the layout orchestrator instead of tmux -CC attach.")
      .addToggle((t) =>
        t.setValue(s.orchestrator.enabled).onChange(async (v) => {
          s.orchestrator.enabled = v;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("Default layout")
      .setDesc("Grid shape for new iTerm windows. Determines the per-window agent ceiling.")
      .addDropdown((d) => {
        for (const id of LAYOUT_IDS) d.addOption(id, id);
        d.setValue(s.orchestrator.preferred).onChange(async (v) => {
          s.orchestrator.preferred = v as LayoutId;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Max rows per window")
      .setDesc("1–3. Layouts exceeding this are unavailable.")
      .addText((t) =>
        t.setValue(String(s.orchestrator.maxRows)).onChange(async (v) => {
          const n = parseInt(v, 10);
          if (Number.isFinite(n) && n >= 1 && n <= 3) {
            s.orchestrator.maxRows = n;
            await this.plugin.saveSettings();
          }
        }),
      );

    new Setting(containerEl)
      .setName("Max columns per window")
      .setDesc("1–3. Layouts exceeding this are unavailable.")
      .addText((t) =>
        t.setValue(String(s.orchestrator.maxCols)).onChange(async (v) => {
          const n = parseInt(v, 10);
          if (Number.isFinite(n) && n >= 1 && n <= 3) {
            s.orchestrator.maxCols = n;
            await this.plugin.saveSettings();
          }
        }),
      );

    new Setting(containerEl)
      .setName("Reset pane assignments")
      .setDesc("Forget the issueId → pane mapping. Useful after closing all orchestrated iTerm windows.")
      .addButton((b) =>
        b.setButtonText("Reset").onClick(async () => {
          s.orchestratorState = emptyRegistry();
          await this.plugin.saveSettings();
          new Notice("op: orchestrator state cleared");
        }),
      );

    containerEl.createEl("h2", { text: "Sidebar view" });

    new Setting(containerEl)
      .setName("Default tab")
      .setDesc("Tab shown when the op sidebar opens.")
      .addDropdown((d) =>
        d
          .addOption("issues", "Issues")
          .addOption("in-flight", "In flight")
          .addOption("resolved", "Recently resolved")
          .setValue(s.view.defaultTab)
          .onChange(async (v) => {
            s.view.defaultTab = v as SidebarTab;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Recently resolved limit")
      .setDesc("Max issues shown in the Recently resolved tab.")
      .addText((t) =>
        t.setValue(String(s.view.recentResolvedLimit)).onChange(async (v) => {
          const n = parseInt(v, 10);
          if (Number.isFinite(n) && n > 0) {
            s.view.recentResolvedLimit = n;
            await this.plugin.saveSettings();
          }
        }),
      );

    new Setting(containerEl)
      .setName("Open on startup")
      .setDesc("Reveal the op sidebar automatically when Obsidian starts.")
      .addToggle((t) =>
        t.setValue(s.view.openOnStartup).onChange(async (v) => {
          s.view.openOnStartup = v;
          await this.plugin.saveSettings();
        }),
      );

    containerEl.createEl("h2", { text: "GitHub integration" });
    containerEl.createEl("p", {
      text: "Requires the `gh` CLI installed and authenticated. `gh` is run in the project's repo (repo_path in STATUS.md or the working-dir setting above).",
      cls: "setting-item-description",
    });

    new Setting(containerEl)
      .setName("Auto-create GitHub issue on new op issue")
      .setDesc("When creating an op issue, if no GitHub URL is provided, run `gh issue create` and link the returned URL.")
      .addToggle((t) =>
        t.setValue(s.github.autoCreateGithubIssue).onChange(async (v) => {
          s.github.autoCreateGithubIssue = v;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("Close linked GitHub issue on resolve")
      .setDesc("When resolving an op issue with a github_issue: URL, run `gh issue close` on it.")
      .addToggle((t) =>
        t.setValue(s.github.closeGithubIssueOnResolve).onChange(async (v) => {
          s.github.closeGithubIssueOnResolve = v;
          await this.plugin.saveSettings();
        }),
      );

    containerEl.createEl("h2", { text: "Agent worktree enforcement" });
    containerEl.createEl("p", {
      text: "When enabled, installs a PreToolUse hook (Claude Code + Gemini CLI) that blocks Edit/Write/MultiEdit/NotebookEdit on the main checkout for op-launched agent sessions. The agent must either `git worktree add` or export OP_ALLOW_MAIN_EDIT=1 for the edit. Copilot CLI has no pre-tool gate — the guard is skipped there. Changes take effect on the next agent session.",
      cls: "setting-item-description",
    });

    new Setting(containerEl)
      .setName("Enforce worktree for delegated agents")
      .setDesc("Block edits on the main checkout for op-launched sessions. Opt-in until observed clean.")
      .addToggle((t) =>
        t.setValue(s.agents.enforceWorktree).onChange(async (v) => {
          s.agents.enforceWorktree = v;
          await this.plugin.saveSettings();
          await this.plugin.reinstallAgentHooks();
        }),
      );
  }
}

function describeWorkingDir(p: string): string {
  if (!p) return "(empty)";
  if (!path.isAbsolute(p)) return `⚠ not an absolute path`;
  if (!existsSync(p)) return `⚠ path does not exist`;
  return `✓ ${p}`;
}

function detectionSummary(plugin: OpPlugin): string {
  const d = plugin.detector.get();
  if (!d) return "Not probed yet. Click Re-probe to run detection.";
  return AGENT_IDS.map((id) => `${id}: ${d[id].installed ? d[id].path ?? "found" : "not found"}`).join(" · ");
}
