// CM6 extension that paints OP-207 squiggles + a status footer for module
// and workflow files. Consumes `validateFile` from the IO seam, locates each
// localizable diagnostic via `locateDiagnostic`, and folds the rest into the
// footer line.
//
// Lifecycle discipline mirrors `noteDecorations.ts`: every listener attached
// in the ViewPlugin's `constructor` goes through one `AbortController` so
// `destroy()` tears them down deterministically.

import { App, MarkdownView, TFile } from "obsidian";
import { editorInfoField } from "obsidian";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import { RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";

import type { AgentDetector } from "./agentDetect";
import type { OpSettings } from "./settings";
import type { WorkflowDiagnostic } from "./workflowDiagnostic";
import {
  classifyFile,
  validateFile,
  type ValidationResult,
} from "./editorWorkflowValidator";
import {
  locateDiagnostic,
  type DiagnosticRange,
} from "./editorWorkflowValidatorPure";
import { diagnosticToLine } from "./workflowDiagnosticFormat";

/** Re-validation debounce — keystroke storm settles before we sweep. */
const REVALIDATE_DEBOUNCE_MS = 250;

export interface ValidatorExtensionDeps {
  app: App;
  /** Returns the *current* settings — read each validation so live edits propagate. */
  getSettings: () => OpSettings;
  /** AgentDetector cache. May be `undefined` until the first probe completes. */
  detector?: AgentDetector;
}

/**
 * Effect carrying the latest validation result for an editor. Dispatched by
 * the ViewPlugin once the async sweep finishes; the StateField uses it to
 * rebuild the decoration set.
 */
const setDecorationsEffect = StateEffect.define<DecorationSet>();

const decorationsField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, tr) {
    let next = value.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(setDecorationsEffect)) next = effect.value;
    }
    return next;
  },
  provide: (f) => EditorView.decorations.from(f),
});

/**
 * Build the per-editor extension factory. `main.ts` calls this once at
 * `onload` and feeds the resulting array to `registerEditorExtension`.
 */
export function workflowValidatorExtension(deps: ValidatorExtensionDeps) {
  return [decorationsField, makeViewPlugin(deps)];
}

function makeViewPlugin(deps: ValidatorExtensionDeps) {
  return ViewPlugin.fromClass(
    class {
      private host: HTMLElement;
      private controller = new AbortController();
      private debounceTimer: number | null = null;
      private currentPath: string | null = null;
      private currentRaw: string = "";
      private destroyed = false;

      constructor(private view: EditorView) {
        this.host = document.createElement("div");
        this.host.classList.add("op-validator-footer");
        this.host.dataset.opValidator = "footer";
        this.host.style.display = "none";
        // Mount as a sibling AFTER the cm-editor's DOM in the same parent so
        // we sit at the bottom of the editor pane. Same defensive pattern
        // `noteDecorations.ts` uses for its top-mounted chip.
        const parent = view.dom.parentElement;
        if (parent) parent.appendChild(this.host);

        this.bindFile();
        // Re-bind / re-validate when the editor's file pointer changes.
        deps.app.workspace.on("active-leaf-change", this.onLeafChange);
        deps.app.metadataCache.on("changed", this.onMetadataChanged);
        deps.app.vault.on("modify", this.onVaultModify);
      }

      private onLeafChange = (): void => {
        this.bindFile();
      };

      private onMetadataChanged = (file: TFile): void => {
        if (this.currentPath && file.path === this.currentPath) {
          this.scheduleValidate();
        }
      };

      private onVaultModify = (file: TFile): void => {
        if (this.currentPath && file.path === this.currentPath) {
          this.scheduleValidate();
        }
      };

      update(u: ViewUpdate): void {
        if (u.docChanged) {
          // Live-preview keystrokes change the doc but don't hit disk.
          // We still revalidate (debounced) so squiggles track typing.
          this.scheduleValidate();
        }
      }

      private bindFile(): void {
        const info = this.view.state.field(editorInfoField, false);
        const file = info?.file;
        const path = file?.path ?? null;
        if (path === this.currentPath) return;
        this.currentPath = path;
        if (!path || !classifyFile(path)) {
          this.clear();
          return;
        }
        this.scheduleValidate();
      }

      private scheduleValidate(): void {
        if (this.destroyed) return;
        if (this.debounceTimer !== null) {
          window.clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = window.setTimeout(() => {
          this.debounceTimer = null;
          void this.runValidate();
        }, REVALIDATE_DEBOUNCE_MS);
      }

      private async runValidate(): Promise<void> {
        if (this.destroyed) return;
        const path = this.currentPath;
        if (!path) return;
        const file = deps.app.vault.getAbstractFileByPath(path);
        if (!(file instanceof TFile)) {
          this.clear();
          return;
        }
        // Snapshot the editor's current text so the locator runs against the
        // exact content we're decorating — vault.read could lag a doc edit by
        // a few ms.
        this.currentRaw = this.view.state.doc.toString();
        let result: ValidationResult;
        try {
          result = await validateFile(deps.app, file, {
            settings: deps.getSettings(),
            detector: deps.detector,
          });
        } catch (err) {
          // Non-fatal: log and keep the previous decoration set in place
          // rather than flickering to clean.
          console.error("[op-obsidian] editor validator failed", err);
          return;
        }
        if (this.destroyed || this.currentPath !== path) return;
        this.applyResult(result, path);
      }

      private applyResult(result: ValidationResult, filePath: string): void {
        const docLength = this.view.state.doc.length;
        const ranges: Array<{
          from: number;
          to: number;
          severity: WorkflowDiagnostic["severity"];
          tooltip: string;
        }> = [];
        const unlocalized: WorkflowDiagnostic[] = [];

        for (const diag of result.diagnostics) {
          const range = locateDiagnostic(diag, {
            filePath,
            raw: this.currentRaw,
          });
          if (range) {
            const clamped = clampRange(range, docLength);
            if (clamped) {
              ranges.push({
                from: clamped.from,
                to: clamped.to,
                severity: diag.severity,
                tooltip: diagnosticToLine(diag),
              });
              continue;
            }
          }
          unlocalized.push(diag);
        }

        // Build the DecorationSet — RangeSetBuilder requires sorted ranges by
        // `from`. Sort, then add — duplicates at the same range coexist (CM6
        // allows multiple marks per range).
        ranges.sort((a, b) => a.from - b.from || a.to - b.to);
        const builder = new RangeSetBuilder<Decoration>();
        for (const r of ranges) {
          builder.add(
            r.from,
            r.to,
            Decoration.mark({
              class: severityClass(r.severity),
              attributes: { title: r.tooltip },
            }),
          );
        }
        this.view.dispatch({ effects: setDecorationsEffect.of(builder.finish()) });
        this.renderFooter(result, unlocalized);
      }

      private renderFooter(
        result: ValidationResult,
        unlocalized: WorkflowDiagnostic[],
      ): void {
        const summary = result.summary;
        if (
          result.diagnostics.length === 0 &&
          summary.errors === 0 &&
          summary.warnings === 0 &&
          summary.info === 0
        ) {
          // Clean state — keep the footer mounted but visually muted so the
          // user gets confirmation a clean save is in fact clean. The OP-207
          // spec calls for a status footer on every validated file.
          this.host.style.display = "";
          this.host.classList.remove(
            "op-validator-footer--error",
            "op-validator-footer--warning",
          );
          this.host.classList.add("op-validator-footer--clean");
          this.host.empty();
          this.host.createSpan({
            cls: "op-validator-footer__line",
            text: summary.footerLine,
          });
          return;
        }
        this.host.style.display = "";
        this.host.classList.remove("op-validator-footer--clean");
        this.host.classList.toggle(
          "op-validator-footer--error",
          summary.errors > 0,
        );
        this.host.classList.toggle(
          "op-validator-footer--warning",
          summary.errors === 0 && summary.warnings > 0,
        );
        this.host.empty();
        this.host.createSpan({
          cls: "op-validator-footer__line",
          text: summary.footerLine,
        });
        if (unlocalized.length > 0) {
          // Build a tooltip listing diagnostics that don't have a localizable
          // anchor, so the user sees what the footer count covers.
          const tooltip = unlocalized.map((d) => diagnosticToLine(d)).join("\n");
          this.host.title = tooltip;
        } else {
          this.host.removeAttribute("title");
        }
      }

      private clear(): void {
        this.view.dispatch({ effects: setDecorationsEffect.of(Decoration.none) });
        this.host.style.display = "none";
        this.host.empty();
      }

      destroy(): void {
        this.destroyed = true;
        if (this.debounceTimer !== null) {
          window.clearTimeout(this.debounceTimer);
          this.debounceTimer = null;
        }
        this.controller.abort();
        deps.app.workspace.off("active-leaf-change", this.onLeafChange);
        deps.app.metadataCache.off("changed", this.onMetadataChanged);
        deps.app.vault.off("modify", this.onVaultModify);
        this.host.remove();
      }
    },
  );
}

function severityClass(severity: WorkflowDiagnostic["severity"]): string {
  switch (severity) {
    case "error":
      return "op-validator-mark op-validator-mark--error";
    case "warning":
      return "op-validator-mark op-validator-mark--warning";
    case "info":
      return "op-validator-mark op-validator-mark--info";
  }
}

function clampRange(
  r: DiagnosticRange,
  docLength: number,
): DiagnosticRange | null {
  const from = Math.max(0, Math.min(r.from, docLength));
  const to = Math.max(from, Math.min(r.to, docLength));
  if (to <= from) return null;
  return { from, to };
}

/**
 * Helper exported for main.ts: trigger a re-validate sweep on every open
 * markdown editor. Used after settings changes (e.g., default agent flipped)
 * so squiggles update without a full reload.
 */
export function dispatchValidatorRefresh(app: App): void {
  app.workspace.iterateAllLeaves((leaf) => {
    const view = leaf.view;
    if (view instanceof MarkdownView) {
      // The ViewPlugin debounces and re-reads the doc itself; the cheapest
      // re-trigger is to dispatch an empty transaction so its `update`
      // observer fires.
      const cm = (view.editor as { cm?: EditorView }).cm;
      if (cm) cm.dispatch({});
    }
  });
}
