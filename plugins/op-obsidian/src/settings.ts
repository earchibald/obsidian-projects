import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import type OpPlugin from "./main";
import { AGENT_IDS, type AgentId, type ProfileOverlay } from "./agentProfiles";
import type { ITermPlacement } from "./terminalLaunch";

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

    containerEl.createEl("h2", { text: "Agents" });

    new Setting(containerEl)
      .setName("Default agent")
      .setDesc("Agent launched by op: open agent for issue unless overridden at runtime.")
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
      text: "Overlays merge on top of the built-in profile. Keys: binary, launchFlags (string[]), promptPreamble, skillTrigger, label.",
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
            try {
              const parsed = JSON.parse(raw) as ProfileOverlay;
              s.agentOverlays[id] = parsed;
              await this.plugin.saveSettings();
            } catch (err: any) {
              new Notice(`${id} overlay: invalid JSON — ${err?.message ?? err}`);
            }
          });
        });
    }

    containerEl.createEl("h2", { text: "Injection" });

    new Setting(containerEl)
      .setName("Inject issue body")
      .addToggle((t) =>
        t.setValue(s.injection.injectBody).onChange(async (v) => {
          s.injection.injectBody = v;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("Max body characters")
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
      .addToggle((t) =>
        t.setValue(s.injection.includeTasksList).onChange(async (v) => {
          s.injection.includeTasksList = v;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("Recent commits to include")
      .addText((t) =>
        t.setValue(String(s.injection.includeRecentCommits)).onChange(async (v) => {
          const n = parseInt(v, 10);
          if (Number.isFinite(n) && n >= 0) {
            s.injection.includeRecentCommits = n;
            await this.plugin.saveSettings();
          }
        }),
      );

    new Setting(containerEl)
      .setName("Extra preamble")
      .setDesc("Prepended verbatim to every launched prompt.")
      .addTextArea((t) => {
        t.setValue(s.injection.extraPreamble);
        t.inputEl.rows = 3;
        t.inputEl.style.width = "100%";
        t.inputEl.addEventListener("blur", async () => {
          s.injection.extraPreamble = t.getValue();
          await this.plugin.saveSettings();
        });
      });

    containerEl.createEl("h2", { text: "Working directories" });
    containerEl.createEl("p", {
      text: "Per-project repository paths. Overridden by repo_path in STATUS.md frontmatter.",
      cls: "setting-item-description",
    });

    const slugs = Object.keys(s.workingDirs).sort();
    for (const slug of slugs) {
      new Setting(containerEl)
        .setName(slug)
        .addText((t) =>
          t.setValue(s.workingDirs[slug]).onChange(async (v) => {
            if (v.trim()) s.workingDirs[slug] = v.trim();
            else delete s.workingDirs[slug];
            await this.plugin.saveSettings();
          }),
        )
        .addButton((b) =>
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
      .addText((t) => t.setPlaceholder("/path/to/repo").onChange((v) => (newPath = v)))
      .addButton((b) =>
        b.setButtonText("Add").onClick(async () => {
          if (!newSlug.trim() || !newPath.trim()) {
            new Notice("Both slug and path are required");
            return;
          }
          s.workingDirs[newSlug.trim()] = newPath.trim();
          await this.plugin.saveSettings();
          this.display();
        }),
      );

    containerEl.createEl("h2", { text: "Terminal" });
    new Setting(containerEl)
      .setName("Terminal app")
      .setDesc(
        "Agents are wrapped in a named tmux session (op-<issueId>) so they survive the terminal closing and can be reattached with `tmux attach -t <session>`. iTerm uses tmux control mode (`tmux -CC`); Terminal.app uses plain tmux.",
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

    new Setting(containerEl)
      .setName("tmux binary")
      .setDesc(
        "Absolute path to the tmux executable. Obsidian's PATH omits /opt/homebrew/bin, so bare `tmux` fails on Apple Silicon brew installs — prefer /opt/homebrew/bin/tmux or /usr/local/bin/tmux.",
      )
      .addText((t) =>
        t.setValue(s.tmuxBinary).onChange(async (v) => {
          const trimmed = v.trim();
          if (trimmed) {
            s.tmuxBinary = trimmed;
            await this.plugin.saveSettings();
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
  }
}

function detectionSummary(plugin: OpPlugin): string {
  const d = plugin.detector.get();
  if (!d) return "Not probed yet. Click Re-probe to run detection.";
  return AGENT_IDS.map((id) => `${id}: ${d[id].installed ? d[id].path ?? "found" : "not found"}`).join(" · ");
}
