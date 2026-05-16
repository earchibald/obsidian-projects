import { App, Modal, Setting } from "obsidian";
import type { IssueEntry } from "./types";
import type { OpSettings } from "./settings";
import { notify } from "./notificationLog";
import {
  AGENT_IDS,
  type AgentId,
  type AgentLaunchMode,
  modeToWorkflowStep,
} from "./agentProfiles";
import { resolveProfile } from "./openAgent";
import { loadAndComposeWorkflow } from "./composeWorkflow";
import type { ComposedPrompt } from "./composeWorkflowPure";
import { buildIssueRenderContext, readProjectVars } from "./explainWorkflow";
import {
  refreshAgentDetection,
  type AgentDetector,
  type DetectionMap,
} from "./agentDetect";
import { IssuePickerModal } from "./modals";

// OP-206 (3f): Settings → Workflows group → "Preview composed prompt" entry.
// A read-only modal that renders the FULLY COMPOSED prompt for a chosen
// (issue, mode, agent) tuple — exactly the string the launcher would pass to
// the agent. Toggling any picker re-runs `loadAndComposeWorkflow`, so the
// author can sweep combinations without leaving the modal.
//
// "Preview ≡ reality": both this surface and the LaunchAgentModal preview
// disclosure call `loadAndComposeWorkflow`, the same IO seam the launch path
// uses (`promptBuild.composeWorkflowSection` → `loadAndComposeWorkflow`).

const ALL_MODES: AgentLaunchMode[] = [
  "evaluate",
  "plan",
  "implement",
  "review",
  "finalize",
  "work",
];

export interface PreviewWorkflowModalArgs {
  /** Issues to choose from — drives the issue picker. */
  issues: IssueEntry[];
  /** Initial issue id to focus. When omitted, defaults to the first issue. */
  initialIssueId?: string;
  /** Agent detector — only installed agents land in the agent dropdown. */
  detector: AgentDetector;
  /** Vault settings — feeds the composer's globalVars + repo_path resolution. */
  settings: OpSettings;
}

export class PreviewWorkflowModal extends Modal {
  private currentIssue: IssueEntry;
  private agentId: AgentId;
  private detection: DetectionMap | undefined;
  private mode: AgentLaunchMode = "implement";
  private composed: ComposedPrompt | null = null;
  private composing = false;

  // DOM handles re-painted on each picker change.
  private headerEl?: HTMLElement;
  private summaryEl?: HTMLElement;
  private hintEl?: HTMLElement;
  private preEl?: HTMLPreElement;

  constructor(
    app: App,
    private readonly args: PreviewWorkflowModalArgs,
  ) {
    super(app);
    if (args.issues.length === 0) {
      throw new Error("PreviewWorkflowModal: at least one issue is required");
    }
    const initial =
      args.issues.find((e) => e.id === args.initialIssueId) ?? args.issues[0];
    this.currentIssue = initial;
    this.detection = args.detector.get();
    this.agentId = pickAvailableAgent(undefined, installedAgents(this.detection), args.settings.defaultAgent);
  }

  async onOpen(): Promise<void> {
    const { contentEl, titleEl } = this;
    titleEl.setText("Preview composed prompt");
    contentEl.addClass("op-preview-modal");
    await this.refreshDetection();

    // Issue picker — opens a sub-modal because the issue list can be long.
    const issueRow = new Setting(contentEl).setName("Issue");
    this.headerEl = issueRow.descEl;
    this.refreshIssueDesc();
    issueRow.addButton((b) =>
      b.setButtonText("Pick issue").onClick(() => {
        new IssuePickerModal(this.app, this.args.issues, async (entry) => {
          this.currentIssue = entry;
          this.refreshIssueDesc();
          await this.recompose();
        }).open();
      }),
    );

    // Mode picker.
    new Setting(contentEl)
      .setName("Mode")
      .setDesc("Workflow step the launcher would compose for this mode.")
      .addDropdown((d) => {
        for (const m of ALL_MODES) d.addOption(m, m);
        d.setValue(this.mode).onChange(async (v) => {
          this.mode = v as AgentLaunchMode;
          await this.recompose();
        });
      });

    // Agent picker — only installed agents.
    const installed = installedAgents(this.detection);
    if (installed.length > 0) {
      new Setting(contentEl)
        .setName("Agent")
        .setDesc("Agent profile drives `{{agent}}` and per-agent prompt customization.")
        .addDropdown((d) => {
          for (const id of installed) d.addOption(id, id);
          d.setValue(this.agentId).onChange(async (v) => {
            this.agentId = v as AgentId;
            await this.recompose();
          });
        });
    } else {
      contentEl.createDiv({
        cls: "op-preview-modal__hint",
        text: "No agent binaries detected on PATH — agent-specific tokens will render against the default profile.",
      });
    }

    // Summary line + preview block + actions.
    this.summaryEl = contentEl.createDiv({ cls: "op-preview-modal__summary" });
    this.hintEl = contentEl.createDiv({ cls: "op-preview-modal__hint" });
    this.preEl = contentEl.createEl("pre", { cls: "op-preview-modal__text" });

    new Setting(contentEl)
      .addButton((b) =>
        b.setButtonText("Copy to clipboard").onClick(async () => {
          const text = this.composed?.text ?? "";
          const ok = await copyToClipboard(text);
          notify(ok ? "Composed prompt copied to clipboard" : "Copy failed — clipboard unavailable");
        }),
      )
      .addButton((b) => b.setButtonText("Close").setCta().onClick(() => this.close()));

    await this.recompose();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private refreshIssueDesc(): void {
    if (!this.headerEl) return;
    this.headerEl.setText(`${this.currentIssue.id} — ${this.currentIssue.title} (${this.currentIssue.project})`);
  }

  private async refreshDetection(): Promise<void> {
    try {
      this.detection = await refreshAgentDetection(this.args.detector);
    } catch (err) {
      console.warn("[op-obsidian] preview modal agent refresh failed", err);
      this.detection = this.args.detector.get();
    }
    this.agentId = pickAvailableAgent(
      this.agentId,
      installedAgents(this.detection),
      this.args.settings.defaultAgent,
    );
  }

  private async recompose(): Promise<void> {
    if (this.composing) return;
    this.composing = true;
    try {
      const profile = resolveProfile(this.args.settings, this.agentId);
      const renderContext = buildIssueRenderContext(
        this.app,
        this.args.settings,
        this.currentIssue,
        profile,
        modeToWorkflowStep(this.mode),
      );
      const projectVars = readProjectVars(this.app, this.currentIssue.project);
      const ctx = {
        render: renderContext,
        globalVars: this.args.settings.workflowVars ?? {},
        projectVars,
        launchVars: {},
        maxWorkflowChars: this.args.settings.injection.maxWorkflowChars,
      };
      const requestedStep = modeToWorkflowStep(this.mode);
      let { composed, bundle } = await loadAndComposeWorkflow(this.app, {
        project: this.currentIssue.project,
        step: requestedStep,
        ctx,
      });
      // Mirror the launcher's lenient kickoff fallback (promptBuild.ts
      // `composeWorkflowSection`): if the requested step isn't declared by
      // the workflow file, fall back to `kickoff` so the preview matches
      // what the launcher would actually produce. Without this the preview
      // for an `implement` mode against a kickoff-only workflow would be
      // misleadingly empty even though the real launch composes fine.
      if (
        bundle.workflow &&
        requestedStep !== "kickoff" &&
        !bundle.workflow.steps.some((s) => s.step === requestedStep)
      ) {
        const fallback = await loadAndComposeWorkflow(this.app, {
          project: this.currentIssue.project,
          step: "kickoff",
          ctx,
        });
        composed = fallback.composed;
        bundle = fallback.bundle;
      }
      // Surface bundle diagnostics alongside composer diagnostics — same
      // pattern `loadAndComposeWorkflow` already applies internally for the
      // composed-success path, but we want to count loader diagnostics in
      // the no-composed path too.
      this.composed = composed
        ? composed
        : {
            text: "",
            orderedChunks: [],
            lazySkills: [],
            perVarSourceMap: {},
            sizeChars: 0,
            diagnostics: bundle.diagnostics,
          };
    } catch (err) {
      console.warn("[op-obsidian] preview modal compose failed", err);
      this.composed = null;
    } finally {
      this.composing = false;
      this.repaint();
    }
  }

  private repaint(): void {
    const text = this.composed?.text ?? "";
    const sizeChars = this.composed?.sizeChars ?? 0;
    const diagnosticCount = this.composed?.diagnostics.length ?? 0;
    if (this.preEl) this.preEl.setText(text);
    if (this.summaryEl) {
      const summary =
        text.length > 0
          ? formatPreviewSummary(sizeChars, diagnosticCount)
          : "(no composed prompt — workflow file or modules missing for this project)";
      this.summaryEl.setText(summary);
    }
    if (this.hintEl) {
      this.hintEl.setText(
        text.length > 0
          ? ""
          : "Tip: pick an issue whose project has a WORKFLOW.md and modules. The Settings → Workflows group surfaces every loaded module.",
      );
    }
  }
}

function formatPreviewSummary(sizeChars: number, diagnosticCount: number): string {
  const charLabel =
    sizeChars >= 1000
      ? `${(sizeChars / 1000).toFixed(1)}k chars`
      : `${sizeChars} chars`;
  const diagLabel = `${diagnosticCount} diagnostic${diagnosticCount === 1 ? "" : "s"}`;
  return `${charLabel} · ${diagLabel}`;
}

function installedAgents(detection: DetectionMap | undefined): AgentId[] {
  return AGENT_IDS.filter((id) => detection?.[id]?.installed);
}

function pickAvailableAgent(
  current: AgentId | undefined,
  installed: AgentId[],
  defaultAgent: AgentId,
): AgentId {
  if (current && installed.includes(current)) return current;
  if (installed.includes(defaultAgent)) return defaultAgent;
  return installed[0] ?? defaultAgent;
}

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
