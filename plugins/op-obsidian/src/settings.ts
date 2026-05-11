import {
  App,
  Modal,
  PluginSettingTab,
  Setting,
  prepareFuzzySearch,
} from "obsidian";
import { notify } from "./notificationLog";
import { loadModules, type WorkflowModule } from "./workflowModule";
import { PLUGIN_VAR_REGISTRY } from "./pluginVarRegistry";
import {
  diagnosticToBlock,
  formatDiagnostic,
  type FormattedDiagnostic,
} from "./workflowDiagnosticFormat";
import type { WorkflowDiagnostic } from "./workflowDiagnostic";
import { EXAMPLE_MODULES, installExampleLibrary } from "./workflowExamples";
import { PreviewWorkflowModal } from "./previewWorkflowModal";
import {
  docUrl,
  hasSectionDocLink,
  sectionDocAnchor,
  type DocLinkSectionId,
} from "./docLinks";
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
import * as os from "os";
import * as path from "path";
import type OpPlugin from "./main";
import {
  buildAutoLaunchPaths,
  buildDashboardUrl,
  type DashboardTarget as DashboardTargetType,
} from "./dashboardOpen";
import {
  installDaemon as installDashboardDaemon,
  pluginDataJsonPath as dashboardPluginDataJsonPath,
  vaultBasePathFromApp as dashboardVaultBasePathFromApp,
  installDashboardDependencies,
} from "./dashboardSetupModal";
import {
  formatUptime,
  getDashboardLogPath,
  probeDaemonStatus,
  readDashboardToken,
  revealDashboardLog,
  type DaemonStatus,
} from "./dashboardInstall";
import { BUNDLED_DASHBOARD_ASSETS } from "./dashboardBundledAssets";
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
  currentProjectsRoot,
  globalModulesDirPath,
  onboardingReadmePath,
  validateProjectsRootInput,
} from "./projectPaths";
import {
  EXTRA_PREAMBLE_MAX,
  CLAUDE_SESSION_COLORS,
  type SidebarTab,
  type SidebarDensity,
  type OpSettings,
  type WorkflowMode,
  DASHBOARD_PORT_MAX,
  DASHBOARD_PORT_MIN,
  DEFAULT_SETTINGS,
  mergeSettings,
  matchSettingRow,
  sanitizeSessionDecorationPalette,
  validateDashboardPortInput,
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
  SessionDecorationSettings,
  DashboardSettings,
  DashboardTarget,
  OpSettings,
  WorkflowMode,
} from "./settingsPure";

/**
 * OP-164: Two-tier settings layout (Daily / Advanced) with fuzzy search,
 * per-section JS-driven collapsibles, and targeted re-renders. The settings
 * file is decomposed into one renderSection*(containerEl) method per H2 so
 * mutating a single setting only repaints its own subtree.
 */
type SectionId =
  // Daily
  | "agent"
  | "terminalApp"
  | "sidebarTab"
  | "onboarding"
  | "hotkeyPreset"
  // Workflows (top-level, between Daily and Advanced — OP-201)
  | "workflows"
  // Advanced
  | "injection"
  | "workingDirs"
  | "orchestrator"
  | "profileOverlays"
  | "sessionDecoration"
  | "worktreeEnforcement"
  | "flowChaining"
  | "github"
  | "dashboard"
  | "vaultGit"
  | "developer";

/** Subset of SectionId covering only the collapsible Advanced subsections. */
type AdvancedSectionId = (typeof ADVANCED_SECTIONS)[number]["id"];

const ADVANCED_SECTIONS: ReadonlyArray<{
  id: SectionId;
  title: string;
  blurb: string;
}> = [
  {
    id: "injection",
    title: "Injection",
    blurb:
      "Controls what context the launched agent sees: issue body, linked TASKS, recent commits, project WORKFLOW.md, and a freeform preamble.",
  },
  {
    id: "workingDirs",
    title: "Working directories & project order",
    blurb:
      "Per-project repo paths used when launching agents (overridden by repo_path: in STATUS.md), and the order projects appear in pickers.",
  },
  {
    id: "orchestrator",
    title: "iTerm layout orchestrator",
    blurb:
      "Optional layout engine that tiles agent panes into a grid inside the current iTerm window. Off by default. macOS + iTerm only.",
  },
  {
    id: "profileOverlays",
    title: "Profile overlays (JSON per agent)",
    blurb:
      "JSON patches merged on top of the built-in agent profile. Includes post-launch command templates for agents that support session decoration.",
  },
  {
    id: "sessionDecoration",
    title: "Session decoration",
    blurb:
      "Auto-color and auto-rename Claude sessions after launch, with optional /remote-control and a configurable Claude color palette.",
  },
  {
    id: "worktreeEnforcement",
    title: "Agent worktree enforcement",
    blurb:
      "Opt-in PreToolUse hook that blocks Edit/Write on the main checkout for op-launched sessions. Verified on Claude Code; the Gemini install path is best-effort and untested. Copilot CLI has no PreToolUse surface, so this guard does not apply to Copilot sessions.",
  },
  {
    id: "flowChaining",
    title: "Flow chaining",
    blurb:
      "Drives stage-to-stage progression: evaluate → planning → implementation → review → finalize. Off by default — opt in to auto-advance.",
  },
  {
    id: "github",
    title: "GitHub integration",
    blurb:
      "Auto-create a GitHub issue on op-new and auto-close it on op-resolve. Requires the gh CLI installed and authenticated.",
  },
  {
    id: "dashboard",
    title: "Dashboard",
    blurb:
      "Localhost iTerm2 browser-tab dashboard for live observation and steering of launched agents. Configures the OP-230 daemon (port + open-in target) and exposes Install / Restart / Logs / Regenerate-token controls.",
  },
  {
    id: "vaultGit",
    title: "Vault git (opt-in)",
    blurb:
      "Optional: auto-commit every successful op-* mutation to the vault's git repo, so each plugin call lands as one commit. Off by default — pairs with the always-on JSONL audit log at Projects/_scratch/op-audit.jsonl.",
  },
  {
    id: "developer",
    title: "Developer commands",
    blurb:
      "Surfaces op-dev:* debugging commands (dump-store, rebuild-store, install-agent-hooks, debug agent launch) in the command palette.",
  },
];

export class OpSettingsTab extends PluginSettingTab {
  /**
   * Map of SectionId → the wrapper element that renderSection*(el) populates.
   * rerenderSection(id) empties the wrapper and re-runs the render fn so a
   * mutation only repaints its own subtree, never the whole 700px tab.
   */
  private sectionEls = new Map<SectionId, HTMLElement>();

  /** Live fuzzy-search query (trimmed in matchSettingRow). */
  private filterQuery = "";

  /** Debounce timers for inline validators (overlay textareas, tmux path). */
  private debounceTimers = new Map<string, number>();

  /**
   * In-flight drag flag for the project-order list. While true, the
   * Working-directories collapsible refuses to collapse mid-drag (collapsing
   * would zero out drag-target getBoundingClientRect()s — the original
   * drag-inside-details bug OP-164 calls out).
   */
  private dragInFlight = false;

  /**
   * OP-235 review fix #1+#2: scoped to renderDashboard()'s lifetime so its
   * fire-and-forget probe promises don't paint the badge after the section
   * has been re-rendered or the tab has been closed. Aborted on each fresh
   * renderDashboard call and on hide(); callbacks check `signal.aborted`
   * before mutating DOM so racing probes drop their results.
   */
  private dashboardAbort: AbortController | null = null;

  constructor(app: App, private plugin: OpPlugin) {
    super(app, plugin);
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────

  display(): void {
    const { containerEl } = this;
    // OP-235 review fix #1: cancel any in-flight dashboard probes from a
    // prior display() so their callbacks don't paint into the about-to-be-
    // emptied container.
    this.dashboardAbort?.abort();
    this.dashboardAbort = null;
    containerEl.empty();
    containerEl.addClass("op-settings");
    this.sectionEls.clear();

    this.renderSearch(containerEl);

    // Daily — top-level, no group header (the Daily settings are themselves
    // headerless rows so the most-used controls land above the fold).
    const daily = containerEl.createDiv({ cls: "op-settings__group op-settings__group--daily" });
    daily.createEl("h2", { text: "Daily" });
    this.mountSection(daily, "agent", (el) => this.renderDailyAgent(el));
    this.mountSection(daily, "terminalApp", (el) => this.renderDailyTerminal(el));
    this.mountSection(daily, "sidebarTab", (el) => this.renderDailySidebar(el));
    this.mountSection(daily, "onboarding", (el) => this.renderDailyOnboarding(el));
    this.mountSection(daily, "hotkeyPreset", (el) => this.renderDailyHotkey(el));

    // Workflows — top-level group BETWEEN Daily and Advanced (OP-201). It's
    // its own group (not a 9th Advanced collapsible) because it surfaces the
    // workflow-modules tree, per-module diagnostics, the Available variables
    // reference panel, and an empty-state install button — too important and
    // too referenced to bury.
    const workflows = containerEl.createDiv({
      cls: "op-settings__group op-settings__group--workflows",
    });
    workflows.dataset.opSection = "workflows";
    const workflowsHeading = workflows.createDiv({ cls: "op-settings__heading-row" });
    workflowsHeading.createEl("h2", { text: "Workflows" });
    addDocLink(workflowsHeading, "workflows");
    workflows.createEl("p", {
      cls: "setting-item-description op-settings__group-blurb",
      text:
        "Workflow modules compose the prompt the launched agent sees. Loaded modules appear here with their diagnostics; the Available variables panel lists tokens you can reference in module bodies via {{name}}.",
    });
    this.mountSection(workflows, "workflows", (el) => this.renderWorkflows(el));

    // Advanced — single H2 with each subsection in its own collapsible
    // (collapsed by default). Drag-safe: the collapsibles use JS-controlled
    // display:none/block, NOT native <details>, so getBoundingClientRect()
    // still returns real numbers when the body is hidden the moment the user
    // expands it (we don't compute rects until visible anyway, but the
    // primitive's contract is to never zero-out child rects).
    containerEl.createEl("h2", { text: "Advanced" });
    containerEl.createEl("p", {
      cls: "setting-item-description op-settings__advanced-blurb",
      text:
        "Less-common controls. Each subsection collapses independently; expand only the ones you need.",
    });
    const advanced = containerEl.createDiv({ cls: "op-settings__group op-settings__group--advanced" });
    for (const section of ADVANCED_SECTIONS) {
      const collapsible = new OpCollapsible(advanced, section.title, {
        startOpen: false,
        canCollapse: () => !this.dragInFlight,
      });
      // "What is this?" expandable directly under the H2 — short blurb that
      // de-densifies setDesc strings without losing the glossary context.
      addHelpExpandable(collapsible.body, "What is this?", section.blurb);
      // OP-215: in-product help link for sections registered in
      // `docLinks.ts`. Derived via `hasSectionDocLink` so only
      // `docLinks.ts` needs updating when a new section gets a doc target.
      if (hasSectionDocLink(section.id)) {
        addDocLink(collapsible.header, section.id);
      }
      this.mountSection(collapsible.body, section.id, (el) => this.renderAdvancedSection(section.id, el));
      // Tag the wrapper for the smoke-test recipe (CLAUDE.md): tests can
      // querySelector('[data-op-section="workingDirs"]') and click the
      // header to expand before counting drag rows.
      collapsible.root.dataset.opSection = section.id;
    }

    // Glossary — fallback collapsible at the bottom. The full reference
    // remains here for users who want one place with all the jargon. The
    // per-section blurbs above are short summaries; this is the long form.
    this.renderGlossary(containerEl);

    // Re-apply any active filter after a full redraw (e.g. plugin reload
    // while the search box still had text — currently impossible because
    // display() is called fresh, but keep the call so future code paths
    // calling display() mid-session still respect filterQuery).
    if (this.filterQuery) this.applyFilter();
  }

  /**
   * OP-235 review fix #1: when the Settings tab closes (or the user navigates
   * away to another tab), abort any in-flight dashboard probes so their
   * resolved callbacks drop their DOM mutations rather than painting into
   * detached elements.
   */
  hide(): void {
    this.dashboardAbort?.abort();
    this.dashboardAbort = null;
  }

  // ─── Section mounting / targeted re-render ──────────────────────────────

  /** Create a wrapper element for the section, register it, and render. */
  private mountSection(
    parentEl: HTMLElement,
    id: SectionId,
    render: (el: HTMLElement) => void,
  ): void {
    const wrapper = parentEl.createDiv({ cls: "op-settings__section" });
    wrapper.dataset.sectionId = id;
    this.sectionEls.set(id, wrapper);
    render(wrapper);
  }

  /**
   * Re-render just one section. Replaces `this.display()` calls that
   * previously repainted the whole tab when, e.g., a working-dir mapping
   * was added or the project order reset.
   */
  private rerenderSection(id: SectionId): void {
    const wrapper = this.sectionEls.get(id);
    if (!wrapper) return;
    wrapper.empty();
    this.dispatchRender(id, wrapper);
    if (this.filterQuery) this.applyFilter();
  }

  private dispatchRender(id: SectionId, el: HTMLElement): void {
    switch (id) {
      // Daily
      case "agent":
        return this.renderDailyAgent(el);
      case "terminalApp":
        return this.renderDailyTerminal(el);
      case "sidebarTab":
        return this.renderDailySidebar(el);
      case "onboarding":
        return this.renderDailyOnboarding(el);
      case "hotkeyPreset":
        return this.renderDailyHotkey(el);
      // Workflows
      case "workflows":
        return this.renderWorkflows(el);
      // Advanced
      case "injection":
      case "workingDirs":
      case "orchestrator":
      case "profileOverlays":
      case "sessionDecoration":
      case "worktreeEnforcement":
      case "flowChaining":
      case "github":
      case "dashboard":
      case "vaultGit":
      case "developer":
        return this.renderAdvancedSection(id, el);
      default: {
        // Compile-time exhaustiveness: TypeScript errors here when a new
        // SectionId value is added without a matching case above.
        const _exhaustive: never = id;
        return _exhaustive;
      }
    }
  }

  private renderAdvancedSection(id: AdvancedSectionId, el: HTMLElement): void {
    switch (id) {
      case "injection":
        return this.renderInjection(el);
      case "workingDirs":
        return this.renderWorkingDirsAndProjectOrder(el);
      case "orchestrator":
        return this.renderOrchestrator(el);
      case "profileOverlays":
        return this.renderProfileOverlays(el);
      case "sessionDecoration":
        return this.renderSessionDecoration(el);
      case "worktreeEnforcement":
        return this.renderWorktreeEnforcement(el);
      case "flowChaining":
        return this.renderFlowChaining(el);
      case "github":
        return this.renderGithub(el);
      case "dashboard":
        return this.renderDashboard(el);
      case "vaultGit":
        return this.renderVaultGit(el);
      case "developer":
        return this.renderDeveloper(el);
      default: {
        const _exhaustive: never = id;
        return _exhaustive;
      }
    }
  }

  // ─── Search ─────────────────────────────────────────────────────────────

  private renderSearch(containerEl: HTMLElement): void {
    const wrap = containerEl.createDiv({ cls: "op-settings__search-wrap" });
    const input = wrap.createEl("input", {
      cls: "op-settings__search",
      attr: {
        type: "text",
        placeholder: "Search settings…",
        spellcheck: "false",
      },
    });
    input.value = this.filterQuery;
    input.addEventListener("input", () => {
      this.filterQuery = input.value;
      this.applyFilter();
    });
  }

  /**
   * Hide individual `.setting-item` rows whose name+desc don't match the
   * fuzzy query, then hide section wrappers whose visible row count drops
   * to zero. Empty query restores everything. Mirrors the sidebar's
   * filterEntries shape.
   */
  private applyFilter(): void {
    const q = this.filterQuery.trim();
    const containerEl = this.containerEl;
    const matcher = q ? prepareFuzzySearch(q) : null;
    const rows = containerEl.querySelectorAll<HTMLElement>(".setting-item");
    rows.forEach((row) => {
      if (!matcher) {
        row.style.removeProperty("display");
        return;
      }
      const name = row.querySelector(".setting-item-name")?.textContent ?? "";
      const desc = row.querySelector(".setting-item-description")?.textContent ?? "";
      const ok = matchSettingRow(name, desc, q, () => matcher);
      row.style.display = ok ? "" : "none";
    });
    // Auto-expand Advanced collapsibles that have visible matches; hide
    // collapsible wrappers whose visible row count is zero so the user
    // doesn't see a dozen empty headers when searching.
    containerEl.querySelectorAll<HTMLElement>(".op-collapsible").forEach((wrapper) => {
      // aria-expanded lives on the header (the role="button" element), so
      // sync it there — not on the wrapper — to stay consistent with the
      // OpCollapsible constructor and setOpen().
      const header = wrapper.querySelector<HTMLElement>(".op-collapsible__header");
      if (!matcher) {
        wrapper.style.removeProperty("display");
        // Collapse collapsibles that were auto-expanded by search (i.e. not
        // manually opened by the user) so clearing the query restores the
        // original all-collapsed state.
        if (wrapper.dataset.opAutoExpanded) {
          delete wrapper.dataset.opAutoExpanded;
          wrapper.classList.remove("is-open");
          header?.setAttribute("aria-expanded", "false");
        }
        return;
      }
      const visibleRows = wrapper.querySelectorAll<HTMLElement>(
        ".setting-item",
      );
      let anyVisible = false;
      visibleRows.forEach((r) => {
        if (r.style.display !== "none") anyVisible = true;
      });
      wrapper.style.display = anyVisible ? "" : "none";
      if (anyVisible && !wrapper.classList.contains("is-open")) {
        // Auto-open so the matches are visible without a manual click.
        // Mark as auto-expanded so clearing the filter can restore the
        // collapsed state. (User-opened collapsibles lack this marker.)
        wrapper.classList.add("is-open");
        header?.setAttribute("aria-expanded", "true");
        wrapper.dataset.opAutoExpanded = "1";
      }
    });
  }

  // ─── Daily section renderers ────────────────────────────────────────────

  private renderDailyAgent(containerEl: HTMLElement): void {
    const s = this.plugin.settings;
    new Setting(containerEl)
      .setName("Default agent")
      .setDesc(
        "Agent launched by “op: open agent for issue” when no override is given. Only claude is supported and exercised end-to-end; gemini and copilot are second-class, untested scaffolding — see the project README's “Supported AI runtimes” section. The picker only appears when this agent isn't detected on PATH, or “Always prompt for agent” is on.",
      )
      .addDropdown((d) => {
        for (const id of AGENT_IDS) d.addOption(id, id);
        d.setValue(s.defaultAgent).onChange(async (v) => {
          s.defaultAgent = v as AgentId;
          await this.plugin.saveSettings();
        });
      });
  }

  private renderDailyTerminal(containerEl: HTMLElement): void {
    const s = this.plugin.settings;
    new Setting(containerEl)
      .setName("Terminal app")
      .setDesc(
        "iTerm is the primary, daily-driver terminal — orchestrator, tmux `-CC` control mode, background launch and AppleScript paths all assume it. Terminal.app is a second-class fallback (plain tmux via `open -a Terminal`; no orchestrator, no `-CC`, no background launch). Other terminals (Kitty, Alacritty, Ghostty, WezTerm, …) are not supported; op still routes through Terminal.app or iTerm regardless of your default terminal. All agents share a single tmux session (`op-agents`), one window per issue (window name = issue id). Agents survive the terminal closing — reattach with `tmux attach -t op-agents`.",
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
  }

  private renderDailySidebar(containerEl: HTMLElement): void {
    const s = this.plugin.settings;
    new Setting(containerEl)
      .setName("Sidebar default tab")
      .setDesc("Tab shown when the op sidebar opens.")
      .addDropdown((d) =>
        d
          .addOption("issues", "Issues")
          .addOption("in-flight", "In flight")
          .addOption("resolved", "Resolved")
          .setValue(s.view.defaultTab)
          .onChange(async (v) => {
            s.view.defaultTab = v as SidebarTab;
            await this.plugin.saveSettings();
          }),
      );
  }

  private renderDailyOnboarding(containerEl: HTMLElement): void {
    const readmePath = onboardingReadmePath(this.plugin.settings.projectsRoot);
    new Setting(containerEl)
      .setName("Onboarding README")
      .setDesc(
        `Open the op onboarding README — a short tour of the most-used commands and workflows. Located at \`${readmePath}\`. Deletes don't come back automatically; use the Start tour command from the palette to re-scaffold a demo project.`,
      )
      .addButton((b) =>
        b.setButtonText("Open README").setCta().onClick(async () => {
          const file = this.app.vault.getAbstractFileByPath(readmePath);
          if (!file) {
            notify(`op: README not found at ${readmePath}. Run “op: start guided tour” to re-scaffold.`);
            return;
          }
          await this.app.workspace.openLinkText(readmePath, "");
        }),
      );
  }

  private renderDailyHotkey(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName("Apply op default hotkey preset")
      .setDesc(
        "Binds the op commands to ⌘⇧* / ⌘⌥* shortcuts. Best-effort: any binding whose key is already taken is skipped. Reversible from the results modal during this session.",
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
  }

  // ─── Workflows section renderer (OP-201) ────────────────────────────────

  private renderWorkflows(containerEl: HTMLElement): void {
    // OP-219: workflowMode dropdown — the master toggle gating whether the
    // module engine drives injection at all. Rendered first so it's visible
    // before any module-specific UI; on change re-renders the whole section
    // so the "Workflow modules disabled" callouts in the launch preview /
    // module list reflect the new mode immediately.
    this.renderWorkflowModeRow(containerEl);

    const result = loadModules(this.app);
    const { modules, diagnostics } = result;

    if (modules.length === 0) {
      this.renderWorkflowsEmptyState(containerEl);
    } else {
      this.renderWorkflowsModuleList(containerEl, modules, diagnostics);
    }

    // OP-206 (3f): Preview composed prompt entry. Always rendered (even with
    // zero modules) so a user without modules sees the affordance and the
    // composer's empty output / loader diagnostics; routes through
    // PreviewWorkflowModal.
    this.renderWorkflowsPreview(containerEl);

    // Available variables panel — always rendered (even when no modules), so
    // a brand-new user can see what tokens they'll be able to reference once
    // they install or author a module. Collapsed by default to avoid
    // dominating the panel.
    const varsCollapsible = new OpCollapsible(
      containerEl,
      "Available variables",
      { startOpen: false },
    );
    varsCollapsible.root.dataset.opSection = "workflowsVars";
    addDocLink(varsCollapsible.header, "workflowsVars");
    addHelpExpandable(
      varsCollapsible.body,
      "What is this?",
      "Tokens you can reference in a module body via {{name}}. These are computed per-launch from the issue, the agent profile, and the launch context — they sit at Launch override (the highest precedence). User-declared {{vars.<name>}} are a separate namespace declared in a module's `vars:` block.",
    );
    this.renderAvailableVariables(varsCollapsible.body);
  }

  private renderWorkflowModeRow(parentEl: HTMLElement): void {
    const s = this.plugin.settings;
    const row = new Setting(parentEl)
      .setName("Workflow mode")
      .setDesc(
        "Master toggle for prompt composition. Modules: the launcher composes the prompt from workflow-module files in this vault (post-OP-208 default). Legacy: the launcher inlines the project's WORKFLOW.md as-is and ignores any modules. Existing installs that explicitly set this stay on whatever they had — the OP-208 cutover only flipped the default for installs that never wrote a value.",
      )
      .addDropdown((dd) => {
        dd.addOption("modules", "Modules (default)");
        dd.addOption("legacy", "Legacy (inline WORKFLOW.md)");
        dd.setValue(s.workflowMode);
        dd.onChange(async (value) => {
          s.workflowMode = value as WorkflowMode;
          await this.plugin.saveSettings();
          // Re-render the whole section so the empty-state copy, module
          // list, and preview disclosures pick up the new mode without a
          // settings-tab close/reopen.
          this.rerenderSection("workflows");
        });
      });
    row.settingEl.dataset.opRow = "workflowMode";
  }

  private renderWorkflowsEmptyState(parentEl: HTMLElement): void {
    const empty = parentEl.createDiv({
      cls: "op-workflow-empty-state",
    });
    empty.dataset.opEmptyState = "true";
    empty.createEl("p", {
      cls: "op-workflow-empty-state__title",
      text: "No modules yet",
    });
    const body = empty.createEl("p", {
      cls: "op-workflow-empty-state__body setting-item-description",
    });
    body.appendText("Open the ");
    const quickstart = body.createEl("a", {
      text: "5-min Quickstart",
      href: "https://github.com/earchibald/obsidian-projects/blob/main/docs/workflow-modules/02-quickstart.md",
    });
    quickstart.setAttribute("target", "_blank");
    quickstart.setAttribute("rel", "noopener");
    body.appendText(", or install the example library below to get a working modules tree in one click.");

    new Setting(empty)
      .setName("Install example library")
      .setDesc(
        `Writes ${EXAMPLE_MODULES.length} starter modules into ${globalModulesDirPath(this.plugin.settings.projectsRoot)}/. Existing files are never overwritten — safe to click again. Open the installed files to see complete, valid module shape.`,
      )
      .addButton((b) =>
        b
          .setButtonText("Install example library")
          .setCta()
          .onClick(async () => {
            try {
              const r = await installExampleLibrary(this.app);
              const parts: string[] = [];
              if (r.installed.length) parts.push(`${r.installed.length} installed`);
              if (r.skipped.length) parts.push(`${r.skipped.length} skipped (already present)`);
              notify(`Example library: ${parts.join(", ") || "no changes"}.`, 6000);
              // metadataCache populates each new file's frontmatter
              // asynchronously after vault.create resolves — rendering
              // immediately can miss files whose cache hasn't caught up,
              // showing only the first installed module. Wait for the
              // batch-resolve event (or a short timeout fallback) before
              // re-rendering so loadModules sees every installed file.
              await waitForCacheSettle(this.app, 500);
              this.rerenderSection("workflows");
            } catch (e) {
              notify(`Could not install example library: ${(e as Error).message}`, 8000);
            }
          }),
      );
  }

  private renderWorkflowsModuleList(
    parentEl: HTMLElement,
    modules: readonly WorkflowModule[],
    diagnostics: readonly WorkflowDiagnostic[],
  ): void {
    // Bucket diagnostics by moduleId so each row can render its own count
    // without re-scanning the full list. Diagnostics with no moduleId
    // (e.g. some intra-scope-collision payloads) bucket under "" and surface
    // in the unattributed footer below.
    const byModule = new Map<string, WorkflowDiagnostic[]>();
    for (const d of diagnostics) {
      const key = d.moduleId ?? "";
      const arr = byModule.get(key) ?? [];
      arr.push(d);
      byModule.set(key, arr);
    }

    const list = parentEl.createDiv({ cls: "op-workflow-module-list" });
    for (const m of modules) {
      const row = list.createDiv({ cls: "op-workflow-module" });
      row.dataset.moduleId = m.id;

      const head = row.createDiv({ cls: "op-workflow-module__head" });
      head.createSpan({ cls: "op-workflow-module__id", text: m.id });
      head.createSpan({ cls: "op-workflow-module__title", text: m.title });
      const sourceLabel =
        m.source.kind === "global"
          ? "global"
          : `project: ${m.source.projectSlug}`;
      head.createSpan({
        cls: "op-workflow-module__source",
        text: sourceLabel,
      });

      const ds = byModule.get(m.id) ?? [];
      const counts = countsBySeverity(ds);
      if (counts.error || counts.warning || counts.info) {
        const badges = head.createSpan({ cls: "op-workflow-module__badges" });
        if (counts.error) appendBadge(badges, "error", counts.error);
        if (counts.warning) appendBadge(badges, "warning", counts.warning);
        if (counts.info) appendBadge(badges, "info", counts.info);
      } else {
        head.createSpan({
          cls: "op-workflow-module__badges op-workflow-module__badges--ok",
          text: "ok",
        });
      }

      // Per-module diagnostic lines through the unified formatter. One line
      // per diagnostic — modal renders the multi-line block on Explain click.
      if (ds.length) {
        const diagList = row.createDiv({ cls: "op-workflow-module__diagnostics" });
        for (const d of ds) {
          const f = formatDiagnostic(d);
          const line = diagList.createDiv({
            cls: `op-workflow-module__diagnostic op-workflow-module__diagnostic--${f.severity}`,
          });
          const badge = line.createSpan({
            cls: "op-workflow-module__diagnostic-badge",
            text: f.severityBadge,
          });
          // Tooltip shows the full code label, NOT the abbreviation. The
          // abbreviation is the single-letter glyph in the badge text itself
          // — primary copy in the tooltip stays canonical.
          badge.setAttribute("aria-label", f.codeLabel);
          badge.setAttribute("title", f.codeLabel);
          line.createSpan({
            cls: "op-workflow-module__diagnostic-code",
            text: f.codeLabel,
          });
          line.createSpan({
            cls: "op-workflow-module__diagnostic-message",
            text: f.message,
          });
          if (f.scopeLabel) {
            // Full canonical scope label in primary copy. The single-letter
            // form is for the badge tooltip only — never shown here.
            line.createSpan({
              cls: "op-workflow-module__diagnostic-scope",
              text: f.scopeLabel,
            });
          }
        }
      }

      // Explain action — opens the modal that renders every diagnostic for
      // this module through the unified formatter's multi-line block. Even
      // when ds.length === 0 the modal still opens (showing "No diagnostics")
      // so users can verify they're looking at the right module.
      const actions = row.createDiv({ cls: "op-workflow-module__actions" });
      const explain = actions.createEl("button", {
        cls: "op-workflow-module__explain",
        text: "Explain workflow",
      });
      explain.addEventListener("click", () => {
        new WorkflowExplainModal(this.app, m, ds).open();
      });
    }

    // Surface diagnostics that don't pair with a loaded module: either
    // diagnostics with no moduleId at all, or diagnostics whose moduleId
    // points at a module that failed to parse (so the file never made it
    // into the modules list). Without this footer, parse-failure
    // diagnostics would silently vanish — exactly the failure mode the
    // unified formatter is meant to prevent.
    const loadedIds = new Set(modules.map((m) => m.id));
    const orphaned: WorkflowDiagnostic[] = [];
    for (const [moduleId, ds] of byModule) {
      if (moduleId === "" || !loadedIds.has(moduleId)) orphaned.push(...ds);
    }
    if (orphaned.length) {
      const foot = parentEl.createDiv({ cls: "op-workflow-module-list__orphan" });
      foot.dataset.opOrphanDiagnostics = "true";
      foot.createEl("h4", { text: "Unattributed diagnostics" });
      foot.createEl("p", {
        cls: "setting-item-description",
        text: "Diagnostics from modules that failed to parse, or that don't bind to a single module.",
      });
      for (const d of orphaned) {
        const f = formatDiagnostic(d);
        const line = foot.createDiv({
          cls: `op-workflow-module__diagnostic op-workflow-module__diagnostic--${f.severity}`,
        });
        const badge = line.createSpan({
          cls: "op-workflow-module__diagnostic-badge",
          text: f.severityBadge,
        });
        badge.setAttribute("aria-label", f.codeLabel);
        badge.setAttribute("title", f.codeLabel);
        line.createSpan({
          cls: "op-workflow-module__diagnostic-code",
          text: f.codeLabel,
        });
        line.createSpan({
          cls: "op-workflow-module__diagnostic-message",
          text: d.moduleId ? `${d.moduleId}: ${f.message}` : f.message,
        });
        if (f.scopeLabel) {
          line.createSpan({
            cls: "op-workflow-module__diagnostic-scope",
            text: f.scopeLabel,
          });
        }
      }
    }
  }

  private renderWorkflowsPreview(parentEl: HTMLElement): void {
    new Setting(parentEl)
      .setName("Preview composed prompt")
      .setDesc(
        "Open a read-only modal that renders the fully-composed launch prompt for a chosen (issue, mode, agent) tuple — the exact string the launcher would pass to the agent.",
      )
      .addButton((b) =>
        b
          .setButtonText("Open preview")
          .setCta()
          .onClick(() => {
            const issues = this.plugin.store
              .issues()
              .filter((e) => !e.resolvedFolder);
            if (issues.length === 0) {
              notify("op: no open issues to preview against — create one with op-new first.");
              return;
            }
            new PreviewWorkflowModal(this.app, {
              issues,
              detector: this.plugin.detector,
              settings: this.plugin.settings,
            }).open();
          }),
      );

    // OP-206 (3f): toggle to re-enable the preview auto-expand affordance
    // if the user previously dismissed it via the LaunchAgentModal link.
    // The persisted flag is `previewAutoExpandDismissed` (dismissed = toggle OFF),
    // so the toggle value is the logical inverse.
    const s = this.plugin.settings;
    new Setting(parentEl)
      .setName("Auto-expand launch preview")
      .setDesc(
        "When enabled, the \"Composed prompt preview\" disclosure in the Launch modal expands automatically on the first three launches per Obsidian session. Clicking \"Don't auto-expand by default\" in the modal disables this.",
      )
      .addToggle((t) => {
        const autoExpandEnabled = !s.previewAutoExpandDismissed;
        t.setValue(autoExpandEnabled).onChange(async (enabled) => {
          s.previewAutoExpandDismissed = !enabled;
          await this.plugin.saveSettings();
        });
      });
  }

  private renderAvailableVariables(parentEl: HTMLElement): void {
    const list = parentEl.createDiv({ cls: "op-workflow-vars-panel" });
    for (const v of Object.values(PLUGIN_VAR_REGISTRY)) {
      const row = list.createDiv({ cls: "op-workflow-vars-panel__row" });
      const head = row.createDiv({ cls: "op-workflow-vars-panel__head" });
      head.createSpan({
        cls: "op-workflow-vars-panel__name",
        text: `{{${v.name}}}`,
      });
      head.createSpan({
        cls: "op-workflow-vars-panel__example",
        text: `e.g. ${v.example}`,
      });
      row.createDiv({
        cls: "op-workflow-vars-panel__desc setting-item-description",
        text: v.description,
      });
    }
  }

  // ─── Advanced section renderers ─────────────────────────────────────────

  private renderInjection(containerEl: HTMLElement): void {
    const s = this.plugin.settings;

    new Setting(containerEl)
      .setName("Inject issue body")
      .setDesc(
        "Append the issue note's body (after frontmatter) to the launched prompt so the agent sees the scope without having to read the note.",
      )
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
        t.setValue(String(s.injection.maxBodyChars)).onChange(async (v) => {
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
      .setDesc(
        "Number of recent entries from the issue's `commits:` frontmatter list to append to the prompt. 0 disables.",
      )
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

    // OP-208 (8a, cutover): the "Workflow inline cap (chars)" row was retired
    // here. The legacy WORKFLOW.md inline path in `promptBuild.ts` was removed
    // at the same cutover; `injection.maxWorkflowChars` is still honored by
    // the modular composer (`composeWorkflowPure.ts`) as a soft size budget
    // (info-severity `size-budget` diagnostic on overrun) and by the editor
    // validator. The Workflows top-level group from OP-201 surfaces those
    // diagnostics, so an editable text-input row here would be redundant —
    // and confusing, since the new default of 50000 is generous enough that
    // most users never hit the budget.

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

    // Sidebar density / hover-preview controls live next to Injection's
    // "view" sister settings — they remain in the Daily Sidebar tab dropdown
    // for default tab + here for the more advanced tweaks. Keep them here
    // (under Injection? no — they're view-related); these moved into a
    // dedicated "Sidebar advanced" subgroup.
  }

  private renderWorkingDirsAndProjectOrder(containerEl: HTMLElement): void {
    const s = this.plugin.settings;
    const currentRoot = currentProjectsRoot(this.app, s);

    let nextProjectsRoot = currentRoot;
    new Setting(containerEl)
      .setName("Projects path")
      .setDesc(
        "Vault-relative folder that contains project folders plus op-owned global files like _scratch/, _op-modules/, and the onboarding README. Changing it offers to move the existing tree so issues, modules, and scratch files keep working.",
      )
      .addText((t) => {
        t.setPlaceholder("Projects");
        t.setValue(currentRoot);
        t.inputEl.style.width = "100%";
        t.onChange((v) => (nextProjectsRoot = v));
      })
      .addButton((b) =>
        b.setButtonText("Apply").setCta().onClick(async () => {
          const validated = validateProjectsRootInput(nextProjectsRoot);
          if (!validated.ok) {
            notify(`projectsRoot: ${validated.error}`);
            return;
          }
          await this.applyProjectsRootChange(currentRoot, validated.value);
        }),
      );

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
          this.rerenderSection("workingDirs");
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
          this.rerenderSection("workingDirs");
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
          this.rerenderSection("workingDirs");
        });
      });

    // Project order — folded into the same section so the user sees the same
    // project list and same concerns in one place. The orphan
    // "Reset to alphabetical" button used to dangle outside the H2; it now
    // re-renders just the project-order subtree, not the whole tab.
    const orderHeader = containerEl.createDiv({ cls: "op-settings__subhead" });
    orderHeader.createEl("h3", { text: "Project order" });
    containerEl.createEl("p", {
      text:
        "Drag to reorder how projects appear in command pickers (e.g. “op: New issue”). Newly-discovered projects sort alphabetically below the curated list.",
      cls: "setting-item-description",
    });
    const orderHost = containerEl.createDiv({ cls: "op-settings__project-order-host" });
    this.renderProjectOrder(orderHost);
  }

  /**
   * Drag-reorderable project list. Lives inside the Working-directories
   * collapsible (OP-164 §4) — the parent `OpCollapsible` refuses to
   * collapse while `dragInFlight` is true so getBoundingClientRect()
   * never goes to zero mid-drag (the original drag-in-details bug).
   */
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
        this.dragInFlight = true;
        li.classList.add("is-dragging");
        if (ev.dataTransfer) {
          ev.dataTransfer.effectAllowed = "move";
          ev.dataTransfer.setData("text/plain", p.slug);
        }
        // Safety net: browsers reliably fire `dragend` on Escape (HTML spec),
        // but register a one-shot document capture listener so a browser quirk
        // that skips `dragend` on the source element can never leave
        // `dragInFlight` stuck at `true` and permanently lock the collapsible.
        document.addEventListener("dragend", () => { this.dragInFlight = false; }, { capture: true, once: true });
      });
      li.addEventListener("dragend", () => {
        dragSlug = null;
        this.dragInFlight = false;
        li.classList.remove("is-dragging");
        clearDropAffordance();
        // The document safety-net listener is `once:true` so it self-removes
        // after the first dragend (which is this one in the normal path).
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
          this.rerenderSection("workingDirs");
        }),
      );
  }

  private renderOrchestrator(containerEl: HTMLElement): void {
    const s = this.plugin.settings;

    // OP-155 §4 Step 1 — non-activating iTerm launch toggle. Lives in the
    // orchestrator/terminal-launching section because it governs how the
    // terminal app comes up.
    new Setting(containerEl)
      .setName("Launch agent without stealing focus")
      .setDesc(
        "When on, op cold-starts iTerm via `open -ga` and creates the agent's tab via the WebSocket API without bringing iTerm to the foreground — Obsidian keeps focus. Off: iTerm comes forward as today. iTerm only; Terminal.app has no equivalent non-activating launch path. (OP-155 §4 Step 1)",
      )
      .addToggle((t) =>
        t.setValue(s.backgroundLaunch).onChange(async (v) => {
          s.backgroundLaunch = v;
          await this.plugin.saveSettings();
        }),
      );

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

    // Terminal-flavor controls (tmux binary, iTerm placement) sit alongside
    // the orchestrator since they all govern terminal launching.
    const tmuxStatus = (p: string) =>
      existsSync(p) ? `✓ exists: ${p}` : `⚠ not found: ${p}`;
    const tmuxSetting = new Setting(containerEl)
      .setName("tmux binary")
      .setDesc(
        `Absolute path to the tmux executable. Obsidian's PATH omits /opt/homebrew/bin, so bare \`tmux\` fails on Apple Silicon brew installs. ${tmuxStatus(s.tmuxBinary)}`,
      );
    let tmuxStatusEl: HTMLElement;
    tmuxSetting.addText((t) => {
      // Inline ✓/✗ status pill rendered beneath the input — updated on input
      // (debounced) + blur. The setDesc text still mirrors the saved state.
      t.setValue(s.tmuxBinary);
      const refresh = (raw: string) => {
        const trimmed = raw.trim();
        if (!trimmed) {
          tmuxStatusEl.textContent = "⚠ empty";
          tmuxStatusEl.className = "op-tmux-status is-warn";
          return;
        }
        if (existsSync(trimmed)) {
          tmuxStatusEl.textContent = `✓ exists`;
          tmuxStatusEl.className = "op-tmux-status is-ok";
        } else {
          tmuxStatusEl.textContent = `✗ not found`;
          tmuxStatusEl.className = "op-tmux-status is-error";
        }
      };
      t.inputEl.addEventListener("input", () => {
        this.debounce("tmuxPath", 150, () => refresh(t.getValue()));
      });
      t.inputEl.addEventListener("blur", async () => {
        const trimmed = t.getValue().trim();
        if (trimmed) {
          s.tmuxBinary = trimmed;
          await this.plugin.saveSettings();
          tmuxSetting.setDesc(
            `Absolute path to the tmux executable. Obsidian's PATH omits /opt/homebrew/bin, so bare \`tmux\` fails on Apple Silicon brew installs. ${tmuxStatus(trimmed)}`,
          );
        }
        refresh(t.getValue());
      });
      // Defer status-element creation until after the input is mounted so
      // it sits below the row's controls.
      queueMicrotask(() => refresh(t.getValue()));
    });
    tmuxStatusEl = tmuxSetting.settingEl.createDiv({ cls: "op-tmux-status" });
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
          this.rerenderSection("orchestrator");
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

    // Sidebar advanced controls — recently resolved limit, open on startup,
    // density, hover preview — fit alongside other view-flavor controls.
    new Setting(containerEl)
      .setName("Resolved default list size")
      .setDesc("How many recent items the Resolved tab shows before you start searching.")
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
      .setName("Open sidebar on startup")
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
  }

  private renderProfileOverlays(containerEl: HTMLElement): void {
    const s = this.plugin.settings;

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
          this.rerenderSection("profileOverlays");
        }),
      );

    containerEl.createEl("p", {
      text:
        "Overlays are a JSON patch merged on top of the built-in profile for each agent. Allowed keys include `binary`, `launchFlags`, `promptPreamble`, `skillTrigger`, `label`, `postLaunchCommands`, the per-mode `*PostLaunchCommands` arrays, and `postLaunchReadinessRegex`. Example: `{ \"binary\": \"/opt/homebrew/bin/claude\", \"postLaunchCommands\": [\"/rename {{name}}\"] }`.",
      cls: "setting-item-description",
    });

    for (const id of AGENT_IDS) {
      const setting = new Setting(containerEl).setName(`${id} overlay`);
      let banner: HTMLElement;
      setting.addTextArea((t) => {
        const existing = s.agentOverlays[id];
        t.setValue(existing ? JSON.stringify(existing, null, 2) : "");
        t.inputEl.rows = 5;
        t.inputEl.style.width = "100%";

        // Inline validation banner — re-evaluated on input (debounced) and
        // on blur. Pre-OP-164, validateOverlay findings only surfaced as a
        // userError() Notice on save; surfacing them inline turns the
        // textarea into an immediate-feedback editor.
        const validate = (raw: string): { kind: "ok" | "error" | "warn" | "empty"; msg: string } => {
          const trimmed = raw.trim();
          if (!trimmed) return { kind: "empty", msg: "" };
          let parsed: unknown;
          try {
            parsed = JSON.parse(trimmed);
          } catch (err: any) {
            return { kind: "error", msg: `Invalid JSON: ${err?.message ?? err}` };
          }
          const result = validateOverlay(parsed);
          if (!result.ok || !result.overlay) {
            return { kind: "error", msg: result.errors.join("; ") };
          }
          if (result.warnings.length) {
            return { kind: "warn", msg: `Saved with warnings: ${result.warnings.join("; ")}` };
          }
          return { kind: "ok", msg: "Valid overlay" };
        };
        const refresh = (raw: string): void => {
          const r = validate(raw);
          if (r.kind === "empty") {
            banner.textContent = "";
            banner.className = "op-overlay-validation";
            return;
          }
          banner.textContent =
            r.kind === "ok" ? `✓ ${r.msg}` : r.kind === "warn" ? `⚠ ${r.msg}` : `✗ ${r.msg}`;
          banner.className = `op-overlay-validation is-${r.kind}`;
        };
        t.inputEl.addEventListener("input", () => {
          this.debounce(`overlay:${id}`, 150, () => refresh(t.getValue()));
        });
        t.inputEl.addEventListener("blur", async () => {
          const raw = t.getValue().trim();
          refresh(raw);
          if (!raw) {
            delete s.agentOverlays[id];
            await this.plugin.saveSettings();
            return;
          }
          let parsed: unknown;
          try {
            parsed = JSON.parse(raw);
          } catch (err: any) {
            // userError fires the Notice for visibility; banner already shows
            // the inline message.
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
              "Allowed keys: binary, launchFlags (string[]), promptPreamble, skillTrigger, label, postLaunchCommands (string[]), per-mode *PostLaunchCommands (string[]), postLaunchReadinessRegex.",
              "Allowed keys: binary, launchFlags (string[]), promptPreamble, skillTrigger, label, postLaunchCommands (string[]), per-mode *PostLaunchCommands (string[]), postLaunchReadinessRegex.",
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
        // Mount the banner after the input so it sits visually below.
        queueMicrotask(() => refresh(t.getValue()));
      });
      banner = setting.settingEl.createDiv({ cls: "op-overlay-validation" });
    }
  }

  private renderSessionDecoration(containerEl: HTMLElement): void {
    const s = this.plugin.settings;
    new Setting(containerEl)
      .setName("Auto-color sessions")
      .setDesc(
        "After Claude launches, send `/color <name>` in the tmux-backed REPL. Colors stay unique within a given iTerm window unless the palette is exhausted.",
      )
      .addToggle((t) =>
        t.setValue(s.sessionDecoration.autoColor).onChange(async (v) => {
          s.sessionDecoration.autoColor = v;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("Auto-rename sessions")
      .setDesc("After Claude launches, send `/rename <name>` using the session name template below.")
      .addToggle((t) =>
        t.setValue(s.sessionDecoration.autoRename).onChange(async (v) => {
          s.sessionDecoration.autoRename = v;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("Auto-engage Remote Control")
      .setDesc(
        "Sends `/remote-control` after launch so the session appears at claude.ai/code. Requires browser confirmation the first time.",
      )
      .addToggle((t) =>
        t.setValue(s.sessionDecoration.autoRemoteControl).onChange(async (v) => {
          s.sessionDecoration.autoRemoteControl = v;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("Use plugin statusline")
      .setDesc(
        "Install the statusline-plugin run wrapper as the `statusLine` command in `~/.claude/settings.json`. When off, op-obsidian does not modify the statusLine key so Claude's default or your own custom statusLine is used instead. Applies on the next plugin reload or settings change.",
      )
      .addToggle((t) =>
        t.setValue(s.sessionDecoration.usePluginStatusline).onChange(async (v) => {
          s.sessionDecoration.usePluginStatusline = v;
          await this.plugin.saveSettings();
          await this.plugin.reinstallAgentHooks();
        }),
      );

    new Setting(containerEl)
      .setName("Color palette")
      .setDesc(
        `Comma-separated Claude prompt-bar colors. Valid values: ${CLAUDE_SESSION_COLORS.join(", ")}. Invalid entries are dropped; if none remain, the default eight are restored.`,
      )
      .addText((t) => {
        t.setValue(s.sessionDecoration.palette.join(", "));
        t.inputEl.style.width = "100%";
        t.inputEl.addEventListener("blur", async () => {
          const raw = t.getValue();
          const parts = raw.split(",");
          const sanitized = sanitizeSessionDecorationPalette(parts);
          const unknown = parts
            .map((part) => part.trim().toLowerCase())
            .filter((part) => part.length > 0 && !CLAUDE_SESSION_COLORS.includes(part as typeof CLAUDE_SESSION_COLORS[number]));
          if (unknown.length > 0) {
            notify(`op: dropped invalid session colors: ${unknown.join(", ")}`, 7000);
          }
          s.sessionDecoration.palette = sanitized.length > 0 ? sanitized : [...CLAUDE_SESSION_COLORS];
          t.setValue(s.sessionDecoration.palette.join(", "));
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Session name template")
      .setDesc("Template for `/rename`. Available variables: `{{id}}`, `{{title}}`, `{{agent}}`, `{{parent}}`.")
      .addText((t) => {
        t.setValue(s.sessionDecoration.nameTemplate);
        t.inputEl.style.width = "100%";
        t.inputEl.addEventListener("blur", async () => {
          const next = t.getValue().trim();
          s.sessionDecoration.nameTemplate = next || DEFAULT_SETTINGS.sessionDecoration.nameTemplate;
          t.setValue(s.sessionDecoration.nameTemplate);
          await this.plugin.saveSettings();
        });
      });

    const advanced = new OpCollapsible(containerEl, "Advanced…", { startOpen: false });
    new Setting(advanced.body)
      .setName("Inter-command delay (ms)")
      .setDesc("Delay between each post-launch tmux `send-keys` command.")
      .addText((t) =>
        t.setValue(String(s.sessionDecoration.interCommandDelayMs)).onChange(async (v) => {
          const n = parseInt(v, 10);
          if (Number.isFinite(n) && n >= 0) {
            s.sessionDecoration.interCommandDelayMs = n;
            await this.plugin.saveSettings();
          }
        }),
      );
  }

  private renderWorktreeEnforcement(containerEl: HTMLElement): void {
    const s = this.plugin.settings;
    new Setting(containerEl)
      .setName("Enforce worktree for delegated agents")
      .setDesc(
        "Block edits on the main checkout for op-launched sessions. PreToolUse hook — verified on Claude Code; the Gemini install path is best-effort and untested. Copilot CLI is skipped (no pre-tool gate). Changes take effect on the next agent session. Override per-session with OP_ALLOW_MAIN_EDIT=1.",
      )
      .addToggle((t) =>
        t.setValue(s.agents.enforceWorktree).onChange(async (v) => {
          s.agents.enforceWorktree = v;
          await this.plugin.saveSettings();
          await this.plugin.reinstallAgentHooks();
        }),
      );
    new Setting(containerEl)
      .setName("Refuse direct edits on managed notes")
      .setDesc(
        "OP-259 / Phase 2 of OP-218. PreToolUse layer that blocks Edit/Write on any vault `*.md` whose frontmatter has `op_managed: true` — agents are pushed toward the `op-*` endpoints (op-set-tasks, op-task-set-status, op-task-append-note, op-doc-create/edit, op-set-section, etc.). Default **on** as of OP-263 (Phase 6 of OP-218). Same hook channel as the worktree guard — same agent-coverage caveats. Override per-session with OP_ALLOW_MANAGED_EDIT=1.",
      )
      .addToggle((t) =>
        t.setValue(s.agentDiscipline.managedNoteGuard).onChange(async (v) => {
          s.agentDiscipline.managedNoteGuard = v;
          await this.plugin.saveSettings();
          await this.plugin.reinstallAgentHooks();
        }),
      );
    new Setting(containerEl)
      .setName("Refuse new files under ISSUES / RESOLVED ISSUES / TASKS")
      .setDesc(
        "OP-260 / Phase 3 of OP-218. PreToolUse layer that refuses agent creation of new files anywhere under `Projects/<slug>/{ISSUES,RESOLVED ISSUES,TASKS}/` — agents are pushed toward `op-new` (new issues) and `op-task-create` (new TASK notes). RESOLVED ISSUES is plugin-managed at resolve time; direct creation there is always wrong. Existing-file edits still flow through the managed-note layer above. Default **on** as of OP-263 (Phase 6 of OP-218). Override per-session with OP_ALLOW_NEW_FILE=1.",
      )
      .addToggle((t) =>
        t.setValue(s.agentDiscipline.newFileGuard).onChange(async (v) => {
          s.agentDiscipline.newFileGuard = v;
          await this.plugin.saveSettings();
          await this.plugin.reinstallAgentHooks();
        }),
      );
  }

  private renderFlowChaining(containerEl: HTMLElement): void {
    const s = this.plugin.settings;
    new Setting(containerEl)
      .setName("Auto-advance flow on SessionEnd")
      .setDesc(
        "When an agent exits cleanly, automatically launch the next stage per the flow transition matrix. Off by default — the new `flow:` value is still set, but the user runs `op-launch-next-stage` to relaunch.",
      )
      .addToggle((t) =>
        t.setValue(s.flow.autoAdvance).onChange(async (v) => {
          s.flow.autoAdvance = v;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("Allow finalize agent to merge PR")
      .setDesc(
        "Read by the finalize-mode preamble. When off, the agent stops before `gh pr merge` and asks for human confirmation. When on, the agent may merge directly. Off by default — destructive op gated behind explicit opt-in.",
      )
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
  }

  private renderGithub(containerEl: HTMLElement): void {
    const s = this.plugin.settings;
    new Setting(containerEl)
      .setName("Auto-create GitHub issue on new op issue")
      .setDesc(
        "When creating an op issue, if no GitHub URL is provided, run `gh issue create` and link the returned URL.",
      )
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

    new Setting(containerEl)
      .setName("Disable inline GitHub status")
      .setDesc(
        "Omit the PR and GitHub-issue segments from the note-level status strip (the lazy `gh` fetch never fires). The commit segment still renders. Useful for users without `gh` configured or in air-gapped environments.",
      )
      .addToggle((t) =>
        t.setValue(s.view.disableInlineGithubStatus).onChange(async (v) => {
          s.view.disableInlineGithubStatus = v;
          await this.plugin.saveSettings();
        }),
      );
  }

  /**
   * OP-235: Dashboard subsection (per OP-217 §"New settings subsection").
   * Five rows — port, target, daemon-status, token, install. Designed to
   * compose with OP-232's already-landed surface: the "Install daemon"
     * button calls OP-232's exported `installDaemon(assets, targetPath)`;
   * the daemon-status row uses a richer `probeDaemonStatus` than the
   * boolean OP-232 healthz probe so the badge can render uptime/version.
   *
   * Daemon-offline degrades gracefully: status shows "◯ not running";
   * Restart and Regenerate disable. Logs and Install stay enabled — they're
   * useful precisely when the daemon hasn't started.
   */
  private renderDashboard(containerEl: HTMLElement): void {
    const s = this.plugin.settings;
    const homedir = os.homedir();
    const paths = buildAutoLaunchPaths(homedir);
    const logPath = getDashboardLogPath(homedir);

    // OP-235 review fix #1+#2: scope every async probe to a fresh
    // AbortController. `display()`, `hide()`, and the start of
    // `renderDashboard()` itself all abort the prior controller before
    // wiring a new one, which means even a rapid re-render mid-fetch can't
    // see two probes' resolutions race onto the same statusBadge.
    this.dashboardAbort?.abort();
    const abort = new AbortController();
    this.dashboardAbort = abort;

    // ── Port ───────────────────────────────────────────────────────────────
    // OP-241: surface inline feedback when the typed value can't be saved.
    // Previously we silently kept the prior `s.dashboard.port`; users had no
    // signal that their input was rejected.
    const portSetting = new Setting(containerEl)
      .setName("Port")
      .setDesc(
        `Localhost port the OP-230 daemon binds to. Default 49217. Allowed range ${DASHBOARD_PORT_MIN}–${DASHBOARD_PORT_MAX}. Restart iTerm2 after changing — the daemon reads this on startup.`,
      );
    const portError = portSetting.settingEl.createDiv({
      cls: "op-port-error",
      attr: { role: "alert" },
    });
    portError.style.display = "none";
    portSetting.addText((t) => {
      t.inputEl.type = "number";
      t.inputEl.min = String(DASHBOARD_PORT_MIN);
      t.inputEl.max = String(DASHBOARD_PORT_MAX);
      t.inputEl.classList.add("op-port-input");
      const clearError = (): void => {
        portError.style.display = "none";
        portError.setText("");
        t.inputEl.removeAttribute("aria-invalid");
        t.inputEl.classList.remove("op-port-input--invalid");
      };
      const showError = (msg: string): void => {
        portError.setText(msg);
        portError.style.display = "";
        t.inputEl.setAttribute("aria-invalid", "true");
        t.inputEl.classList.add("op-port-input--invalid");
      };
      t.setValue(String(s.dashboard.port)).onChange(async (raw) => {
        const result = validateDashboardPortInput(raw);
        if (result.kind === "empty") {
          // User mid-edit (cleared the field); don't badge an error yet.
          clearError();
          return;
        }
        if (result.kind === "invalid") {
          showError(result.message);
          return;
        }
        clearError();
        s.dashboard.port = result.value;
        await this.plugin.saveSettings();
      });
    });

    // ── Open in (radio: system / iTerm browser tab) ───────────────────────
    const targetSetting = new Setting(containerEl)
      .setName("Open in")
      .setDesc(
        "Where the `op-dashboard` command opens the URL. iTerm browser tab requires the iTerm2 3.6 browser plugin (`brew install --cask itermbrowserplugin`); System browser opens the user's default browser via `window.open()`.",
      );
    const radioWrap = targetSetting.controlEl.createDiv({
      cls: "op-dashboard-radio",
    });
    const radioName = "op-dashboard-target";
    const renderRadio = (value: DashboardTargetType, label: string): void => {
      const wrap = radioWrap.createEl("label", {
        cls: "op-dashboard-radio__option",
      });
      const input = wrap.createEl("input", {
        attr: { type: "radio", name: radioName, value },
      });
      input.checked = s.dashboard.target === value;
      input.addEventListener("change", async () => {
        if (input.checked) {
          s.dashboard.target = value;
          await this.plugin.saveSettings();
        }
      });
      wrap.createSpan({ text: ` ${label}` });
    };
    renderRadio("system-browser", "System browser");
    renderRadio("iterm-browser-tab", "iTerm browser tab");

    // ── Daemon status ──────────────────────────────────────────────────────
    const statusSetting = new Setting(containerEl)
      .setName("Daemon status")
      .setDesc("Live probe of GET /healthz on the configured port.");
    const statusBadge = statusSetting.controlEl.createSpan({
      cls: "op-dashboard-status",
      text: "● probing…",
    });
    // Both refs live up here so the single `refreshStatus()` defined below
    // can flip both `disabled` flags from one probe — closes the race the
    // adversarial review flagged.
    let restartBtn: HTMLButtonElement | null = null;
    let regenBtn: HTMLButtonElement | null = null;
    statusSetting
      .addButton((b) => {
        b.setButtonText("Restart")
          .setTooltip(
            "POST /restart on the daemon — restarts in place if the daemon supports it.",
          )
          .onClick(async () => {
            const token = readDashboardToken(paths.tokenPath);
            try {
              const url = `http://127.0.0.1:${s.dashboard.port}/restart`;
              const res = await fetch(url, {
                method: "POST",
                headers: token ? { "X-Op-Token": token } : {},
              });
              if (!res.ok) {
                notify(`Restart failed (HTTP ${res.status}).`);
              } else {
                notify("Daemon restart requested.");
              }
            } catch {
              notify(
                "Could not reach the daemon — restart iTerm2 to (re)start it.",
              );
            }
            await refreshStatus();
          });
        restartBtn = b.buttonEl;
      })
      .addButton((b) =>
        b
          .setButtonText("Logs")
          .setTooltip(`Reveal ${logPath} in Finder.`)
          .onClick(async () => {
            try {
              await revealDashboardLog(logPath);
            } catch (err) {
              notify(
                `Could not reveal log file: ${(err as Error).message}. Path: ${logPath}`,
              );
            }
          }),
      );

    const refreshStatus = async (): Promise<void> => {
      const token = readDashboardToken(paths.tokenPath);
      const status: DaemonStatus = await probeDaemonStatus(
        s.dashboard.port,
        token,
        { signal: abort.signal },
      );
      // OP-235 review fix #1+#2: bail before any DOM write if the section
      // has been re-rendered or the tab has closed since the probe started.
      // The badge/button references would point at detached elements
      // otherwise, leaking memory and producing stale UI.
      if (abort.signal.aborted) return;
      statusBadge.empty();
      if (status.authError) {
        statusBadge.setText("● running (token mismatch)");
        statusBadge.addClass("op-dashboard-status--warn");
        statusBadge.removeClass("op-dashboard-status--ok");
        statusBadge.removeClass("op-dashboard-status--off");
      } else if (status.running) {
        const uptime =
          typeof status.uptimeSec === "number"
            ? formatUptime(status.uptimeSec)
            : "—";
        const ver = status.version ? ` v${status.version}` : "";
        statusBadge.setText(`● running${ver} · uptime ${uptime}`);
        statusBadge.addClass("op-dashboard-status--ok");
        statusBadge.removeClass("op-dashboard-status--warn");
        statusBadge.removeClass("op-dashboard-status--off");
      } else {
        statusBadge.setText("◯ not running");
        statusBadge.addClass("op-dashboard-status--off");
        statusBadge.removeClass("op-dashboard-status--ok");
        statusBadge.removeClass("op-dashboard-status--warn");
      }
      // Both buttons disable when the daemon is offline since their POST
      // endpoints require it. Updating both from the single probe (rather
      // than firing a second probe further down) closes the race the
      // adversarial review flagged: two concurrent probes returning out of
      // order could leave Restart/Regenerate disagreeing about liveness.
      if (restartBtn) restartBtn.disabled = !status.running;
      if (regenBtn) regenBtn.disabled = !status.running;
    };

    // ── Token ──────────────────────────────────────────────────────────────
    const tokenSetting = new Setting(containerEl)
      .setName("Token")
      .setDesc(
        "Read from the daemon-managed 0600 token file. Regenerate writes a new token via the daemon (invalidates open dashboards with WS close code 4401). Copy URL puts the full http://127.0.0.1:<port>?token=… into the clipboard.",
      );
    const tokenInput = tokenSetting.controlEl.createEl("input", {
      cls: "op-dashboard-token",
      attr: { type: "password", readonly: "readonly", spellcheck: "false" },
    });
    const refreshToken = (): void => {
      const tok = readDashboardToken(paths.tokenPath);
      tokenInput.value = tok ?? "";
      tokenInput.placeholder = tok ? "" : "(daemon not yet started)";
    };
    tokenSetting
      .addButton((b) => {
        b.setButtonText("Regenerate")
          .setTooltip("POST /regenerate-token — invalidates open dashboards.")
          .onClick(async () => {
            const token = readDashboardToken(paths.tokenPath);
            try {
              const url = `http://127.0.0.1:${s.dashboard.port}/regenerate-token`;
              const res = await fetch(url, {
                method: "POST",
                headers: token ? { "X-Op-Token": token } : {},
              });
              if (!res.ok) {
                notify(`Regenerate failed (HTTP ${res.status}).`);
              } else {
                notify(
                  "Token regenerated. Open dashboards have been invalidated.",
                );
              }
            } catch {
              notify("Could not reach the daemon to regenerate the token.");
            }
            refreshToken();
          });
        regenBtn = b.buttonEl;
      })
      .addButton((b) =>
        b
          .setButtonText("Copy URL")
          .setTooltip("Copy the dashboard URL (with token) to the clipboard.")
          .onClick(async () => {
            const tok = readDashboardToken(paths.tokenPath);
            const url = tok
              ? buildDashboardUrl(s.dashboard.port, tok)
              : `http://127.0.0.1:${s.dashboard.port}/`;
            try {
              await navigator.clipboard.writeText(url);
              notify(
                tok
                  ? "Dashboard URL copied to clipboard."
                  : "URL copied — but no token is available yet (daemon not started).",
              );
            } catch {
              notify(`Clipboard write failed. URL: ${url}`);
            }
          }),
      );
    refreshToken();
    // OP-235 review fix #2: a single initial probe drives both Restart and
    // Regenerate's `disabled` flag through `refreshStatus()`. Earlier drafts
    // fired a second `probeDaemonStatus` here, which raced against the
    // status badge's probe and could leave the two controls disagreeing
    // about liveness.
    void refreshStatus();

    // ── Install daemon ─────────────────────────────────────────────────────
    new Setting(containerEl)
      .setName("Install daemon")
      .setDesc(
        "Install the bundled `op-dashboard.py` plus its `client/index.html` sibling into ~/Library/Application Support/iTerm2/Scripts/AutoLaunch/, then install `aiohttp` into iTerm's bundled Python runtime. Same install path as OP-232's Setup modal. Restart iTerm2 after install/upgrade.",
      )
      .addButton((b) =>
        b
          .setButtonText("Install / upgrade")
          .setCta()
          .onClick(async () => {
            // OP-242: pass vault data.json so the daemon's surface
            // enrichment (model / workdir / started_at) wakes up on
            // first install instead of staying empty until the env var
            // is set by hand.
            const vaultBasePath = dashboardVaultBasePathFromApp(this.app);
            const result = installDashboardDaemon(
              BUNDLED_DASHBOARD_ASSETS,
              paths.daemonPath,
              vaultBasePath
                ? { vaultDataPaths: [dashboardPluginDataJsonPath(vaultBasePath)] }
                : undefined,
            );
            if (!result.ok) {
              notify(
                `Install failed: ${result.reason ?? "unknown error"}. Source: ${BUNDLED_DASHBOARD_ASSETS.sourceLabel}.`,
              );
              await refreshStatus();
              return;
            }
            const deps = await installDashboardDependencies(os.homedir());
            if (deps.ok) {
              notify(
                `Installed daemon/client assets to ${paths.autoLaunchDir} and aiohttp into ${deps.runtimesInstalled} iTerm runtime${deps.runtimesInstalled === 1 ? "" : "s"}. Restart iTerm2 to launch it.`,
              );
            } else {
              notify(
                `Installed daemon assets, but couldn't install aiohttp into iTerm's bundled Python runtime: ${deps.reason}`,
              );
            }
            await refreshStatus();
          }),
      );
  }

  /**
   * OP-261 (Phase 4 of OP-218): opt-in vault-git auto-commit + flush helper.
   * Both toggles default to off and are orthogonal to OP-Test seed reset
   * (vault git lives in the user's own vault, not the OP-Test scratch repo).
   */
  private renderVaultGit(containerEl: HTMLElement): void {
    const s = this.plugin.settings;
    new Setting(containerEl)
      .setName("Auto-commit every op-* mutation to vault git")
      .setDesc(
        "When the vault is a git repo, commit each successful op-* mutation as a single commit (`<cmd>: <id> · <subject>`). Failures are logged silently — vault git failures never block the op-* response. Skipped silently when the vault is not a git repo.",
      )
      .addToggle((t) =>
        t.setValue(s.vaultGit.autoCommit).onChange(async (v) => {
          s.vaultGit.autoCommit = v;
          // Reset the init-offered bit so toggling auto-commit on a fresh
          // session re-prompts the init offer when applicable.
          if (v) s.vaultGitInitOffered = false;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("Offer to git-init the vault on next startup")
      .setDesc(
        "When auto-commit is on AND the vault is not a git repo, surface a Notice on next startup offering to `git init` it with a sensible `.gitignore` (.obsidian/workspace*, Projects/_scratch/, *.tmp). One-shot — dismiss to silence.",
      )
      .addToggle((t) =>
        t.setValue(s.vaultGit.initOnEnable).onChange(async (v) => {
          s.vaultGit.initOnEnable = v;
          if (v) s.vaultGitInitOffered = false;
          await this.plugin.saveSettings();
        }),
      );

    const help = containerEl.createEl("p", { cls: "setting-item-description" });
    help.setText(
      "Squash a noisy run of per-call commits via the `op-flush-vault-history issue=<ID>` CLI/URI command. See schema.md → Audit log → Vault git for the full opt-in story.",
    );
  }

  private renderDeveloper(containerEl: HTMLElement): void {
    const s = this.plugin.settings;
    new Setting(containerEl)
      .setName("Show developer commands in palette")
      .setDesc(
        "Show op-dev:* debugging commands (dump-store, rebuild-store, install-agent-hooks, debug agent launch) in the command palette. Reload the plugin after changing — Obsidian only registers commands at plugin load.",
      )
      .addToggle((t) =>
        t.setValue(s.developer.showDevCommands).onChange(async (v) => {
          s.developer.showDevCommands = v;
          await this.plugin.saveSettings();
          notify(
            "Reload the plugin to apply — Settings → Community plugins → op-obsidian → toggle off then on.",
            8000,
          );
        }),
      );
  }

  private renderGlossary(containerEl: HTMLElement): void {
    // Native <details> is fine here — no drag targets inside, just text.
    const glossary = containerEl.createEl("details", { cls: "op-glossary" });
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
      "Per-agent JSON patch merged on top of the built-in agent profile. Keys: `binary`, `launchFlags` (string[]), `promptPreamble`, `skillTrigger`, `label`, `postLaunchCommands` / mode-specific variants (string[]), and `postLaunchReadinessRegex`. Unknown keys are flagged but saved.",
    );
    addTerm(
      "Working directory",
      "Absolute path to the code repo an agent is launched into. Resolved in order: the issue's project `repo_path:` frontmatter, then the slug → path map below, then an interactive modal prompt.",
    );
    addTerm(
      "Worktree enforcement",
      "An opt-in PreToolUse hook that blocks Edit/Write on the main checkout for op-launched agents. Verified on Claude Code; the Gemini install path is best-effort and untested. Copilot CLI has no PreToolUse surface and is not gated. Agents must `git worktree add` or export `OP_ALLOW_MAIN_EDIT=1` to override.",
    );
  }

  // ─── Utilities ──────────────────────────────────────────────────────────

  /** Trailing-edge debounce — overwrites the timer for `key`. */
  private debounce(key: string, ms: number, fn: () => void): void {
    const existing = this.debounceTimers.get(key);
    if (existing !== undefined) window.clearTimeout(existing);
    const handle = window.setTimeout(() => {
      this.debounceTimers.delete(key);
      fn();
    }, ms);
    this.debounceTimers.set(key, handle);
  }

  private async applyProjectsRootChange(oldRoot: string, newRoot: string): Promise<void> {
    if (oldRoot === newRoot) return;
    const oldEntry = this.app.vault.getAbstractFileByPath(oldRoot);
    const targetExists = !!this.app.vault.getAbstractFileByPath(newRoot);

    let moved = false;
    if (oldEntry) {
      const canMove = !targetExists && !isNestedVaultPath(oldRoot, newRoot);
      const action = await promptProjectsRootMigration(this.app, {
        oldRoot,
        newRoot,
        canMove,
        targetExists,
      });
      if (action === "cancel") return;
      if (action === "move") {
        await ensureVaultFolder(this.app, parentVaultPath(newRoot));
        await this.app.fileManager.renameFile(oldEntry, newRoot);
        moved = true;
      }
    }

    this.plugin.settings.projectsRoot = newRoot;
    await this.plugin.saveSettings();
    this.plugin.store.rebuild();
    await this.plugin.reinstallAgentHooks();
    this.rerenderSection("onboarding");
    this.rerenderSection("workingDirs");
    this.rerenderSection("workflows");

    if (moved) {
      notify(`op: moved ${oldRoot} → ${newRoot}`);
      return;
    }
    if (oldEntry) {
      notify(`op: Projects path set to ${newRoot}. Existing notes remain under ${oldRoot} until you move them.`);
      return;
    }
    notify(`op: Projects path set to ${newRoot}`);
  }
}

// ─── Helpers (module-scoped) ──────────────────────────────────────────────

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

function detectionSummary(plugin: OpPlugin): string {
  const d = plugin.detector.get();
  if (!d) return "Not probed yet. Click Re-probe to run detection.";
  return AGENT_IDS.map((id) => `${id}: ${d[id].installed ? d[id].path ?? "found" : "not found"}`).join(" · ");
}

type ProjectsRootMigrationAction = "move" | "switch" | "cancel";

function promptProjectsRootMigration(
  app: App,
  args: { oldRoot: string; newRoot: string; canMove: boolean; targetExists: boolean },
): Promise<ProjectsRootMigrationAction> {
  return new Promise((resolve) => {
    new ProjectsRootMigrationModal(app, args, resolve).open();
  });
}

function parentVaultPath(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? "" : path.slice(0, idx);
}

async function ensureVaultFolder(app: App, path: string): Promise<void> {
  if (!path) return;
  const parts = path.split("/");
  let cumulative = "";
  for (const part of parts) {
    if (!part) continue;
    cumulative = cumulative ? `${cumulative}/${part}` : part;
    if (!app.vault.getAbstractFileByPath(cumulative)) {
      await app.vault.createFolder(cumulative);
    }
  }
}

function isNestedVaultPath(a: string, b: string): boolean {
  return a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
}

/**
 * Render an inline "What is this?" expandable directly under a section
 * header. JS-controlled (not native <details>) so the click target sits
 * adjacent to the section title and there's no nesting-of-details
 * accessibility hazard. Body is a single string — keep it short (1–2
 * sentences); the long-form glossary at the bottom of the tab is the
 * authoritative reference.
 *
 * Keyboard-accessible: head has `role="button"` / `tabindex="0"` and
 * responds to Enter and Space, matching the ARIA Button pattern.
 */
/**
 * Render a small "?" icon link that opens the relevant doc anchor on
 * GitHub in a new tab. Used to wire OP-215 in-product help links from
 * settings sections to `docs/workflow-modules/`. The link's (file,
 * anchor) target lives in the central `docLinks.ts` registry — the
 * `docLinks.test.ts` CI guard asserts every anchor exists in the doc
 * tree, so a doc rename surfaces as a unit-test failure here.
 */
function addDocLink(parentEl: HTMLElement, sectionId: DocLinkSectionId): void {
  const target = sectionDocAnchor(sectionId);
  const link = parentEl.createEl("a", {
    cls: "op-doc-link",
    text: "?",
    href: docUrl(target),
  });
  link.setAttribute("target", "_blank");
  link.setAttribute("rel", "noopener");
  link.setAttribute("aria-label", `Open the docs for this section`);
  link.setAttribute("title", "Open the docs for this section ↗");
  // Prevent the click from bubbling to a parent role=button (e.g. a
  // collapsible header) and toggling the collapsible as a side-effect.
  link.addEventListener("click", (e) => e.stopPropagation());
}

function addHelpExpandable(parentEl: HTMLElement, title: string, body: string): void {
  const wrap = parentEl.createDiv({ cls: "op-help-expandable" });
  const head = wrap.createDiv({ cls: "op-help-expandable__head" });
  head.setAttribute("role", "button");
  head.setAttribute("tabindex", "0");
  head.setAttribute("aria-expanded", "false");
  head.createSpan({ text: "›", cls: "op-help-expandable__caret" });
  head.createSpan({ text: title, cls: "op-help-expandable__title" });
  // Body visibility is CSS-driven (.op-help-expandable.is-open > .op-help-expandable__body),
  // consistent with OpCollapsible — no inline display manipulation needed.
  wrap.createDiv({
    cls: "op-help-expandable__body setting-item-description",
    text: body,
  });
  const toggle = (): void => {
    const open = wrap.classList.toggle("is-open");
    head.setAttribute("aria-expanded", String(open));
  };
  head.addEventListener("click", toggle);
  head.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  });
}

// ─── OpCollapsible ────────────────────────────────────────────────────────

interface OpCollapsibleOpts {
  startOpen?: boolean;
  /** Predicate consulted before collapsing. Drag-in-progress returns false
   * so collapsing during a drop doesn't zero out child rects. */
  canCollapse?: () => boolean;
}

/**
 * JS-controlled collapsible wrapper. NOT a native <details> — inside a
 * closed <details>, getBoundingClientRect() on rendered children returns
 * all-zeros, which breaks the project-order drag-reorder logic. This
 * primitive uses only a CSS class (`is-open`) to control visibility so
 * child rects remain valid the moment the body is visible, and refuses to
 * collapse mid-drag via `canCollapse`.
 *
 * Keyboard-accessible: header has `role="button"` / `tabindex="0"` and
 * responds to Enter and Space, matching the ARIA Button pattern.
 */
export class OpCollapsible {
  readonly root: HTMLElement;
  readonly header: HTMLElement;
  readonly body: HTMLElement;
  private opts: OpCollapsibleOpts;

  constructor(parentEl: HTMLElement, title: string, opts: OpCollapsibleOpts = {}) {
    this.opts = opts;
    this.root = parentEl.createDiv({ cls: "op-collapsible" });
    this.header = this.root.createDiv({ cls: "op-collapsible__header" });
    this.header.setAttribute("role", "button");
    this.header.setAttribute("tabindex", "0");
    this.header.createSpan({ cls: "op-collapsible__caret", text: "›" });
    this.header.createSpan({ cls: "op-collapsible__title", text: title });
    this.body = this.root.createDiv({ cls: "op-collapsible__body" });
    this.setOpen(opts.startOpen === true);

    const toggle = (): void => {
      if (this.isOpen()) {
        if (opts.canCollapse && !opts.canCollapse()) return;
        this.setOpen(false);
      } else {
        this.setOpen(true);
      }
    };
    this.header.addEventListener("click", toggle);
    this.header.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    });
  }

  isOpen(): boolean {
    return this.root.classList.contains("is-open");
  }

  setOpen(open: boolean): void {
    this.root.classList.toggle("is-open", open);
    // aria-expanded lives on the header (the interactive element).
    this.header.setAttribute("aria-expanded", String(open));
  }
}

// ─── Hotkey preset results modal (preserved verbatim) ─────────────────────

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

class ProjectsRootMigrationModal extends Modal {
  constructor(
    app: App,
    private args: { oldRoot: string; newRoot: string; canMove: boolean; targetExists: boolean },
    private done: (action: ProjectsRootMigrationAction) => void,
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl, titleEl } = this;
    titleEl.setText("Change Projects path");
    contentEl.createEl("p", { text: `Current path: ${this.args.oldRoot}` });
    contentEl.createEl("p", { text: `New path: ${this.args.newRoot}` });

    if (this.args.canMove) {
      contentEl.createEl("p", {
        text: "Move the existing tree to keep issues, modules, scratch files, and onboarding notes working without any manual follow-up.",
      });
    } else if (this.args.targetExists) {
      contentEl.createEl("p", {
        text: "The target path already exists, so op-obsidian will not auto-move the current tree into it. You can switch the setting now and merge or move files manually afterward.",
      });
    } else {
      contentEl.createEl("p", {
        text: "The new path is nested under the current one (or vice versa), so auto-move is disabled to avoid moving a folder into itself. You can still switch the setting and move files manually afterward.",
      });
    }

    const buttons = new Setting(contentEl);
    buttons.addButton((b) =>
      b.setButtonText("Cancel").onClick(() => {
        this.done("cancel");
        this.close();
      }),
    );
    buttons.addButton((b) =>
      b.setButtonText("Switch only").onClick(() => {
        this.done("switch");
        this.close();
      }),
    );
    if (this.args.canMove) {
      buttons.addButton((b) =>
        b.setButtonText("Move existing tree").setCta().onClick(() => {
          this.done("move");
          this.close();
        }),
      );
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

// ─── Workflow helpers + Explain modal (OP-201) ────────────────────────────

interface SeverityCounts {
  error: number;
  warning: number;
  info: number;
}

function countsBySeverity(ds: readonly WorkflowDiagnostic[]): SeverityCounts {
  const out: SeverityCounts = { error: 0, warning: 0, info: 0 };
  for (const d of ds) out[d.severity] += 1;
  return out;
}

function appendBadge(
  parentEl: HTMLElement,
  severity: WorkflowDiagnostic["severity"],
  count: number,
): void {
  parentEl.createSpan({
    cls: `op-workflow-badge op-workflow-badge--${severity}`,
    text: `${count} ${severity}${count === 1 ? "" : "s"}`,
  });
}

/**
 * Wait for `metadataCache` to fire its batch-`resolved` event (signalling
 * the cache has caught up with newly-created files), or for a timeout
 * fallback — whichever comes first. Without this, a render that follows a
 * `vault.create` can miss files whose frontmatter hasn't been parsed yet
 * (the file is in `getMarkdownFiles()` but `getFileCache(file).frontmatter`
 * is still null). The timeout is the floor: if the cache was already
 * resolved before we registered the listener, we still rerender promptly.
 */
async function waitForCacheSettle(app: App, timeoutMs: number): Promise<void> {
  await new Promise<void>((resolve) => {
    let done = false;
    const settle = (): void => {
      if (done) return;
      done = true;
      app.metadataCache.offref(ref);
      window.clearTimeout(handle);
      resolve();
    };
    // The 'resolved' event fires after the cache has finished indexing the
    // current batch of changes — exactly the signal we need.
    const ref = app.metadataCache.on("resolved", settle);
    const handle = window.setTimeout(settle, timeoutMs);
  });
}

/**
 * Modal that prints every diagnostic for a single workflow module through
 * the unified `diagnosticToBlock` formatter. Renders the same shape every
 * other 3* surface will (op-explain-workflow CLI / dry-run banner / launch
 * pre-flight) — this in-Settings version is the proof the formatter
 * contract is end-to-end usable before the CLI ships in OP-203.
 */
export class WorkflowExplainModal extends Modal {
  constructor(
    app: App,
    private module: WorkflowModule,
    private diagnostics: readonly WorkflowDiagnostic[],
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("op-workflow-explain");

    contentEl.createEl("h2", { text: this.module.title });
    const subtitle = contentEl.createEl("p", {
      cls: "setting-item-description",
    });
    subtitle.appendText(`id: ${this.module.id} · scope: ${this.module.scope} · `);
    subtitle.appendText(
      this.module.source.kind === "global"
        ? `global (${this.module.source.path})`
        : `project ${this.module.source.projectSlug} (${this.module.source.path})`,
    );

    if (this.diagnostics.length === 0) {
      contentEl.createEl("p", {
        text: "No diagnostics. This module loaded clean.",
      });
    } else {
      const list = contentEl.createDiv({ cls: "op-workflow-explain__list" });
      for (const d of this.diagnostics) {
        const block = list.createEl("pre", {
          cls: `op-workflow-explain__block op-workflow-explain__block--${d.severity}`,
          text: diagnosticToBlock(d),
        });
        block.dataset.code = d.code;
      }
    }

    if (this.module.vars.length) {
      contentEl.createEl("h3", { text: "Declared variables" });
      const vars = contentEl.createDiv({ cls: "op-workflow-explain__vars" });
      for (const v of this.module.vars) {
        const row = vars.createDiv({ cls: "op-workflow-explain__var" });
        row.createSpan({ text: `{{${v.name}}}` });
        switch (v.kind) {
          case "bare":
            row.createSpan({
              cls: "setting-item-description",
              text: " — no default; satisfied at a higher precedence scope (Project default or Launch override).",
            });
            break;
          case "default":
            row.createSpan({
              cls: "setting-item-description",
              text: ` — Module default = ${JSON.stringify(v.value)}.`,
            });
            break;
          case "object":
            if (v.description) {
              row.createSpan({
                cls: "setting-item-description",
                text: ` — ${v.description}`,
              });
            }
            if (v.default !== undefined) {
              row.createSpan({
                cls: "setting-item-description",
                text: ` Module default = ${JSON.stringify(v.default)}.`,
              });
            }
            break;
        }
      }
    }

    new Setting(contentEl).addButton((b) =>
      b.setButtonText("Close").onClick(() => this.close()),
    );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

// `FormattedDiagnostic` is imported above so callers in this module that
// need the shape can refer to it directly. Re-export here to keep the
// module's public surface flat for downstream consumers.
export type { FormattedDiagnostic };
