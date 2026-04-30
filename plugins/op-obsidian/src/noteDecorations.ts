/**
 * CM6 + Reading-mode renderers for the note-level primary-action chip
 * (OP-151) and the inline status strip (OP-162).
 *
 * Both modes feed off the same pure resolver in `noteChipState.ts` and
 * compose strip segments with `noteStatusStrip.ts`. The DOM is built by
 * one shared {@link renderChipDom} helper so the two renderers can never
 * drift in label, markup, or click affordance.
 *
 * Lifecycle discipline
 * --------------------
 * Every event listener attached in `toDOM()` (CM6) or `onload()` (the
 * post-processor MarkdownRenderChild) goes through a single
 * `AbortController` stored on the widget/child. `destroy()` /
 * `onunload()` calls `controller.abort()` so listeners disappear
 * deterministically when the user toggles Live-Preview ↔ Reading mode.
 * This is the single most likely bug class for this kind of widget;
 * tests in `noteDecorations.test.ts` assert the abort-signal flips on
 * teardown.
 */
import {
  App,
  MarkdownPostProcessorContext,
  MarkdownRenderChild,
  MarkdownView,
} from "obsidian";
import { editorInfoField } from "obsidian";
import { execFile } from "child_process";
import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { StateEffect } from "@codemirror/state";
import {
  ChipFrontmatter,
  ChipState,
  chipPrimaryCommandForClick,
  describeChipPrimaryAction,
  resolveChipState,
} from "./noteChipState";
import {
  GhStateCache,
  GH_STATE_TTL_MS,
  StripFrontmatter,
  StripSegment,
  composeStripSegments,
  formatSegment,
  writeGhCache,
} from "./noteStatusStrip";
import { showChipMenu, dispatchCommand } from "./noteChipMenu";

/**
 * Effect dispatched when external state (frontmatter, agent liveness, gh
 * fetch result) changes — forces the ViewPlugin to recompute its
 * decoration set even when no editor transaction would otherwise fire.
 */
const refreshChipEffect = StateEffect.define<null>();

/** Plugin-instance dependencies for the renderers — injected by main.ts
 * so the modules can stay pure of plugin internals. */
export interface ChipDeps {
  app: App;
  /** Look up whether a given issue id has a live tmux window. Sync —
   * the renderer caches the result for the widget lifetime. May return
   * `null` to mean "tmux unavailable, treat as live". */
  isAgentLive: (issueId: string, agent: string | undefined) => boolean | null;
  /** Settings accessor — the renderer reads live note-chip-affecting settings
   * on each render so toggling them updates without a reload. */
  getSettings: () => { defaultAgent: string; view: { disableInlineGithubStatus: boolean } };
  /** Single in-memory cache shared across renderers (CM6 + post-processor)
   * so the strip doesn't double-fetch when both renderers run on the
   * same file during a mode toggle. */
  ghCache: GhStateCache;
  /** Optional override used by tests; defaults to `child_process.execFile`. */
  fetchGhState?: (url: string, kind: "pr" | "issue") => Promise<string | null>;
  /** Refresh hook — called when a gh fetch lands so the CM6 ViewPlugin
   * can dispatch the refresh effect. main.ts wires this to iterate all
   * markdown editors. */
  scheduleRefresh: () => void;
}

/**
 * Build the chip + strip wrapper DOM. Pure of how it's mounted (CM6 widget
 * vs. preview prepend) — the caller is responsible for inserting the
 * returned element above the H1. All listeners are attached with
 * `{ signal: controller.signal }` so the caller's `controller.abort()`
 * tears them down deterministically.
 */
export function renderChipDom(
  state: ChipState,
  segments: StripSegment[],
  deps: ChipDeps,
  controller: AbortController,
): HTMLElement {
  const wrap = document.createElement("div");
  wrap.classList.add("op-note-chip-wrap");
  wrap.dataset.issueId = state.issueId;

  const row = wrap.createDiv({ cls: "op-note-chip-row" });

  const primary = row.createEl("button", {
    cls: `op-note-chip op-note-chip--${state.variant}`,
    text: state.primaryLabel,
  });
  const settings = deps.getSettings();
  primary.setAttribute("type", "button");
  primary.setAttribute("aria-label", state.primaryLabel);
  primary.title = describeChipPrimaryAction(state, settings.defaultAgent);
  primary.addEventListener(
    "click",
    (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const command = chipPrimaryCommandForClick(state, ev);
      const ok = dispatchCommand(deps.app, command);
      if (!ok) {
        // Command unavailable (typically: not the active leaf). Surface
        // it instead of failing silently — same UX as the menu items.
        // Notice uses the bare id so the developer can grep noteChipState.ts.
        void import("./notificationLog").then(({ notify }) =>
          notify(`op: ${command} unavailable — open the issue note first.`),
        );
      }
    },
    { signal: controller.signal },
  );

  if (state.menu.length > 0) {
    const overflow = row.createEl("button", {
      cls: "op-note-chip op-note-chip--overflow",
      text: "⋯",
    });
    overflow.setAttribute("type", "button");
    overflow.setAttribute("aria-label", "More actions");
    overflow.title = "More actions";
    overflow.addEventListener(
      "click",
      (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        showChipMenu(deps.app, state, ev as MouseEvent);
      },
      { signal: controller.signal },
    );
  }

  if (segments.length > 0) {
    const strip = wrap.createDiv({ cls: "op-note-strip" });
    for (let i = 0; i < segments.length; i++) {
      if (i > 0) {
        strip.createSpan({ cls: "op-note-strip__sep", text: " · " });
      }
      const seg = segments[i];
      renderStripSegment(strip, seg, deps, controller);
    }
  }

  return wrap;
}

function renderStripSegment(
  parent: HTMLElement,
  seg: StripSegment,
  deps: ChipDeps,
  controller: AbortController,
): void {
  const span = parent.createSpan({
    cls: `op-note-strip__seg op-note-strip__seg--${seg.kind}${seg.kind !== "commit" && seg.pending ? " op-note-strip__seg--pending" : ""}`,
    text: formatSegment(seg),
  });
  span.title = formatSegment(seg);

  if (seg.kind === "commit") {
    span.addEventListener(
      "click",
      (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        // Decision: commit click copies the sha to the clipboard. `git show`
        // would be nicer but requires resolving the project's repo_path
        // and shelling out — we want the strip to never block on disk I/O.
        void navigator.clipboard.writeText(seg.sha).then(() =>
          import("./notificationLog").then(({ notify }) =>
            notify(`Copied ${seg.sha}`),
          ),
        );
      },
      { signal: controller.signal },
    );
    return;
  }

  span.addEventListener(
    "click",
    (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      window.open(seg.url, "_blank");
    },
    { signal: controller.signal },
  );

  if (seg.pending) {
    // Kick off a fetch for this segment if the cache miss isn't already
    // in flight. Single-flight is enforced by `ghCache.has()` — the
    // moment we dispatch the fetch we plant a placeholder entry so a
    // sibling render in the post-processor doesn't re-issue.
    void schedulePending(deps, seg);
  }
}

function schedulePending(deps: ChipDeps, seg: StripSegment): void {
  if (seg.kind === "commit") return;
  const url = seg.url;
  // Mark the URL as in-flight so a parallel render skips it. We write a
  // null-state cache entry with a TTL *longer* than the gh timeout (8 s)
  // so a render that fires during the timeout window doesn't start a
  // second fetch for the same URL. The real result (or confirmed null)
  // overwrites this entry when the fetch resolves.
  if (deps.ghCache.get(url)?.expiresAt && deps.ghCache.get(url)!.expiresAt > Date.now()) {
    return;
  }
  writeGhCache(deps.ghCache, url, null, Date.now(), 10_000);
  const fetcher = deps.fetchGhState ?? defaultFetchGhState;
  void fetcher(url, seg.kind === "pr" ? "pr" : "issue").then((state) => {
    writeGhCache(deps.ghCache, url, state, Date.now(), GH_STATE_TTL_MS);
    deps.scheduleRefresh();
  });
}

const defaultFetchGhState = async (
  url: string,
  kind: "pr" | "issue",
): Promise<string | null> => {
  return new Promise((resolve) => {
    const args = [kind === "pr" ? "pr" : "issue", "view", url, "--json", "state"];
    execFile("gh", args, { timeout: 8_000 }, (err, stdout) => {
      if (err) {
        resolve(null);
        return;
      }
      try {
        const parsed = JSON.parse(stdout) as { state?: string };
        resolve(parsed.state ?? null);
      } catch {
        resolve(null);
      }
    });
  });
};

/**
 * CM6 ViewPlugin that mounts a chip element OUTSIDE the editor's
 * decoration tree. Obsidian's bundled CM6 rejects `Decoration.widget`
 * at line 0 from any provider we tried (StateField, ViewPlugin) with
 * "Block decorations may not be specified via plugins" — its facet
 * marks both as plugin sources. So we sidestep Decorations entirely:
 * the plugin owns one DOM element prepended to `view.dom.parentNode`
 * (the cm-editor's parent — `cm-contentContainer` in current layouts),
 * recomputes its content on doc + frontmatter changes, and removes
 * itself on `destroy()`. This is the same shape CM6 plugins use for
 * tooltips / panels and matches Obsidian's own pattern in things like
 * the embedded markdown link cards.
 */
export function noteChipExtension(deps: ChipDeps) {
  return ViewPlugin.fromClass(
    class {
      private host: HTMLElement;
      private controller = new AbortController();
      private currentSig = "";

      constructor(private view: EditorView) {
        this.host = document.createElement("div");
        this.host.classList.add("op-note-chip-host");
        // Mount OUTSIDE `view.dom` (the `cm-editor` element) — CM6
        // assumes exclusive ownership of its DOM children, and inserting
        // arbitrary nodes inside `cm-editor` breaks its decoration
        // bookkeeping. We attach to the parent (Obsidian's
        // `markdown-source-view` container) so CM6 ignores us entirely.
        const parent = view.dom.parentElement;
        if (parent) parent.insertBefore(this.host, view.dom);
        this.recompute();
      }

      update(u: ViewUpdate): void {
        const refreshed = u.transactions.some((tr) =>
          tr.effects.some((e) => e.is(refreshChipEffect)),
        );
        if (!u.docChanged && !refreshed) return;
        this.recompute();
      }

      private recompute(): void {
        const info = this.view.state.field(editorInfoField, false);
        const file = info?.file;
        if (!file) {
          this.clear();
          return;
        }
        const rawFm = deps.app.metadataCache.getFileCache(file)?.frontmatter as
          | Record<string, unknown>
          | undefined;
        const chipFm = fmToChip(rawFm);
        const stripFm = fmToStrip(rawFm);
        const live = chipFm?.id ? deps.isAgentLive(chipFm.id, chipFm.agent) : null;
        const state = resolveChipState(chipFm, live === null ? true : live);
        if (!state) {
          this.clear();
          return;
        }
        const segments = deps.getSettings().view.disableInlineGithubStatus
          ? composeStripSegments(stripFm, deps.ghCache, Date.now()).filter(
              (s) => s.kind === "commit",
            )
          : composeStripSegments(stripFm, deps.ghCache, Date.now());
        const sig = computeSignature(state, segments);
        if (sig === this.currentSig) return;
        this.currentSig = sig;
        // Tear down the previous render's listeners before swapping content.
        this.controller.abort();
        this.controller = new AbortController();
        this.host.empty();
        const dom = renderChipDom(state, segments, deps, this.controller);
        dom.classList.add("op-note-chip-wrap--cm6");
        this.host.appendChild(dom);
      }

      private clear(): void {
        if (this.currentSig === "") return;
        this.currentSig = "";
        this.controller.abort();
        this.controller = new AbortController();
        this.host.empty();
      }

      destroy(): void {
        this.controller.abort();
        this.host.remove();
      }
    },
  );
}

/** Public for tests + post-processor reuse. */
export function fmToChip(
  fm: Record<string, unknown> | undefined,
): ChipFrontmatter | undefined {
  if (!fm) return undefined;
  return {
    id: typeof fm.id === "string" ? fm.id : undefined,
    type: typeof fm.type === "string" ? fm.type : undefined,
    status: typeof fm.status === "string" ? fm.status : undefined,
    agent: typeof fm.agent === "string" ? fm.agent : undefined,
    githubIssue:
      typeof fm.github_issue === "string" ? fm.github_issue : undefined,
  };
}

export function fmToStrip(
  fm: Record<string, unknown> | undefined,
): StripFrontmatter | undefined {
  if (!fm) return undefined;
  const commits = Array.isArray(fm.commits)
    ? (fm.commits as unknown[]).filter((x): x is string => typeof x === "string")
    : undefined;
  return {
    commits,
    pr: typeof fm.pr === "string" ? fm.pr : undefined,
    githubIssue:
      typeof fm.github_issue === "string" ? fm.github_issue : undefined,
  };
}

function computeSignature(state: ChipState, segments: StripSegment[]): string {
  const segPart = segments
    .map((s) => {
      if (s.kind === "commit") return `c:${s.sha}`;
      return `${s.kind}:${s.url}:${s.state ?? "?"}:${s.pending ? "p" : "r"}`;
    })
    .join("|");
  return `${state.action}|${state.primaryLabel}|${state.menu.length}|${segPart}`;
}

/**
 * Reading-mode mirror. Registered via `plugin.registerMarkdownPostProcessor`.
 * Renders a chip + strip wrapper above the first H1 of the rendered
 * preview section. Idempotent: if the wrapper is already a sibling of
 * the H1 we leave it alone.
 */
export function makeNoteChipPostProcessor(deps: ChipDeps) {
  return (el: HTMLElement, ctx: MarkdownPostProcessorContext): void => {
    const h1 = el.querySelector("h1");
    if (!h1) return;
    if (h1.previousElementSibling?.classList.contains("op-note-chip-wrap")) return;
    const fm =
      ctx.frontmatter ??
      deps.app.metadataCache.getCache(ctx.sourcePath)?.frontmatter ??
      undefined;
    const chipFm = fmToChip(fm as Record<string, unknown> | undefined);
    const stripFm = fmToStrip(fm as Record<string, unknown> | undefined);
    const live = chipFm?.id ? deps.isAgentLive(chipFm.id, chipFm.agent) : null;
    const state = resolveChipState(chipFm, live === null ? true : live);
    if (!state) return;
    const segments = deps.getSettings().view.disableInlineGithubStatus
      ? composeStripSegments(stripFm, deps.ghCache, Date.now()).filter(
          (s) => s.kind === "commit",
        )
      : composeStripSegments(stripFm, deps.ghCache, Date.now());
    const child = new ChipPostprocessorChild(deps, state, segments);
    h1.parentElement?.insertBefore(child.containerEl, h1);
    ctx.addChild(child);
  };
}

class ChipPostprocessorChild extends MarkdownRenderChild {
  private controller = new AbortController();
  constructor(
    private deps: ChipDeps,
    private state: ChipState,
    private segments: StripSegment[],
  ) {
    super(document.createElement("div"));
    this.containerEl.classList.add("op-note-chip-wrap--postprocessor");
  }

  onload(): void {
    const dom = renderChipDom(this.state, this.segments, this.deps, this.controller);
    this.containerEl.empty();
    while (dom.firstChild) this.containerEl.appendChild(dom.firstChild);
    // Mirror data attributes for selectors.
    this.containerEl.dataset.issueId = this.state.issueId;
    this.containerEl.classList.add("op-note-chip-wrap");
  }

  onunload(): void {
    this.controller.abort();
    this.containerEl.empty();
  }
}

/**
 * Codeblock-driven action chip. Used by the first-run README and the
 * demo project's STATUS.md for `Apply preset` / `Start tour` /
 * `Remove demo project`. Rendered when an Obsidian renderer hits a
 * fenced code block with language `op-action`. The body is a
 * line-per-key shape: `action: <command-id>` and `label: <text>`.
 */
export function makeOpActionCodeBlockProcessor(app: App) {
  return (source: string, el: HTMLElement, _ctx: unknown): void => {
    void _ctx;
    void import("./firstRunReadme").then(({ parseOpActionBlock }) => {
      const parsed = parseOpActionBlock(source);
      // Idempotency — Obsidian re-runs codeblock post-processors on edits
      // and sometimes during a single render pass. Clear `el` before
      // appending so we never stack duplicate chips inside one fence.
      el.empty();
      if (!parsed) {
        el.createEl("pre", { text: source, cls: "op-action-block--error" });
        return;
      }
      const wrap = el.createDiv({ cls: "op-note-chip-wrap op-note-chip-wrap--action" });
      const button = wrap.createEl("button", {
        cls: "op-note-chip op-note-chip--primary",
        text: parsed.label,
      });
      button.setAttribute("type", "button");
      button.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const ok = dispatchCommand(app, parsed.action);
        if (!ok) {
          // Notice uses the bare id so the developer can grep noteChipState.ts.
          void import("./notificationLog").then(({ notify }) =>
            notify(`op: ${parsed.action} unavailable.`),
          );
        }
      });
    });
  };
}

/**
 * Helper used by main.ts to dispatch the refresh effect into every
 * markdown editor. Keeps the StateEffect identity behind this module.
 */
export function dispatchChipRefresh(app: App): void {
  app.workspace.iterateAllLeaves((leaf) => {
    const view = leaf.view;
    if (view instanceof MarkdownView) {
      const cm = (view.editor as any).cm as EditorView | undefined;
      if (cm) cm.dispatch({ effects: refreshChipEffect.of(null) });
    }
  });
}
