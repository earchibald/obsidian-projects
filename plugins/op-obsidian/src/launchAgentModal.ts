import { App, Modal, Setting } from "obsidian";
import type { AgentId } from "./agentProfiles";
import { AGENT_IDS } from "./agentProfiles";
import { notify } from "./notificationLog";
import {
  composeWorkflowPure,
  loadAndComposeWorkflow,
  type LoadedModule,
} from "./composeWorkflow";
import type { ComposedPrompt } from "./composeWorkflowPure";
import type { WorkflowFile } from "./workflowFilePure";
import type { OpSettings } from "./settings";
import {
  buildPanelRows,
  clearLaunchOverride,
  mergeLaunchOverride,
  type PanelRow,
} from "./varOverridePanelPure";
import { precedenceScopeAbbrev, precedenceScopeLabel } from "./workflowDiagnosticFormat";
import { bumpSessionLaunchCount } from "./previewAutoExpand";
import { shouldAutoExpand } from "./previewAutoExpandPure";

// OP-204 (3d): launch-modal IO seam. Wraps the agent picker AND the folded
// "Workflow variables" disclosure on a single Obsidian Modal. The pure data
// (`varOverridePanelPure.buildPanelRows`) drives row rendering; this module
// owns DOM writes, state management, and the final `{ agentId, launchVars }`
// payload that `doOpenAgent` plumbs into `openAgent`.
//
// Surfaces that currently route through here: the `op-open-agent-pick`
// palette command, the sidebar shift-click affordance, and any future
// "with vars…" entry point. The silent default-agent path stays silent —
// users explicitly opt into the modal for the vars surface.

export interface LaunchAgentModalArgs {
  /** Project slug — used to load modules and resolve the workflow. */
  project: string;
  /** Agents installed on this machine — populates the dropdown. */
  installed: AgentId[];
  /** Default agent to preselect. */
  defaultAgent: AgentId;
  /** Vault settings — `workflowMode` decides whether modules even apply. */
  settings: OpSettings;
  /** Existing launch overrides (e.g. carried from `fm.launch_vars`). */
  initialLaunchVars?: Record<string, string>;
  /** Whether the panel should expand on open (e.g. URI passed `expand=1`). */
  startExpanded?: boolean;
  /** OP-206 (3f): persist `previewAutoExpandDismissed` toggle changes. */
  saveSettings?: () => Promise<void>;
}

export interface LaunchAgentModalResult {
  agentId: AgentId;
  launchVars: Record<string, string>;
}

/**
 * Open the launch modal and resolve with `{ agentId, launchVars }` when the
 * user clicks Launch (or hits Enter), or `undefined` if they cancel.
 *
 * Always renders even when only one agent is installed — the panel is the
 * point of the modal. Callers that want the legacy zero-friction launch
 * (silent on the default-agent path) should not invoke this at all.
 */
export function openLaunchAgentModal(
  app: App,
  args: LaunchAgentModalArgs,
): Promise<LaunchAgentModalResult | undefined> {
  return new Promise((resolve) => {
    const modal = new LaunchAgentModal(app, args, (result) => resolve(result));
    modal.open();
  });
}

class LaunchAgentModal extends Modal {
  private agentId: AgentId;
  private launchVars: Record<string, string>;
  private rows: PanelRow[] = [];
  private referencedNames: Set<string> = new Set();
  private loadedModules: LoadedModule[] = [];
  private composed: ComposedPrompt | null = null;
  private workflowFile: WorkflowFile | null = null;
  private renderContextCache: import("./pluginVarRegistry").RenderContext = emptyRenderContext();
  private expanded: boolean;
  private showAll = false;
  private decided = false;
  // OP-206 (3f): preview disclosure state.
  private previewExpanded: boolean;
  private previewContainer?: HTMLElement;
  private previewTextEl?: HTMLElement;
  private previewSummaryCountEl?: HTMLElement;

  // DOM handles re-used by the re-render path so the modal feels reactive
  // without re-creating the entire content element on every keystroke.
  private panelContainer?: HTMLElement;
  private summaryEl?: HTMLElement;

  constructor(
    app: App,
    private readonly args: LaunchAgentModalArgs,
    private readonly done: (r: LaunchAgentModalResult | undefined) => void,
  ) {
    super(app);
    this.agentId = args.installed.includes(args.defaultAgent)
      ? args.defaultAgent
      : args.installed[0] ?? AGENT_IDS[0];
    this.launchVars = { ...(args.initialLaunchVars ?? {}) };
    this.expanded = args.startExpanded ?? Object.keys(this.launchVars).length > 0;
    // OP-206 (3f): preview starts collapsed; the auto-expand decision is made
    // in `onOpen` so the counter only bumps for modals that actually open
    // (construction without `open()` — e.g. an error thrown between
    // `new LaunchAgentModal(...)` and `modal.open()` — won't burn a slot).
    this.previewExpanded = false;
  }

  async onOpen(): Promise<void> {
    const { contentEl, titleEl } = this;
    // OP-206 (3f): bump the session counter now that we know the modal
    // is actually opening, then decide whether the preview should auto-expand.
    const sessionLaunchCount = bumpSessionLaunchCount();
    this.previewExpanded = shouldAutoExpand({
      sessionLaunchCount,
      dismissed: this.args.settings.previewAutoExpandDismissed,
    });
    titleEl.setText("Launch agent");
    contentEl.addClass("op-launch-modal");

    // Agent dropdown — only render when multiple installed; single-agent
    // setups don't benefit from a "pick" widget.
    if (this.args.installed.length > 1) {
      new Setting(contentEl)
        .setName("Agent")
        .setDesc("Choose the agent to launch this issue with.")
        .addDropdown((d) => {
          for (const id of this.args.installed) {
            d.addOption(id, id === this.args.defaultAgent ? `${id} (default)` : id);
          }
          d.setValue(this.agentId).onChange(async (v) => {
            this.agentId = v as AgentId;
            await this.refreshComposed();
            this.renderPanel();
            this.renderPreview();
          });
        });
    }

    // Folded "Workflow variables" disclosure.
    this.panelContainer = contentEl.createDiv({ cls: "op-launch-modal__panel" });

    // Footer buttons.
    new Setting(contentEl)
      .addButton((b) =>
        b.setButtonText("Cancel").onClick(() => {
          this.decided = true;
          this.done(undefined);
          this.close();
        }),
      )
      .addButton((b) =>
        b
          .setButtonText("Launch")
          .setCta()
          .onClick(() => this.submit()),
      );

    // OP-206 (3f): folded-but-visible "Composed prompt preview" disclosure.
    // Mounted *after* the action buttons so the launch action stays at the
    // natural action position while the preview remains immediately
    // discoverable below it.
    this.previewContainer = contentEl.createDiv({ cls: "op-launch-modal__preview" });

    // Initial compose + render. Failures are tolerated — a broken workflow
    // shouldn't block the launch surface.
    await this.refreshComposed();
    this.renderPanel();
    this.renderPreview();

    // Submit-on-Enter when no input is focused (matches Obsidian modal idiom).
    this.scope.register([], "Enter", (evt) => {
      const t = evt.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      this.submit();
    });
  }

  onClose(): void {
    this.contentEl.empty();
    if (!this.decided) this.done(undefined);
  }

  private submit(): void {
    if (this.decided) return;
    this.decided = true;
    this.done({ agentId: this.agentId, launchVars: { ...this.launchVars } });
    this.close();
  }

  private async refreshComposed(): Promise<void> {
    if (this.args.settings.workflowMode !== "modules") {
      this.rows = [];
      this.referencedNames = new Set();
      this.loadedModules = [];
      this.composed = null;
      return;
    }
    try {
      this.renderContextCache = emptyRenderContext();
      const { composed, bundle } = await loadAndComposeWorkflow(this.app, {
        project: this.args.project,
        step: "kickoff",
        ctx: {
          render: this.renderContextCache,
          globalVars: this.args.settings.workflowVars ?? {},
          launchVars: this.launchVars,
        },
      });
      this.loadedModules = bundle.loadedModules;
      this.workflowFile = bundle.workflow;
      this.composed = composed;
      this.referencedNames = new Set(
        composed ? Object.keys(composed.perVarSourceMap) : [],
      );
    } catch (err) {
      console.warn("[op-obsidian] launch modal compose failed", err);
      this.rows = [];
      this.referencedNames = new Set();
      this.composed = null;
      this.workflowFile = null;
    }
    this.rows = buildPanelRows({
      loadedModules: this.loadedModules,
      globalVars: this.args.settings.workflowVars ?? {},
      projectVars: {},
      launchVars: this.launchVars,
      referencedNames: this.referencedNames,
    });
  }

  private renderPanel(): void {
    const root = this.panelContainer;
    if (!root) return;
    root.empty();

    if (this.args.settings.workflowMode !== "modules") {
      root.createDiv({
        cls: "op-launch-modal__hint",
        text: "Workflow modules disabled (Settings → workflowMode = legacy). Launch overrides are inert.",
      });
      return;
    }

    if (this.rows.length === 0) {
      root.createDiv({
        cls: "op-launch-modal__hint",
        text:
          "No workflow variables declared in this project's modules. Nothing to override.",
      });
      return;
    }

    const referencedCount = this.rows.filter((r) => r.isReferenced).length;
    const visibleRows = this.showAll
      ? this.rows
      : this.rows.filter((r) => r.isReferenced || r.hasLaunchOverride);
    const overrideCount = Object.keys(this.launchVars).length;

    // Disclosure header.
    const summary = root.createEl("button", {
      cls: "op-launch-modal__summary",
      attr: { type: "button", "aria-expanded": String(this.expanded) },
    });
    this.summaryEl = summary;
    summary.createSpan({
      cls: "op-launch-modal__summary-icon",
      text: this.expanded ? "▼" : "▶",
    });
    summary.createSpan({
      cls: "op-launch-modal__summary-label",
      text: "Workflow variables",
    });
    summary.createSpan({
      cls: "op-launch-modal__summary-count",
      text:
        overrideCount > 0
          ? `${referencedCount} referenced · ${overrideCount} override${overrideCount === 1 ? "" : "s"}`
          : `${referencedCount} referenced`,
    });
    summary.addEventListener("click", () => {
      this.expanded = !this.expanded;
      this.renderPanel();
    });

    if (!this.expanded) return;

    // Toolbar — show-all toggle.
    const toolbar = root.createDiv({ cls: "op-launch-modal__toolbar" });
    new Setting(toolbar)
      .setName("Show all variables")
      .setDesc(
        this.showAll
          ? "Showing every declared variable, including unused ones."
          : `Showing ${visibleRows.length} referenced or overridden variable${visibleRows.length === 1 ? "" : "s"}.`,
      )
      .addToggle((t) =>
        t.setValue(this.showAll).onChange((v) => {
          this.showAll = v;
          this.renderPanel();
        }),
      );

    if (visibleRows.length === 0) {
      root.createDiv({
        cls: "op-launch-modal__hint",
        text:
          "No referenced variables in the kickoff step. Enable “Show all variables” to surface declared-but-unused entries.",
      });
      return;
    }

    // Rows.
    const list = root.createDiv({ cls: "op-launch-modal__rows" });
    for (const row of visibleRows) {
      this.renderRow(list, row);
    }
  }

  private renderRow(parent: HTMLElement, row: PanelRow): void {
    const wrap = parent.createDiv({ cls: "op-launch-modal__row" });
    if (row.isUnset) wrap.addClass("op-launch-modal__row--unset");
    if (row.hasLaunchOverride) wrap.addClass("op-launch-modal__row--override");

    // Label + badge.
    const labelLine = wrap.createDiv({ cls: "op-launch-modal__row-label" });
    labelLine.createSpan({
      cls: "op-launch-modal__row-name",
      text: `{{vars.${row.name}}}`,
    });
    if (row.currentScopeLabel) {
      const badge = labelLine.createSpan({
        cls: `op-launch-modal__badge op-launch-modal__badge--${row.currentScope}`,
        // Per OP-201 contract: full canonical name in user-visible primary
        // copy; the abbreviation is tooltip-only.
        text: row.currentScopeLabel,
      });
      if (row.currentScopeAbbrev) badge.title = row.currentScopeAbbrev;
    } else {
      labelLine.createSpan({
        cls: "op-launch-modal__badge op-launch-modal__badge--unset",
        text: "Unset",
        attr: { title: "—" },
      });
    }

    if (row.description) {
      wrap.createDiv({
        cls: "op-launch-modal__row-desc",
        text: row.description,
      });
    }

    // Value input.
    const inputRow = wrap.createDiv({ cls: "op-launch-modal__row-input" });
    const initialValue = Object.prototype.hasOwnProperty.call(this.launchVars, row.name)
      ? this.launchVars[row.name]
      : row.currentValue ?? "";
    new Setting(inputRow)
      .setName("Value")
      .addText((t) => {
        t.setValue(initialValue).onChange((v) => {
          this.launchVars = mergeLaunchOverride(this.launchVars, row.name, v);
          // Lightweight refresh: rebuild rows so the badge flips to
          // "Launch override" without forcing another vault re-read.
          this.rebuildRowsLightly();
          // Update only this row's badge in place — full panel re-render
          // would steal focus from the input mid-typing.
          updateRowBadge(wrap, this.findRow(row.name));
          // OP-206 (3f): the preview text reflects the override stack, so
          // recompose against the cached modules + workflow and repaint.
          // Vault is not re-read; this is a pure-fn re-run.
          this.recomposeLightly();
          this.renderPreview();
        });
        t.inputEl.addClass("op-launch-modal__input");
      })
      .addExtraButton((b) =>
        b
          .setIcon("rotate-ccw")
          .setTooltip("Reset to default — clears the Launch override and falls back to the next layer")
          .onClick(() => {
            this.launchVars = clearLaunchOverride(this.launchVars, row.name);
            this.rebuildRowsLightly();
            this.recomposeLightly();
            this.renderPanel();
            this.renderPreview();
          }),
      );
  }

  private rebuildRowsLightly(): void {
    this.rows = buildPanelRows({
      loadedModules: this.loadedModules,
      globalVars: this.args.settings.workflowVars ?? {},
      projectVars: {},
      launchVars: this.launchVars,
      referencedNames: this.referencedNames,
    });
  }

  /**
   * OP-206 (3f): re-run the pure composer against the cached
   * `loadedModules` + `workflowFile` so the preview text reflects the latest
   * `launchVars` without forcing a vault re-read on every keystroke. No-op
   * when the workflow file failed to load (modules-mode disabled or
   * unsalvageable WORKFLOW.md) — the preview falls back to the empty hint
   * already rendered by `renderPreview`.
   */
  private recomposeLightly(): void {
    if (!this.workflowFile) return;
    try {
      this.composed = composeWorkflowPure({
        loadedModules: this.loadedModules,
        workflow: this.workflowFile,
        step: "kickoff",
        ctx: {
          render: this.renderContextCache,
          globalVars: this.args.settings.workflowVars ?? {},
          launchVars: this.launchVars,
        },
      });
    } catch (err) {
      console.warn("[op-obsidian] launch modal light recompose failed", err);
    }
  }

  /**
   * OP-206 (3f): paint the "Composed prompt preview" disclosure. Idempotent —
   * called from onOpen, on agent change, on launchVars edits, on toggle.
   */
  private renderPreview(): void {
    const root = this.previewContainer;
    if (!root) return;
    root.empty();

    if (this.args.settings.workflowMode !== "modules") {
      root.createDiv({
        cls: "op-launch-modal__preview-hint",
        text: "Workflow modules disabled (Settings → workflowMode = legacy). Preview shows the legacy injection blob at launch time.",
      });
      return;
    }

    const text = this.composed?.text ?? "";
    const sizeChars = this.composed?.sizeChars ?? 0;
    const diagnosticCount = this.composed?.diagnostics.length ?? 0;
    // `text` is always a string (the `?? ""` above guarantees it), so `!text`
    // is true both when `composed` is null (no WORKFLOW.md) and when the file
    // loaded but the kickoff step produced zero output. `this.workflowFile`
    // distinguishes the two cases for the user-facing hint below.

    // Disclosure header.
    const summary = root.createEl("button", {
      cls: "op-launch-modal__preview-summary",
      attr: { type: "button", "aria-expanded": String(this.previewExpanded) },
    });
    summary.createSpan({
      cls: "op-launch-modal__preview-icon",
      text: this.previewExpanded ? "▼" : "▶",
    });
    summary.createSpan({
      cls: "op-launch-modal__preview-label",
      text: "Composed prompt preview",
    });
    const countText = formatPreviewSummary(sizeChars, this.loadedModules.length, diagnosticCount);
    this.previewSummaryCountEl = summary.createSpan({
      cls: "op-launch-modal__preview-count",
      text: countText,
    });
    summary.addEventListener("click", () => {
      this.previewExpanded = !this.previewExpanded;
      this.renderPreview();
    });

    if (!this.previewExpanded) return;

    // Show a contextual hint when the preview is empty so the user knows
    // whether to look for a missing WORKFLOW.md or an empty/misconfigured one.
    if (!text) {
      root.createDiv({
        cls: "op-launch-modal__preview-hint",
        text: this.workflowFile
          ? "(no composed prompt — WORKFLOW.md loaded but the kickoff step produced empty output; check module bodies and variable bindings)"
          : "(no composed prompt — no WORKFLOW.md found for this project; create one under Projects/<project>/ to enable prompt composition)",
      });
    }

    const pre = root.createEl("pre", {
      cls: "op-launch-modal__preview-text",
    });
    pre.setText(text);
    this.previewTextEl = pre;

    const actions = root.createDiv({ cls: "op-launch-modal__preview-actions" });
    const copyBtn = actions.createEl("button", {
      cls: "op-launch-modal__preview-copy",
      text: "Copy to clipboard",
      attr: { type: "button" },
    });
    copyBtn.addEventListener("click", async () => {
      const ok = await copyToClipboard(text);
      notify(ok ? "Composed prompt copied to clipboard" : "Copy failed — clipboard unavailable");
    });

    if (!this.args.settings.previewAutoExpandDismissed) {
      const dismiss = actions.createEl("a", {
        cls: "op-launch-modal__preview-dismiss",
        text: "Don't auto-expand by default",
        attr: { href: "#", role: "button" },
      });
      dismiss.addEventListener("click", async (evt) => {
        evt.preventDefault();
        this.args.settings.previewAutoExpandDismissed = true;
        try {
          await this.args.saveSettings?.();
        } catch (err) {
          console.warn("[op-obsidian] preview dismiss save failed", err);
        }
        // Re-render so the dismiss link disappears (already-set state no longer surfaces it).
        this.renderPreview();
      });
    }
  }

  private findRow(name: string): PanelRow | undefined {
    return this.rows.find((r) => r.name === name);
  }
}

function updateRowBadge(wrap: HTMLElement, row: PanelRow | undefined): void {
  if (!row) return;
  const labelLine = wrap.querySelector(".op-launch-modal__row-label");
  if (!labelLine) return;
  const badge = labelLine.querySelector(".op-launch-modal__badge");
  if (!badge) return;
  if (row.currentScope) {
    badge.className = `op-launch-modal__badge op-launch-modal__badge--${row.currentScope}`;
    badge.textContent = precedenceScopeLabel(row.currentScope);
    (badge as HTMLElement).title = precedenceScopeAbbrev(row.currentScope);
  } else {
    badge.className = "op-launch-modal__badge op-launch-modal__badge--unset";
    badge.textContent = "Unset";
    (badge as HTMLElement).title = "—";
  }
  wrap.toggleClass("op-launch-modal__row--override", row.hasLaunchOverride);
  wrap.toggleClass("op-launch-modal__row--unset", row.isUnset);
}

/**
 * OP-206 (3f): one-line "1.2k chars · 4 modules · 0 diagnostics" summary
 * for the preview disclosure header. Pluralizes module/diagnostic counts;
 * abbreviates large char counts to keep the line short.
 */
function formatPreviewSummary(
  sizeChars: number,
  moduleCount: number,
  diagnosticCount: number,
): string {
  const charLabel =
    sizeChars >= 1000
      ? `${(sizeChars / 1000).toFixed(1)}k chars`
      : `${sizeChars} chars`;
  const moduleLabel = `${moduleCount} module${moduleCount === 1 ? "" : "s"}`;
  const diagLabel = `${diagnosticCount} diagnostic${diagnosticCount === 1 ? "" : "s"}`;
  return `${charLabel} · ${moduleLabel} · ${diagLabel}`;
}

/**
 * OP-206 (3f): clipboard write seam. Tries the modern async API and falls
 * back to the deprecated `document.execCommand` path Obsidian's Notice still
 * uses on environments that don't expose `navigator.clipboard`.
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn("[op-obsidian] navigator.clipboard.writeText failed", err);
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch (err) {
    console.warn("[op-obsidian] execCommand copy failed", err);
    return false;
  }
}

/**
 * Empty `RenderContext` for the modal's compose call — we only need
 * `perVarSourceMap` (which depends on user vars, not plugin vars), so missing
 * plugin-var values just emit `missing-var` diagnostics that the panel
 * doesn't surface. The launch itself rebuilds a real context in `buildPrompt`.
 */
function emptyRenderContext(): import("./pluginVarRegistry").RenderContext {
  return {
    id: "",
    title: "",
    project: "",
    status: "open",
    priority: undefined,
    parent: null,
    pr_url: undefined,
    github_issue: undefined,
    repo_path: undefined,
    vault_path: "",
    vault_name: "",
    branch: undefined,
    today: new Date().toISOString().slice(0, 10),
    agent: "claude",
    model: undefined,
    mode: "work",
  };
}
