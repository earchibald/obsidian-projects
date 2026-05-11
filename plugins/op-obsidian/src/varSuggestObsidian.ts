import {
  App,
  Editor,
  EditorPosition,
  EditorSuggest,
  EditorSuggestContext,
  EditorSuggestTriggerInfo,
  TFile,
} from "obsidian";
import {
  buildCandidates,
  classifyWorkflowFile,
  getDoubleBraceTrigger,
  getVarsBlockTrigger,
  isWorkflowFile,
  type ObjectFormSnippet,
  type VarCandidate,
} from "./varSuggest";
import { loadModules } from "./workflowModule";
import { currentProjectsRoot } from "./projectPaths";
import {
  parseModule,
  type WorkflowModule,
} from "./workflowModulePure";

// Obsidian IO seam wrapping the pure `varSuggest` layer. Drives the `{{`
// autocomplete + the empty-bullet `vars:` snippet for workflow modules and
// per-project WORKFLOW.md files. No suggestion logic lives here — every
// shape decision flows through `varSuggest.ts`.

type Suggestion = SuggestionVar | SuggestionSnippet;

interface SuggestionVar {
  kind: "var";
  candidate: VarCandidate;
}

interface SuggestionSnippet {
  kind: "snippet";
  /** Replacement range — line is implicit from the EditorSuggestTriggerInfo. */
  startCh: number;
  endCh: number;
  snippet: ObjectFormSnippet;
  /** Pretty label rendered in the dropdown row. */
  label: string;
  /** Secondary description text. */
  description: string;
}

/**
 * Enriched trigger info — `EditorSuggest.onTrigger` only allows us to return
 * the framework's `EditorSuggestTriggerInfo`, but `getSuggestions` (which
 * runs after) needs to know which trigger kind matched so it can build the
 * right candidate list. We stash that on the instance between calls.
 */
interface PendingTrigger {
  kind: "double-brace" | "vars-block";
  /** When `kind === "vars-block"`, the snippet to insert. */
  snippet?: ObjectFormSnippet;
  /** When `kind === "vars-block"`, the columns the trigger spans. */
  range?: { startCh: number; endCh: number };
  /** When `kind === "double-brace"`, whether the user is inside `{{vars.…`. */
  isVarsNamespace?: boolean;
}

export class VarEditorSuggest extends EditorSuggest<Suggestion> {
  private pending: PendingTrigger | null = null;

  constructor(app: App) {
    super(app);
    this.limit = 25;
  }

  onTrigger(cursor: EditorPosition, editor: Editor, file: TFile | null): EditorSuggestTriggerInfo | null {
    if (!file) { this.pending = null; return null; }
    const projectsRoot = currentProjectsRoot(this.app);
    if (!isWorkflowFile(file.path, projectsRoot)) { this.pending = null; return null; }

    // 1. vars: block snippet — fires only on an empty bullet line.
    const lines = editor.getValue().split("\n");
    const varsBlock = getVarsBlockTrigger({ lines, cursor: { line: cursor.line, ch: cursor.ch } });
    if (varsBlock) {
      this.pending = {
        kind: "vars-block",
        snippet: varsBlock.snippet,
        range: { startCh: varsBlock.startCh, endCh: varsBlock.endCh },
      };
      return {
        start: { line: varsBlock.line, ch: varsBlock.startCh },
        end: { line: varsBlock.line, ch: varsBlock.endCh },
        query: "",
      };
    }

    // 2. `{{` autocomplete.
    const lineText = editor.getLine(cursor.line);
    const dbl = getDoubleBraceTrigger({ lineText, ch: cursor.ch });
    if (dbl) {
      this.pending = {
        kind: "double-brace",
        isVarsNamespace: dbl.isVarsNamespace,
      };
      return {
        start: { line: cursor.line, ch: dbl.startCh },
        end: { line: cursor.line, ch: dbl.endCh },
        query: dbl.query,
      };
    }

    this.pending = null;
    return null;
  }

  getSuggestions(context: EditorSuggestContext): Suggestion[] {
    const trigger = this.pending;
    if (!trigger) return [];

    if (trigger.kind === "vars-block" && trigger.snippet && trigger.range) {
      return [
        {
          kind: "snippet",
          startCh: trigger.range.startCh,
          endCh: trigger.range.endCh,
          snippet: trigger.snippet,
          label: "New var declaration",
          description: "Object form (cleaner inside YAML — forward-compatible with `description:`).",
        },
      ];
    }

    // double-brace — load module context and build candidates.
    const file = context.file;
    const modulesContext = loadVarSuggestContext(this.app, file);
    const candidates = buildCandidates({
      currentModule: modulesContext.currentModule,
      globalModules: modulesContext.globalModules,
      projectModules: modulesContext.projectModules,
      varsNamespaceOnly: trigger.isVarsNamespace,
      query: context.query,
    });
    return candidates.map<Suggestion>((c) => ({ kind: "var", candidate: c }));
  }

  renderSuggestion(value: Suggestion, el: HTMLElement): void {
    el.addClass("op-var-suggest");
    if (value.kind === "snippet") {
      el.createDiv({ text: value.label, cls: "op-var-suggest__title" });
      el.createDiv({ text: value.description, cls: "op-var-suggest__desc" });
      el.createDiv({ text: value.snippet.text, cls: "op-var-suggest__preview" });
      return;
    }
    const { candidate } = value;
    const titleRow = el.createDiv({ cls: "op-var-suggest__row" });
    titleRow.createSpan({ text: candidate.name, cls: "op-var-suggest__name" });
    titleRow.createSpan({ text: candidate.sourceLabel, cls: "op-var-suggest__source" });
    el.createDiv({ text: candidate.description, cls: "op-var-suggest__desc" });
    if (candidate.preview !== undefined) {
      el.createDiv({
        text: `Preview: ${candidate.preview || "(empty)"}`,
        cls: "op-var-suggest__preview",
      });
    }
  }

  selectSuggestion(value: Suggestion, _evt: MouseEvent | KeyboardEvent): void {
    const ctx = this.context;
    if (!ctx) return;
    if (value.kind === "snippet") {
      const { editor } = ctx;
      const line = ctx.start.line;
      editor.replaceRange(
        value.snippet.text,
        { line, ch: value.startCh },
        { line, ch: value.endCh },
      );
      // Move cursor onto the first placeholder.
      const cursorCh = value.startCh + value.snippet.cursorOffset;
      editor.setCursor({ line, ch: cursorCh });
      // Select the placeholder so the user can overwrite by typing.
      editor.setSelection(
        { line, ch: cursorCh },
        { line, ch: cursorCh + "NAME".length },
      );
      this.pending = null;
      this.close();
      return;
    }
    const { editor } = ctx;
    editor.replaceRange(value.candidate.insertText, ctx.start, ctx.end);
    const cursorAt = {
      line: ctx.start.line,
      ch: ctx.start.ch + value.candidate.insertText.length,
    };
    editor.setCursor(cursorAt);
    this.pending = null;
    this.close();
  }
}

// ---------------------------------------------------------------------------
// Per-file context (vault reads — pure path helpers live in `varSuggest.ts`)
// ---------------------------------------------------------------------------

interface VarSuggestContext {
  currentModule: WorkflowModule | null;
  globalModules: WorkflowModule[];
  projectModules: WorkflowModule[];
}

function loadVarSuggestContext(app: App, file: TFile): VarSuggestContext {
  const cls = classifyWorkflowFile(file.path, currentProjectsRoot(app));
  if (!cls) return { currentModule: null, globalModules: [], projectModules: [] };

  const slug =
    cls.kind === "global-module"
      ? undefined
      : cls.kind === "project-module"
        ? cls.slug
        : cls.slug;
  const all = loadModules(app, slug ? { project: slug } : {});
  const globalModules = all.modules.filter((m) => m.source.kind === "global");
  const projectModules = all.modules.filter((m) => m.source.kind === "project");

  let currentModule: WorkflowModule | null = null;
  if (cls.kind === "global-module" || cls.kind === "project-module") {
    const fmCached = app.metadataCache.getFileCache(file)?.frontmatter;
    const fmInput = fmCached === undefined ? null : (fmCached as Record<string, unknown>);
    const source =
      cls.kind === "global-module"
        ? ({ kind: "global", path: file.path } as const)
        : ({ kind: "project", path: file.path, projectSlug: cls.slug } as const);
    const parsed = parseModule({ id: cls.id, frontmatter: fmInput, source });
    currentModule = parsed.module;
    // Drop the current module from the layered list so we don't double-count
    // its declarations on top of itself in the candidate union.
    if (currentModule) {
      const dropFrom = (xs: WorkflowModule[]) =>
        xs.filter((m) => m.source.path !== currentModule!.source.path);
      return {
        currentModule,
        globalModules: dropFrom(globalModules),
        projectModules: dropFrom(projectModules),
      };
    }
  }

  return { currentModule, globalModules, projectModules };
}
