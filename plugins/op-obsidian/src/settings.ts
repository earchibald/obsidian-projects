import { App, Modal, PluginSettingTab, Setting } from "obsidian";
import { notify } from "./notificationLog";
import {
  applyPreset,
  defaultPreset,
  revertPreset,
  type ApplyResult,
  type Hotkey,
  type HotkeyEntry,
  type SkippedBinding,
} from "./hotkeyPreset";
import { existsSync } from "fs";
import * as path from "path";
import type OpPlugin from "./main";
import { applyProjectOrder, listProjects } from "./projects";
import { AGENT_IDS, type AgentId } from "./agentProfiles";
import type { ITermPlacement } from "./terminalLaunch";
import { LAYOUT_IDS, type LayoutId } from "./layout/layouts";
import { emptyRegistry } from "./layout/registry";
import { validateOverlay } from "./overlayValidate";
import { detectTmux } from "./tmuxDetect";
import { userError } from "./userError";
import { execFileSync } from "child_process";
import {
  EXTRA_PREAMBLE_MAX,
  type SidebarTab,
  type SidebarDensity,
  type OpSettings,
  DEFAULT_SETTINGS,
  mergeSettings,
} from "./settingsPure";

export {
  EXTRA_PREAMBLE_MAX,
  DEFAULT_SETTINGS,
  mergeSettings,
};
export type {
  InjectionSettings,
  SidebarTab,
  SidebarDensity,
  ViewSettings,
  GithubSettings,
  AgentsSettings,
  DeveloperSettings,
  FlowSettings,
  OpSettings,
} from "./settingsPure";

export class OpSettingsTab extends PluginSettingTab {
  constructor(app: App, private plugin: OpPlugin) {
    super(app, plugin);
  }

  private renderProjectOrder(containerEl: HTMLElement): void {
    const s = this.plugin.settings;
    const projects = applyProjectOrder(listProjects(this.app), s.projectOrder);

    if (projects.length === 0) {
      containerEl.createEl("p", {
        text: "No projects discovered yet. Scaffold one with /op:scaffold.",
        cls: "op-project-order__empty",
      });
      return;
    }

    const list = containerEl.createEl("ul", { cls: "op-project-order__list" });
    let dragSlug: string | null = null;

    const persistFromDom = async (): Promise<void> => {
      const next: string[] = [];
      list.querySelectorAll<HTMLLIElement>(".op-project-order__item").forEach((li) => {
        const slug = li.dataset.slug;
        if (slug) next.push(slug);
      });
      // Preserve any slugs the user has ordered for projects that aren't
      // currently discovered (e.g. STATUS.md temporarily missing) so a
      // transient absence doesn't wipe their curated position.
      const visible = new Set(next);
      for (const slug of s.projectOrder) {
        if (!visible.has(slug)) next.push(slug);
      }
      s.projectOrder = next;
      await this.plugin.saveSettings();
    };

    const clearDropAffordance = (): void => {
      list.querySelectorAll(".is-drop-before, .is-drop-after").forEach((el) => {
        el.classList.remove("is-drop-before", "is-drop-after");
      });
    };

    for (const p of projects) {
      const li = list.createEl("li", { cls: "op-project-order__item" });
      li.dataset.slug = p.slug;
      li.draggable = true;
      li.createEl("span", { cls: "op-project-order__handle", text: "⋮⋮" });
      li.createEl("span", { cls: "op-project-order__slug", text: p.slug });
      if (p.prefix) {
        li.createEl("span", { cls: "op-project-order__prefix", text: p.prefix });
      }

      li.addEventListener("dragstart", (ev) => {
        dragSlug = p.slug;
        li.classList.add("is-dragging");
        if (ev.dataTransfer) {
          ev.dataTransfer.effectAllowed = "move";
          ev.dataTransfer.setData("text/plain", p.slug);
        }
      });
      li.addEventListener("dragend", () => {
        dragSlug = null;
        li.classList.remove("is-dragging");
        clearDropAffordance();
      });
      li.addEventListener("dragover", (ev) => {
        if (!dragSlug || dragSlug === p.slug) return;
        ev.preventDefault();
        if (ev.dataTransfer) ev.dataTransfer.dropEffect = "move";
        const rect = li.getBoundingClientRect();
        const before = ev.clientY < rect.top + rect.height / 2;
        clearDropAffordance();
        li.classList.add(before ? "is-drop-before" : "is-drop-after");
      });
      li.addEventListener("dragleave", () => {
        li.classList.remove("is-drop-before", "is-drop-after");
      });
      li.addEventListener("drop", async (ev) => {
        ev.preventDefault();
        if (!dragSlug || dragSlug === p.slug) {
          clearDropAffordance();
          return;
        }
        const src = list.querySelector<HTMLLIElement>(
          `.op-project-order__item[data-slug="${CSS.escape(dragSlug)}"]`,
        );
        if (!src) {
          clearDropAffordance();
          return;
        }
        const rect = li.getBoundingClientRect();
        const before = ev.clientY < rect.top + rect.height / 2;
        if (before) list.insertBefore(src, li);
        else list.insertBefore(src, li.nextSibling);
        clearDropAffordance();
        await persistFromDom();
      });
    }

    new Setting(containerEl)
      .setName("Reset to alphabetical")
      .setDesc("Clears your custom order so projects sort alphabetically again.")
      .addButton((b) =>
        b.setButtonText("Reset").onClick(async () => {
          s.projectOrder = [];
          await this.plugin.saveSettings();
          this.display();
        }),
      );
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
          notify("op: agent detection refreshed");
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
              userError(
                `${id} overlay: invalid JSON — ${err?.message ?? err}`,
                "Fix the JSON in the textarea and click away to retry; the overlay was not saved.",
              );
              return;
            }
            const result = validateOverlay(parsed);
            if (!result.ok || !result.overlay) {
              userError(
                `${id} overlay: ${result.errors.join("; ")}`,
                "Allowed keys: binary, launchFlags (string[]), promptPreamble, skillTrigger, label.",
              );
              return;
            }
            if (result.warnings.length) {
              userError(
                `${id} overlay saved with warnings: ${result.warnings.join("; ")}`,
                "Unknown keys were dropped. Double-check the key names in the description above.",
              );
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

    new Setting(containerEl)
      .setName("Include project workflow")
      .setDesc(
        "When the issue's project has a Projects/<slug>/WORKFLOW.md, inline its content (capped below) into the kickoff prompt so the agent sees the project's SDLC policy.",
      )
      .addToggle((t) =>
        t.setValue(s.injection.includeWorkflow).onChange(async (v) => {
          s.injection.includeWorkflow = v;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("Workflow inline cap (chars)")
      .setDesc(
        "If WORKFLOW.md exceeds this size, the prompt surfaces only the path with a 'read this first' hint instead of inlining. 0 disables inlining (path-only).",
      )
      .addText((t) =>
        t.setValue(String(s.injection.maxWorkflowChars)).onChange(async (v) => {
          const n = parseInt(v, 10);
          if (Number.isFinite(n) && n >= 0) {
            s.injection.maxWorkflowChars = n;
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
            notify("Both slug and path are required");
            return;
          }
          if (!path.isAbsolute(p)) {
            notify(`Path must be absolute: ${p}`);
            return;
          }
          if (!existsSync(p)) {
            notify(`Path does not exist (saved anyway): ${p}`);
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
            notify(`workingDirs: invalid JSON — ${err?.message ?? err}`);
            return;
          }
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            notify(`workingDirs: must be a JSON object of slug → absolute path`);
            return;
          }
          const next: Record<string, string> = {};
          const warnings: string[] = [];
          for (const [slug, v] of Object.entries(parsed as Record<string, unknown>)) {
            if (typeof v !== "string" || !v.trim()) {
              notify(`workingDirs[${slug}]: value must be a non-empty string`);
              return;
            }
            const p = v.trim();
            if (!path.isAbsolute(p)) {
              notify(`workingDirs[${slug}]: path must be absolute — ${p}`);
              return;
            }
            if (!existsSync(p)) warnings.push(`${slug}: missing ${p}`);
            next[slug] = p;
          }
          s.workingDirs = next;
          await this.plugin.saveSettings();
          if (warnings.length) notify(`workingDirs saved. Warnings: ${warnings.join("; ")}`);
          this.display();
        });
      });

    containerEl.createEl("h2", { text: "Project order" });
    containerEl.createEl("p", {
      text: "Drag to reorder how projects appear in command pickers (e.g. “op: New issue”). Newly-discovered projects sort alphabetically below the curated list. Reset to alphabetical clears your custom order.",
      cls: "setting-item-description",
    });
    this.renderProjectOrder(containerEl);

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
      b.setButtonText("Test").onClick(() => {
        const p = s.tmuxBinary;
        if (!p) {
          userError("op: no tmux binary configured", "Enter an absolute path, or click Auto-detect.");
          return;
        }
        if (!existsSync(p)) {
          userError(
            `op: tmux binary not found at ${p}`,
            "Check the path, install tmux (e.g. `brew install tmux`), or click Auto-detect.",
          );
          return;
        }
        try {
          const out = execFileSync(p, ["-V"], { encoding: "utf8", timeout: 3000 }).trim();
          notify(`op: tmux OK — ${out}`, 6000);
        } catch (err: any) {
          userError(
            `op: tmux at ${p} failed to run — ${err?.message ?? err}`,
            "The file exists but doesn't execute. Verify permissions or re-install tmux.",
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
          notify(`op: tmux found at ${found.path}`);
          this.display();
        } else {
          notify(`op: tmux not found in any of: ${found.tried.join(", ")}`);
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
          notify("op: orchestrator state cleared");
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

    new Setting(containerEl)
      .setName("Sidebar density")
      .setDesc(
        "Compact tightens vertical row padding by 4px and hides the project chip when only one project is rendered. Comfortable matches the historical default.",
      )
      .addDropdown((d) =>
        d
          .addOption("comfortable", "Comfortable")
          .addOption("compact", "Compact")
          .setValue(s.view.density)
          .onChange(async (v) => {
            s.view.density = v as SidebarDensity;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Agent hover preview")
      .setDesc(
        "When hovering an agent badge in the sidebar, show the last N lines of the agent's tmux pane in a small popover.",
      )
      .addToggle((t) =>
        t.setValue(s.view.agentHoverPreview).onChange(async (v) => {
          s.view.agentHoverPreview = v;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("Agent hover preview lines")
      .setDesc("How many lines of the tmux pane to capture for the hover preview (1–500).")
      .addText((t) =>
        t.setValue(String(s.view.agentHoverLines)).onChange(async (v) => {
          const n = parseInt(v, 10);
          if (Number.isFinite(n) && n >= 1 && n <= 500) {
            s.view.agentHoverLines = n;
            await this.plugin.saveSettings();
          }
        }),
      );

    new Setting(containerEl)
      .setName("Agent hover preview delay (ms)")
      .setDesc("Delay before the popover opens on hover (0–2000 ms).")
      .addText((t) =>
        t.setValue(String(s.view.agentHoverDelayMs)).onChange(async (v) => {
          const n = parseInt(v, 10);
          if (Number.isFinite(n) && n >= 0 && n <= 2000) {
            s.view.agentHoverDelayMs = n;
            await this.plugin.saveSettings();
          }
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

    containerEl.createEl("h2", { text: "Flow chaining" });
    containerEl.createEl("p", {
      text: "Drives automatic stage-to-stage progression: evaluate → planning|implementation, planning → implementation, implementation → review, review → finalization. The SessionEnd hook fires when an agent exits cleanly; if Auto-advance is on, op writes the next `flow:` value to the issue note and launches the next agent. Otherwise the new flow stays pinned and the user resumes manually via `op-launch-next-stage`.",
      cls: "setting-item-description",
    });

    new Setting(containerEl)
      .setName("Auto-advance flow on SessionEnd")
      .setDesc("When an agent exits cleanly, automatically launch the next stage per the flow transition matrix. Off by default — the new `flow:` value is still set, but the user runs `op-launch-next-stage` to relaunch.")
      .addToggle((t) =>
        t.setValue(s.flow.autoAdvance).onChange(async (v) => {
          s.flow.autoAdvance = v;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("Allow finalize agent to merge PR")
      .setDesc("Read by the finalize-mode preamble. When off, the agent stops before `gh pr merge` and asks for human confirmation. When on, the agent may merge directly. Off by default — destructive op gated behind explicit opt-in.")
      .addToggle((t) =>
        t.setValue(s.flow.autoMerge).onChange(async (v) => {
          s.flow.autoMerge = v;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("Headless agent timeout (ms)")
      .setDesc("Timeout applied to flow-driven `claude -p` invocations (e.g. evaluator). Default 600000 (10 minutes).")
      .addText((t) =>
        t.setValue(String(s.flow.headlessTimeoutMs)).onChange(async (v) => {
          const n = parseInt(v, 10);
          if (Number.isFinite(n) && n > 0) {
            s.flow.headlessTimeoutMs = n;
            await this.plugin.saveSettings();
          }
        }),
      );

    containerEl.createEl("h2", { text: "Hotkey preset" });
    containerEl.createEl("p", {
      text:
        "One-click install of the op default keyboard shortcuts. Best-effort: any binding whose key is already taken by another command is skipped, and the results modal lists what landed and what didn't. Click Apply to mutate; nothing happens automatically.",
      cls: "setting-item-description",
    });

    new Setting(containerEl)
      .setName("Apply op default hotkey preset")
      .setDesc(
        "Binds the 10 op commands to ⌘⇧* / ⌘⌥* shortcuts. Reversible from the results modal during this session.",
      )
      .addButton((b) =>
        b
          .setButtonText("Apply preset")
          .setCta()
          .onClick(() => {
            const preset = defaultPreset();
            const result = applyPreset(this.app, preset);
            new HotkeyPresetResultsModal(this.app, preset, result).open();
          }),
      );

    containerEl.createEl("h2", { text: "Advanced" });

    new Setting(containerEl)
      .setName("Show developer commands in palette")
      .setDesc(
        "Show op-dev:* debugging commands (dump-store, rebuild-store, install-agent-hooks, debug agent launch) in the command palette. Reload the plugin after changing — Obsidian only registers commands at plugin load.",
      )
      .addToggle((t) =>
        t.setValue(s.developer.showDevCommands).onChange(async (v) => {
          s.developer.showDevCommands = v;
          await this.plugin.saveSettings();
          notify("Reload the plugin to apply — Settings → Community plugins → op-obsidian → toggle off then on.", 8000);
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

function formatHotkey(h: Hotkey): string {
  const order = ["Mod", "Meta", "Ctrl", "Alt", "Shift"];
  const mods = [...h.modifiers].sort(
    (a, b) => order.indexOf(a) - order.indexOf(b),
  );
  const glyphs: Record<string, string> = {
    Mod: "⌘",
    Meta: "⌘",
    Ctrl: "⌃",
    Alt: "⌥",
    Shift: "⇧",
  };
  const keyGlyph = h.key === "Enter" ? "↵" : h.key;
  return mods.map((m) => glyphs[m] ?? m).join("") + keyGlyph;
}

/**
 * Results modal for the "Apply op default hotkey preset" button. Lists what
 * landed and what was skipped; offers a Revert button (session-scoped, restores
 * the snapshot captured before the apply) and an Open Hotkeys settings shortcut
 * so the user can manually rebind anything skipped. On the JSON-snippet
 * fallback path, surfaces the snippet in a textarea instead.
 */
export class HotkeyPresetResultsModal extends Modal {
  constructor(
    app: App,
    private preset: HotkeyEntry[],
    private result: ApplyResult,
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();

    if (!this.result.ok) {
      this.renderFallback(contentEl, this.result.reason, this.result.snippet);
      return;
    }

    const { applied, skipped, previousCustomKeys } = this.result;

    contentEl.createEl("h2", { text: "op hotkey preset applied" });
    contentEl.createEl("p", {
      text: `${applied.length} binding${applied.length === 1 ? "" : "s"} landed${
        skipped.length ? `, ${skipped.length} skipped due to conflicts` : ""
      }.`,
      cls: "setting-item-description",
    });

    if (applied.length > 0) {
      contentEl.createEl("h3", { text: "Applied" });
      const list = contentEl.createDiv({ cls: "op-hotkey-preset__results" });
      for (const e of applied) {
        const row = list.createDiv({ cls: "op-hotkey-preset__row" });
        row.createSpan({ cls: "op-hotkey-preset__keys", text: formatHotkey(e.hotkey) });
        row.createSpan({ cls: "op-hotkey-preset__cmd", text: e.command });
      }
    }

    if (skipped.length > 0) {
      contentEl.createEl("h3", { text: "Skipped (key already bound)" });
      const list = contentEl.createDiv({ cls: "op-hotkey-preset__results" });
      for (const s of skipped) {
        const row = list.createDiv({ cls: "op-hotkey-preset__row" });
        row.createSpan({
          cls: "op-hotkey-preset__keys",
          text: formatHotkey(s.binding.hotkey),
        });
        row.createSpan({ cls: "op-hotkey-preset__cmd", text: s.binding.command });
        row.createSpan({
          cls: "op-hotkey-preset__skip-reason",
          text: `→ taken by ${s.conflictingCommandName}`,
        });
      }
    }

    new Setting(contentEl)
      .addButton((b) =>
        b
          .setButtonText("Open Hotkeys settings")
          .onClick(() => {
            this.close();
            const setting = (this.app as any).setting;
            setting?.open?.();
            setting?.openTabById?.("hotkeys");
          }),
      )
      .addButton((b) =>
        b
          .setButtonText("Revert")
          .setWarning()
          .onClick(() => {
            const r = revertPreset(this.app, previousCustomKeys);
            if (r.ok) {
              notify("op: hotkey preset reverted");
              this.close();
            } else {
              notify(`op: revert failed — ${r.reason}`);
            }
          }),
      )
      .addButton((b) => b.setButtonText("Close").setCta().onClick(() => this.close()));
  }

  private renderFallback(
    el: HTMLElement,
    reason: string,
    snippet: string,
  ): void {
    el.createEl("h2", { text: "op hotkey preset — degraded mode" });
    el.createEl("p", {
      cls: "setting-item-description",
      text:
        `Could not write hotkeys directly: ${reason}. Paste the JSON below into your vault's .obsidian/hotkeys.json (merge with any existing entries) and reload Obsidian.`,
    });
    const ta = el.createEl("textarea", { cls: "op-hotkey-preset__snippet" });
    ta.value = snippet;
    ta.readOnly = true;
    new Setting(el)
      .addButton((b) =>
        b
          .setButtonText("Copy to clipboard")
          .setCta()
          .onClick(async () => {
            try {
              await navigator.clipboard.writeText(snippet);
              notify("op: snippet copied");
            } catch (err: any) {
              notify(`op: copy failed — ${err?.message ?? err}`);
            }
          }),
      )
      .addButton((b) =>
        b
          .setButtonText("Open Hotkeys settings")
          .onClick(() => {
            this.close();
            const setting = (this.app as any).setting;
            setting?.open?.();
            setting?.openTabById?.("hotkeys");
          }),
      )
      .addButton((b) => b.setButtonText("Close").onClick(() => this.close()));
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

function detectionSummary(plugin: OpPlugin): string {
  const d = plugin.detector.get();
  if (!d) return "Not probed yet. Click Re-probe to run detection.";
  return AGENT_IDS.map((id) => `${id}: ${d[id].installed ? d[id].path ?? "found" : "not found"}`).join(" · ");
}
