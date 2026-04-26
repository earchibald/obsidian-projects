// OP-205 (3e) recovery dialog. Replaces the OP-200 stub with an interactive
// modal that lets the user fix a bad-model workflow declaration on the spot.
//
// Two entrypoints:
//
//   - launch mode: the resolver threw `BadModelSpecError` /
//     `NoInstalledAgentError` during a launch. The modal opens with a picker
//     for valid models for the resolved agent. "Use as launch override" wins
//     for this launch only (workflow file untouched). "Patch workflow with
//     this model" rewrites the file (after a unified-diff confirm + a
//     `.bak-<ts>` backup). Cancel aborts the launch — `onResolved` fires with
//     `{ kind: "cancelled" }` and the launch returns `undefined`.
//
//   - advisory mode: the user invoked the palette command for a project
//     whose `validateWorkflowModels` surfaced `bad-model` warnings. Same UI,
//     but cancel is just a close (no launch to abort) and the launch-override
//     button is disabled with a tooltip ("No active launch — Patch the file
//     instead, or close and launch first.").
//
// `describeFailure` is exported separately so the headless actionable Notice
// in `openAgent.ts` can use the same phrasing without instantiating the
// modal.

import {
  Modal,
  Notice,
  Setting,
  TFile,
  type App,
} from "obsidian";
import {
  BadModelSpecError,
  NoInstalledAgentError,
} from "./stepResolver";
import {
  MODEL_REGISTRY,
  validateModelName,
  type BadModelSpec,
} from "./modelRegistry";
import {
  applyBadModelPatch,
  revertLastWorkflowPatch,
  type VaultLike,
  type VaultFileLike,
} from "./recoveryPatchApply";
import { findLatestBackup, formatUnifiedDiff, parseBackupTimestamp, planBadModelPatch } from "./recoveryPatch";
import type { WorkflowDiagnostic } from "./workflowDiagnostic";

export type RecoveryDialogMode = "launch" | "advisory";

export type RecoveryDialogOutcome =
  | { kind: "override"; canonicalModel: string }
  | { kind: "patched"; canonicalModel: string; backupPath: string }
  | { kind: "reverted"; restoredFromPath: string }
  | { kind: "cancelled" };

export interface RecoveryDialogArgs {
  app: App;
  /** Issue id (e.g. `OP-200`) — used in headers + Notice text. */
  issueId: string;
  /** Resolver failure that triggered the dialog. */
  error: BadModelSpecError | NoInstalledAgentError;
  /** Project slug — used to find the workflow file for patching. */
  project: string;
  /**
   * Whether the dialog is opening at launch time (with a launch about to
   * proceed) or advisory (no in-flight launch).
   */
  mode: RecoveryDialogMode;
  /**
   * Called once the user resolves the dialog. Caller responds:
   *   - `override` → re-launch with `launchModelOverride: canonicalModel`.
   *   - `patched`  → re-launch (workflow file is now valid).
   *   - `reverted` → reload the workflow file (the user undid a prior patch).
   *   - `cancelled` → abort the launch (launch mode) or no-op (advisory mode).
   */
  onResolved: (outcome: RecoveryDialogOutcome) => void;
}

export function openRecoveryDialog(args: RecoveryDialogArgs): void {
  // Defensive: when the runtime App we're handed doesn't expose Modal-able
  // ergonomics (early-boot races, tests that pass a stub), fall back to the
  // Notice-only path so the user still sees the diagnostic.
  if (!args.app || typeof (args.app as { workspace?: unknown }).workspace !== "object") {
    new Notice(describeFailure(args.error), 0);
    return;
  }
  new RecoveryDialogModal(args).open();
}

/**
 * Build a human-friendly one-line description of the resolver failure.
 * Shared between the modal header and the headless actionable Notice text.
 */
export function describeFailure(
  err: BadModelSpecError | NoInstalledAgentError,
): string {
  if (err.name === "NoInstalledAgentError") {
    const e = err as NoInstalledAgentError;
    return (
      `Step "${e.stepId}" has no installed agent. Tried: ${e.attemptedAgents.join(", ")}. ` +
      `Install one of these binaries, or edit the workflow file's agent list.`
    );
  }
  const e = err as BadModelSpecError;
  const aliasHint = e.bad.allowedAliases.length
    ? `Allowed aliases: ${e.bad.allowedAliases.join(", ")}.`
    : "";
  const versionedHint = e.bad.allowedVersioned.length
    ? ` Allowed versioned ids: ${e.bad.allowedVersioned.slice(0, 3).join(", ")}${e.bad.allowedVersioned.length > 3 ? ", …" : ""}.`
    : "";
  if (e.reason === "typo") {
    return (
      `Step "${e.stepId}" model spec has a typo for agent "${e.chosenAgent}": ` +
      `"${e.bad.badName}" is unknown to every registered agent. ${aliasHint}${versionedHint}`
    );
  }
  return (
    `Step "${e.stepId}" model spec has no usable entry for agent "${e.chosenAgent}". ` +
    `"${e.bad.badName}" belongs to a different agent. ${aliasHint}${versionedHint}`
  );
}

/**
 * Synthesize a `BadModelSpecError` from a stored `bad-model` diagnostic — used
 * by the advisory entrypoint when the palette command opens the dialog from
 * an `op-explain-workflow` warnings list. Returns `null` if the diagnostic
 * doesn't carry a `BadModelSpec` payload (shouldn't happen with the modern
 * pipeline; defensive against legacy callers).
 */
export function synthesizeBadModelErrorFromDiagnostic(
  d: WorkflowDiagnostic,
): BadModelSpecError | null {
  if (d.code !== "bad-model") return null;
  const extra = d.extra as Partial<BadModelSpec> | undefined;
  if (
    !extra ||
    typeof extra.stepId !== "string" ||
    typeof extra.badName !== "string" ||
    typeof extra.agent !== "string" ||
    !Array.isArray(extra.allowedAliases) ||
    !Array.isArray(extra.allowedVersioned)
  ) {
    return null;
  }
  const bad: BadModelSpec = {
    stepId: extra.stepId,
    badName: extra.badName,
    agent: extra.agent,
    allowedAliases: extra.allowedAliases,
    allowedVersioned: extra.allowedVersioned,
  };
  // Heuristic: if the bad name is unknown to every registered agent → typo;
  // otherwise → all-overflow. Matches the resolver's classifier semantics.
  const reason: "typo" | "all-overflow" = isUnknownToEveryAgent(bad.badName)
    ? "typo"
    : "all-overflow";
  // The diagnostic-derived error doesn't carry a meaningful classifier per
  // attempt — we only have the one bad name. Construct a single-attempt
  // payload so the modal renders consistently.
  // Cast through unknown so the AgentId narrow doesn't trip in advisory mode
  // (the diagnostic may carry an unknown agent string; the modal renders the
  // string verbatim and falls back to empty registry columns).
  return new BadModelSpecError(
    bad.stepId,
    bad.agent as never,
    [
      {
        name: bad.badName,
        classification:
          reason === "typo"
            ? { kind: "typo" }
            : { kind: "cross-agent-overflow", otherAgent: detectOverflowAgent(bad.badName) ?? "another agent" },
      },
    ],
    reason,
    bad,
  );
}

function isUnknownToEveryAgent(name: string): boolean {
  const trimmed = (name ?? "").trim();
  for (const reg of Object.values(MODEL_REGISTRY)) {
    if (Object.prototype.hasOwnProperty.call(reg.aliases, trimmed)) return false;
    if (reg.versioned.has(trimmed)) return false;
  }
  return true;
}

function detectOverflowAgent(name: string): string | null {
  const trimmed = (name ?? "").trim();
  for (const [agent, reg] of Object.entries(MODEL_REGISTRY)) {
    if (Object.prototype.hasOwnProperty.call(reg.aliases, trimmed)) return agent;
    if (reg.versioned.has(trimmed)) return agent;
  }
  return null;
}

class RecoveryDialogModal extends Modal {
  private picker = "";
  private replacement: string | null = null;
  private vaultLike: VaultLike;
  private workflowFile: VaultFileLike | null = null;
  private rawWorkflow: string | null = null;
  private patchStatusEl: HTMLElement | null = null;
  private patchBtn: HTMLButtonElement | null = null;
  private overrideBtn: HTMLButtonElement | null = null;
  private resolved = false;

  constructor(private readonly args: RecoveryDialogArgs) {
    super(args.app);
    this.vaultLike = makeVaultLikeFromApp(args.app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("op-recovery-modal");

    contentEl.createEl("h2", { text: this.headerText() });
    contentEl.createEl("p", {
      text: describeFailure(this.args.error),
      cls: "op-recovery-modal__lede",
    });

    if (this.args.error instanceof BadModelSpecError) {
      this.renderColumns(contentEl, this.args.error.chosenAgent);
      this.renderPicker(contentEl, this.args.error);
    } else {
      // NoInstalledAgentError — the picker offers no replacement; only
      // "Open WORKFLOW.md" + Cancel make sense. Render an actionable note.
      contentEl.createEl("p", {
        cls: "op-recovery-modal__no-agent-hint",
        text:
          `Install one of: ${this.args.error.attemptedAgents.join(", ")}. ` +
          `Then re-run the launch. (Cancel here to abort.)`,
      });
    }

    void this.loadWorkflowFile().then(() => this.refreshPatchStatus());
    this.renderActions(contentEl);
    this.renderRevertRow(contentEl);
  }

  onClose(): void {
    this.contentEl.empty();
    if (!this.resolved) {
      this.resolved = true;
      this.args.onResolved({ kind: "cancelled" });
    }
  }

  private headerText(): string {
    if (this.args.error instanceof BadModelSpecError) {
      return `Recover: bad model spec — ${this.args.issueId}`;
    }
    return `Recover: no installed agent — ${this.args.issueId}`;
  }

  private renderColumns(contentEl: HTMLElement, agent: string): void {
    const reg = MODEL_REGISTRY[agent];
    const wrap = contentEl.createDiv({ cls: "op-recovery-modal__columns" });
    const aliasCol = wrap.createDiv({ cls: "op-recovery-modal__column" });
    aliasCol.createEl("h3", { text: "Allowed aliases" });
    const aliasList = aliasCol.createEl("ul");
    if (reg) {
      for (const alias of Object.keys(reg.aliases).sort()) {
        const li = aliasList.createEl("li");
        const btn = li.createEl("button", { text: alias, cls: "op-recovery-modal__chip" });
        btn.title = `→ ${reg.aliases[alias]}`;
        btn.addEventListener("click", () => this.setPicker(alias));
      }
    } else {
      aliasCol.createEl("p", { text: "(unknown agent — no registry data)" });
    }

    const verCol = wrap.createDiv({ cls: "op-recovery-modal__column" });
    verCol.createEl("h3", { text: "Allowed versioned ids" });
    const verList = verCol.createEl("ul");
    if (reg) {
      for (const v of Array.from(reg.versioned).sort()) {
        const li = verList.createEl("li");
        const btn = li.createEl("button", { text: v, cls: "op-recovery-modal__chip" });
        btn.addEventListener("click", () => this.setPicker(v));
      }
    } else {
      verCol.createEl("p", { text: "(unknown agent — no registry data)" });
    }
  }

  private renderPicker(contentEl: HTMLElement, err: BadModelSpecError): void {
    new Setting(contentEl)
      .setName("Replacement model")
      .setDesc("Type or click an entry above. Pressing Enter auto-validates.")
      .addText((t) => {
        t.setPlaceholder("e.g. opus, claude-sonnet-4-6")
          .setValue("")
          .onChange((v) => {
            this.picker = v;
            this.refreshPatchStatus();
          });
        t.inputEl.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter") {
            ev.preventDefault();
            this.handleOverride(err);
          }
        });
      });
  }

  private setPicker(value: string): void {
    this.picker = value;
    const setting = this.contentEl.querySelector<HTMLInputElement>(".setting-item input[type=text]");
    if (setting) setting.value = value;
    this.refreshPatchStatus();
  }

  private renderActions(contentEl: HTMLElement): void {
    this.patchStatusEl = contentEl.createEl("p", { cls: "op-recovery-modal__patch-status" });

    const setting = new Setting(contentEl);
    setting.addButton((b) => {
      this.overrideBtn = b
        .setButtonText("Use as launch override")
        .setCta()
        .onClick(() => {
          if (!(this.args.error instanceof BadModelSpecError)) return;
          this.handleOverride(this.args.error);
        }).buttonEl;
      if (this.args.mode === "advisory") {
        this.overrideBtn.disabled = true;
        this.overrideBtn.title =
          "No active launch — use Patch workflow to fix the file, or close this dialog and launch first to override.";
      }
      if (!(this.args.error instanceof BadModelSpecError)) {
        // No model to override with; the only path forward is install + retry.
        this.overrideBtn.disabled = true;
      }
    });

    setting.addButton((b) => {
      this.patchBtn = b
        .setButtonText("Patch workflow with this model")
        .onClick(() => this.handlePatch())
        .buttonEl;
      this.patchBtn.disabled = true;
    });

    setting.addButton((b) =>
      b.setButtonText("Cancel").onClick(() => this.close()),
    );
  }

  private renderRevertRow(contentEl: HTMLElement): void {
    const row = contentEl.createDiv({ cls: "op-recovery-modal__bak-row" });
    row.style.display = "none";
    const label = row.createEl("span", {
      cls: "op-recovery-modal__bak-label",
    });
    const btn = row.createEl("button", {
      text: "Revert last patch",
      cls: "op-recovery-modal__revert-btn",
    });
    btn.addEventListener("click", () => void this.handleRevert(row, label));

    void this.refreshRevertRow(row, label);
  }

  private async refreshRevertRow(row: HTMLElement, label: HTMLElement): Promise<void> {
    const wf = await this.loadWorkflowFile();
    if (!wf) return;
    const folder = parentFolder(wf.path);
    const siblings = this.vaultLike.listSiblingPaths(folder);
    const latest = findLatestBackup(siblings, wf.path);
    if (!latest) {
      row.style.display = "none";
      return;
    }
    row.style.display = "";
    const ts = parseBackupTimestamp(latest) ?? "<unknown>";
    label.textContent = `Last backup: ${ts}`;
  }

  private async loadWorkflowFile(): Promise<VaultFileLike | null> {
    if (this.workflowFile) return this.workflowFile;
    const path = `Projects/${this.args.project}/WORKFLOW.md`;
    const file = this.vaultLike.getFileByPath(path);
    if (!file) return null;
    this.workflowFile = file;
    this.rawWorkflow = await this.vaultLike.read(file);
    return file;
  }

  private async refreshPatchStatus(): Promise<void> {
    if (!this.patchStatusEl || !this.patchBtn) return;
    if (!(this.args.error instanceof BadModelSpecError)) return;
    const picker = this.picker.trim();
    if (!picker) {
      this.patchStatusEl.textContent = "";
      this.patchBtn.disabled = true;
      this.replacement = null;
      return;
    }
    const v = validateModelName(this.args.error.chosenAgent, picker, this.args.error.stepId);
    if (!v.ok) {
      this.patchStatusEl.textContent = `"${picker}" is not a valid model for agent "${this.args.error.chosenAgent}".`;
      this.patchStatusEl.removeClass("op-recovery-modal__patch-status--ok");
      this.patchStatusEl.addClass("op-recovery-modal__patch-status--error");
      this.patchBtn.disabled = true;
      this.replacement = null;
      return;
    }
    this.replacement = v.canonicalId;
    const wf = await this.loadWorkflowFile();
    if (!wf || this.rawWorkflow === null) {
      this.patchStatusEl.textContent = `Resolved → ${v.canonicalId}. Workflow file not found at Projects/${this.args.project}/WORKFLOW.md — Patch unavailable.`;
      this.patchStatusEl.removeClass("op-recovery-modal__patch-status--ok");
      this.patchStatusEl.addClass("op-recovery-modal__patch-status--error");
      this.patchBtn.disabled = true;
      return;
    }
    this.patchStatusEl.textContent = `Resolved → ${v.canonicalId}. Patch will rewrite ${this.args.error.bad.badName} → ${v.canonicalId} in ${wf.path}.`;
    this.patchStatusEl.addClass("op-recovery-modal__patch-status--ok");
    this.patchStatusEl.removeClass("op-recovery-modal__patch-status--error");
    this.patchBtn.disabled = false;
  }

  private handleOverride(err: BadModelSpecError): void {
    if (this.args.mode === "advisory") return;
    if (!this.replacement) return;
    const v = validateModelName(err.chosenAgent, this.picker.trim(), err.stepId);
    if (!v.ok) return;
    this.resolved = true;
    this.args.onResolved({ kind: "override", canonicalModel: v.canonicalId });
    this.close();
  }

  private async handlePatch(): Promise<void> {
    if (!(this.args.error instanceof BadModelSpecError)) return;
    if (!this.replacement) return;
    const wf = await this.loadWorkflowFile();
    if (!wf || this.rawWorkflow === null) return;
    const replacement = this.replacement;
    const badName = this.args.error.bad.badName;

    // Open the diff-confirm sub-modal first; only on confirm do we touch
    // disk.
    new DiffConfirmModal(this.app, {
      diff: this.computeDiffPreview(this.rawWorkflow, badName, replacement, wf.path),
      onConfirm: () => void this.commitPatch(wf, badName, replacement),
    }).open();
  }

  private computeDiffPreview(
    raw: string,
    badName: string,
    replacement: string,
    path: string,
  ): string {
    // Reuse the planner's diff so what the user sees == what gets applied.
    const r = planBadModelPatch({ raw, path, badName, replacement });
    if (r.status !== "ok") return "(no change)";
    return r.diff;
  }

  private async commitPatch(
    wf: VaultFileLike,
    badName: string,
    replacement: string,
  ): Promise<void> {
    const raw = this.rawWorkflow ?? "";
    try {
      const r = await applyBadModelPatch({
        vault: this.vaultLike,
        workflowFile: wf,
        raw,
        badName,
        replacement,
      });
      if (r.status !== "ok") {
        new Notice(`Patch skipped: ${r.reason.status}`, 6000);
        return;
      }
      new Notice(
        `Patched ${wf.path}. Backup at ${r.backupPath} — use "op: revert last workflow patch" to undo.`,
        0,
      );
      this.resolved = true;
      this.args.onResolved({
        kind: "patched",
        canonicalModel: replacement,
        backupPath: r.backupPath,
      });
      this.close();
    } catch (err) {
      console.error("[op-obsidian] recoveryDialog.commitPatch failed", err);
      new Notice(`Patch failed: ${(err as Error).message ?? String(err)}`, 8000);
    }
  }

  private async handleRevert(row: HTMLElement, label: HTMLElement): Promise<void> {
    const wf = await this.loadWorkflowFile();
    if (!wf) return;
    try {
      // Look up the latest backup before committing to anything, so we can
      // show the user a diff between their current (possibly hand-edited)
      // content and the backup they're about to restore.
      const folder = parentFolder(wf.path);
      const siblings = this.vaultLike.listSiblingPaths(folder);
      const latestBak = findLatestBackup(siblings, wf.path);
      if (!latestBak) {
        new Notice("No backup found for this workflow file.", 5000);
        return;
      }
      const bakFile = this.vaultLike.getFileByPath(latestBak);
      if (!bakFile) {
        new Notice("No backup found for this workflow file.", 5000);
        return;
      }
      const currentContent = await this.vaultLike.read(wf);
      const backupContent = await this.vaultLike.read(bakFile);
      // Show a diff of what will be LOST (current → backup). The user must
      // explicitly confirm before we clobber any hand-edits they made after
      // the last patch.
      const diff = formatUnifiedDiff(currentContent, backupContent, wf.path);
      new RevertConfirmModal(this.app, {
        diff,
        backupTimestamp: parseBackupTimestamp(latestBak) ?? "<unknown>",
        onConfirm: () => { this.commitRevert(wf, row, label).catch((e) => console.error("[op-obsidian] recoveryDialog.commitRevert unexpected", e)); },
      }).open();
    } catch (err) {
      console.error("[op-obsidian] recoveryDialog.handleRevert failed", err);
      new Notice(`Revert failed: ${(err as Error).message ?? String(err)}`, 8000);
    }
  }

  private async commitRevert(
    wf: VaultFileLike,
    row: HTMLElement,
    label: HTMLElement,
  ): Promise<void> {
    try {
      const r = await revertLastWorkflowPatch({ vault: this.vaultLike, workflowFile: wf });
      if (r.status === "no-backup") {
        new Notice("No backup found for this workflow file.", 5000);
        return;
      }
      // Refresh the cached raw text so subsequent operations see the restored
      // contents.
      this.rawWorkflow = await this.vaultLike.read(wf);
      new Notice(`Reverted ${wf.path} from ${r.restoredFromPath}.`, 6000);
      void this.refreshRevertRow(row, label);
      this.resolved = true;
      this.args.onResolved({ kind: "reverted", restoredFromPath: r.restoredFromPath });
      // After a revert, the file may once again be invalid for THIS error —
      // we close so the user can re-launch and (if still bad) open a fresh
      // dialog reflecting the now-restored state.
      this.close();
    } catch (err) {
      console.error("[op-obsidian] recoveryDialog.commitRevert failed", err);
      new Notice(`Revert failed: ${(err as Error).message ?? String(err)}`, 8000);
    }
  }
}

class DiffConfirmModal extends Modal {
  constructor(app: App, private opts: { diff: string; onConfirm: () => void }) {
    super(app);
  }
  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("op-recovery-modal__diff-confirm");
    contentEl.createEl("h2", { text: "Confirm workflow patch" });
    contentEl.createEl("p", {
      text:
        "A timestamped backup will be written before the change is applied. " +
        'You can undo this with "op: revert last workflow patch" (one-step).',
    });
    const pre = contentEl.createEl("pre", { cls: "op-recovery-modal__diff" });
    pre.textContent = this.opts.diff;
    new Setting(contentEl)
      .addButton((b) =>
        b
          .setButtonText("Apply patch")
          .setCta()
          .onClick(() => {
            this.close();
            this.opts.onConfirm();
          }),
      )
      .addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()));
  }
  onClose(): void {
    this.contentEl.empty();
  }
}

/**
 * Confirmation modal shown before a revert overwrites the live workflow file.
 * Displays a diff of current → backup so the user can see any hand-edits they
 * are about to lose. Mirrors `DiffConfirmModal` but with revert-specific
 * labelling and a warning that the current state will be replaced.
 */
class RevertConfirmModal extends Modal {
  constructor(
    app: App,
    private opts: { diff: string; backupTimestamp: string; onConfirm: () => void },
  ) {
    super(app);
  }
  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("op-recovery-modal__diff-confirm");
    contentEl.createEl("h2", { text: "Confirm revert" });
    contentEl.createEl("p", {
      text:
        `Restoring from backup ${this.opts.backupTimestamp}. ` +
        "Any edits you made to the workflow file after the last patch will be lost. " +
        "The diff below shows what will change (− lines disappear, + lines are restored).",
    });
    const pre = contentEl.createEl("pre", { cls: "op-recovery-modal__diff" });
    pre.textContent = this.opts.diff || "(no changes detected between current file and backup)";
    new Setting(contentEl)
      .addButton((b) =>
        b
          .setButtonText("Restore from backup")
          .setCta()
          .onClick(() => {
            this.close();
            this.opts.onConfirm();
          }),
      )
      .addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()));
  }
  onClose(): void {
    this.contentEl.empty();
  }
}

function makeVaultLikeFromApp(app: App): VaultLike {
  const vault = app.vault;
  return {
    async read(file) {
      return vault.read(file as TFile);
    },
    async modify(file, data) {
      await vault.modify(file as TFile, data);
    },
    async create(path, data) {
      return (await vault.create(path, data)) as VaultFileLike;
    },
    async trash(file, system) {
      await vault.trash(file as TFile, system);
    },
    getFileByPath(path) {
      const f = vault.getAbstractFileByPath(path);
      return f instanceof TFile ? (f as VaultFileLike) : null;
    },
    listSiblingPaths(parentFolderPath) {
      const out: string[] = [];
      const folder = parentFolderPath ? vault.getAbstractFileByPath(parentFolderPath) : vault.getRoot();
      if (!folder || !("children" in (folder as object))) return out;
      const children = (folder as { children?: Array<{ path: string }> }).children;
      if (!Array.isArray(children)) return out;
      for (const child of children) {
        if (child && typeof child.path === "string") out.push(child.path);
      }
      return out;
    },
  };
}

function parentFolder(path: string): string {
  const i = path.lastIndexOf("/");
  return i < 0 ? "" : path.slice(0, i);
}
