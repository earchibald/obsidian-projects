// Pure layer for the `{{` autocomplete + vars-block snippet shipped with
// op-edit-workflow / op-edit-module (OP-202). No I/O, no Obsidian imports —
// every input flows in via arguments. The IO seam (`varSuggestObsidian.ts`)
// adapts Obsidian's `EditorSuggest` lifecycle to these pure helpers.
//
// Two trigger shapes:
//
//   1. `{{` inside a workflow-module or workflow-file body. Yields the union
//      of always-on plugin vars (`PLUGIN_VAR_REGISTRY`) and user vars declared
//      by modules at any precedence layer (Module / Global / Project). User
//      vars insert as `{{vars.<name>}}`; plugin vars as `{{<name>}}`.
//
//   2. The first non-comment empty bullet under a `vars:` block. Yields a
//      single object-form template snippet — the new-var-declaration default
//      shape per OP-202 (cleaner inside YAML than the `name=value` shorthand,
//      and forward-compatible with `description:`).
//
// Precedence + shadowing: the candidate list de-duplicates by name, keeping
// the highest-precedence entry. Lower-precedence entries are still listed
// when the higher one is a different scope (so users can preview "this name
// also exists at module scope") — annotated with `shadowedBy` so the IO seam
// can surface the relationship.

import {
  PLUGIN_VAR_REGISTRY,
  type PluginVar,
} from "./pluginVarRegistry";
import {
  precedenceScopeAbbrev,
  precedenceScopeLabel,
  type PrecedenceScope,
} from "./workflowDiagnosticFormat";
import type { VarDecl, WorkflowModule } from "./workflowModulePure";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * One candidate row in the `{{` autocomplete dropdown. `insertText` is what
 * the IO seam writes at the trigger position — `{{name}}` for plugin vars,
 * `{{vars.name}}` for user vars.
 */
export interface VarCandidate {
  name: string;
  description: string;
  /** What kind of variable. Drives the insert template + the source label. */
  kind: "plugin" | "user";
  /**
   * Full canonical source label (e.g. "Plugin (Launch override)",
   * "Module default", "Global default", "Project default"). Primary-copy
   * surface — abbreviations are kept separate per OP-201's labelling rule.
   */
  sourceLabel: string;
  /**
   * Compact source abbreviation. Tooltip / compact-badge use only. MUST NOT
   * appear in primary copy.
   */
  sourceAbbrev: string;
  /**
   * Concrete resolved value to preview alongside the candidate. For plugin
   * vars the registry's example string. For user vars the declared default
   * (string `""` when explicit-empty). `undefined` when no preview value is
   * known (bare module decl with no default, etc.).
   */
  preview?: string;
  /** Verbatim text inserted at the trigger position. */
  insertText: string;
  /**
   * When this candidate's name also appears at a higher-precedence scope,
   * the canonical label of that higher scope. Surfaces as "shadowed by …"
   * in the dropdown so the user understands which value will resolve.
   */
  shadowedBy?: string;
  /**
   * Module id this candidate came from, when `kind === "user"`. Plugin vars
   * leave this `undefined`.
   */
  moduleId?: string;
}

/**
 * Trigger shape returned by `getDoubleBraceTrigger`. `query` is the partial
 * identifier already typed after the `{{` (or after `{{vars.`) — used by the
 * IO seam to filter candidates without recomputing the whole list.
 *
 * `isVarsNamespace` is `true` when the user has already typed `{{vars.`
 * (forcing the candidate list to user vars). `false` when only `{{` has been
 * typed (mixed list).
 */
export interface DoubleBraceTrigger {
  /** Inclusive 0-based column where the trigger payload begins (the char after `{{`). */
  startCh: number;
  /** Exclusive 0-based column where the cursor sits (== query length + startCh). */
  endCh: number;
  /** Partial token already typed after `{{` or `{{vars.`. Empty when cursor is right after `{{`. */
  query: string;
  /** True when the user typed `{{vars.…` so far. */
  isVarsNamespace: boolean;
}

/**
 * Trigger shape returned by `getVarsBlockTrigger`. Carries the line/column
 * range to replace when the user accepts the snippet, plus the snippet's
 * desired text + cursor offsets.
 */
export interface VarsBlockTrigger {
  /** 0-based line number of the bullet line. */
  line: number;
  /** Inclusive start column of the replacement (typically right after `- `). */
  startCh: number;
  /** Exclusive end column of the replacement (line length when bullet is empty). */
  endCh: number;
  /** Snippet text to insert in place of `[startCh, endCh)`. */
  snippet: ObjectFormSnippet;
}

/**
 * Object-form vars-list entry snippet. `text` is the full literal to insert.
 * `cursorOffset` is a 0-based offset into `text` where the editor's caret
 * should land after insertion (the first placeholder).
 */
export interface ObjectFormSnippet {
  text: string;
  cursorOffset: number;
}

/**
 * Inputs to `getDoubleBraceTrigger`. Pure context — no Obsidian types.
 */
export interface CursorContext {
  /** The cursor's line, in raw form (no trailing newline). */
  lineText: string;
  /** 0-based column the cursor sits at. */
  ch: number;
}

/**
 * Inputs to the candidate union. Each entry list is optional — IO callers
 * pass empty arrays for absent layers.
 */
export interface CandidateContext {
  /** Module currently being edited (its `vars:` block). May be `null` if the file is a workflow file rather than a module. */
  currentModule?: WorkflowModule | null;
  /** Other modules — caller filters globals + per-project per the precedence layer. */
  globalModules?: readonly WorkflowModule[];
  projectModules?: readonly WorkflowModule[];
  /**
   * When `true`, restrict to user vars (caller passes when trigger is
   * `{{vars.…`). When `false`, return plugin vars + user vars.
   */
  varsNamespaceOnly?: boolean;
  /** Optional partial query — filters by `startsWith` (case-insensitive). */
  query?: string;
}

// ---------------------------------------------------------------------------
// `{{` trigger detection
// ---------------------------------------------------------------------------

/**
 * Detect a `{{` autocomplete trigger at `ctx.ch` on `ctx.lineText`. Returns
 * a populated `DoubleBraceTrigger` when the cursor is right after a `{{` or
 * inside an open `{{…` token; `null` otherwise.
 *
 * The match is greedy on the open token — we accept any prefix consisting of
 * lowercase letters / digits / underscores after the `{{`, plus an optional
 * `vars.` namespace marker. We refuse triggers with a closing `}}` between
 * the open and the cursor (the user has already finished a token; firing
 * autocomplete inside it would replace finished work).
 *
 * Pure — no editor reach.
 */
export function getDoubleBraceTrigger(ctx: CursorContext): DoubleBraceTrigger | null {
  const { lineText, ch } = ctx;
  if (ch < 2) return null;

  // Walk backward from the cursor to find a `{{` open token, refusing if we
  // encounter `}}` or a newline first. Cap the scan at ~64 chars to avoid
  // runaway behavior on absurdly long lines.
  let scan = ch;
  const minScan = Math.max(0, ch - 64);
  while (scan > minScan) {
    if (scan >= 2 && lineText.charAt(scan - 1) === "{" && lineText.charAt(scan - 2) === "{") {
      // Found `{{` — `scan` now points at the first char after `{{`.
      const payload = lineText.slice(scan, ch);
      // Refuse mid-payload `}` — the cursor is past the close.
      if (payload.includes("}")) return null;
      // Refuse whitespace inside the payload — that's text, not a token.
      if (/\s/.test(payload)) return null;
      // Refuse anything that isn't a valid identifier prefix (incl `vars.<…>`).
      if (!/^[a-z0-9_.]*$/i.test(payload)) return null;

      let isVarsNamespace = false;
      let queryStart = scan;
      let query = payload;
      const dotIdx = payload.indexOf(".");
      if (dotIdx !== -1) {
        const head = payload.slice(0, dotIdx);
        if (head !== "vars") return null; // only `vars.` namespace exists
        isVarsNamespace = true;
        queryStart = scan + dotIdx + 1;
        query = payload.slice(dotIdx + 1);
        // Refuse a second `.` in the query — `{{vars.foo.bar}}` isn't a thing.
        if (query.includes(".")) return null;
      }
      return {
        startCh: queryStart,
        endCh: ch,
        query,
        isVarsNamespace,
      };
    }
    if (lineText.charAt(scan - 1) === "}" && scan >= 2 && lineText.charAt(scan - 2) === "}") {
      // Found a `}}` close before any `{{` — we're outside a token.
      return null;
    }
    scan -= 1;
  }
  return null;
}

// ---------------------------------------------------------------------------
// `vars:` block trigger detection
// ---------------------------------------------------------------------------

/**
 * Detect a vars-block snippet trigger. The cursor must sit on a list-item
 * line (`- ` prefix) immediately under (any depth) a `vars:` mapping key in
 * the file's frontmatter. The bullet line must be empty after the `- ` —
 * otherwise we don't fire (autocomplete on a line the user has already typed
 * content into would clobber it).
 *
 * `lines` is the file split on `\n`; `cursor` is the cursor position. We use
 * line-array form rather than `String.split` internally because the IO seam
 * already has `editor.getLine(i)` available and we want the seam to feed us
 * a typed shape rather than re-splitting on every keystroke.
 */
export function getVarsBlockTrigger(args: {
  lines: readonly string[];
  cursor: { line: number; ch: number };
}): VarsBlockTrigger | null {
  const { lines, cursor } = args;
  if (cursor.line >= lines.length) return null;
  const lineText = lines[cursor.line];

  // The line must be a YAML list bullet `- ` with empty content after.
  const bulletMatch = /^(\s*-)\s*$/.exec(lineText);
  if (!bulletMatch) return null;
  const dashEnd = bulletMatch[1].length;
  // The trigger column is right after the dash — accept either `- ` (cursor
  // at dashEnd + 1) or `-` (cursor at dashEnd) on the bullet line.
  if (cursor.ch < dashEnd) return null;

  // Walk backwards in the file to find a `vars:` mapping key whose
  // indentation is shallower than the bullet's. Sibling bullets and deeper
  // nested content under the same `vars:` block don't terminate the walk —
  // only lines that pop OUT of the block (strictly shallower than our
  // bullet) do, and that's the line we expect to be `vars:`. Bail at the
  // frontmatter fence (`---`) or file start without finding it.
  const bulletIndent = lineText.length - lineText.trimStart().length;
  let inVarsBlock = false;
  for (let i = cursor.line - 1; i >= 0; i--) {
    const prev = lines[i];
    const trimmed = prev.trim();
    if (trimmed === "---") break;
    if (trimmed === "") continue;
    const prevIndent = prev.length - prev.trimStart().length;
    // Strictly shallower line — this is the parent mapping key. Verify it's
    // `vars:` and end the walk either way.
    if (prevIndent < bulletIndent) {
      if (/^vars\s*:\s*$/.test(trimmed)) inVarsBlock = true;
      break;
    }
    // prevIndent >= bulletIndent — keep walking (could be a sibling bullet,
    // or content deeper inside the same vars: block).
  }
  if (!inVarsBlock) return null;

  // Build the snippet. We pad the bullet's indentation forward into the
  // object form so YAML stays well-formed. Cursor lands on `<name>`.
  const indent = lineText.slice(0, dashEnd - 1);
  // The replacement starts right after `- `. We ensure exactly one space.
  const startCh = dashEnd + (lineText.charAt(dashEnd) === " " ? 1 : 0);
  const endCh = lineText.length;
  const snippet = buildObjectFormSnippet({ indent });
  return {
    line: cursor.line,
    startCh,
    endCh,
    snippet,
  };
}

/**
 * Object-form template per OP-202: emits `{ name: NAME, default: "" }` as the
 * baseline. Description is left as a separate optional quick-fix because most
 * authors won't fill it in immediately; surfacing it would clutter the
 * snippet for the common case.
 *
 * Indent is the leading whitespace of the bullet line (excluding the dash) —
 * unused by the inline-object form but accepted for forward-compat with a
 * block-form alternative we may add later.
 */
export function buildObjectFormSnippet(args: { indent?: string } = {}): ObjectFormSnippet {
  void args.indent; // reserved
  const text = `{ name: NAME, default: "" }`;
  // Cursor lands at the start of `NAME` so the user can replace it inline.
  const cursorOffset = text.indexOf("NAME");
  return { text, cursorOffset };
}

// ---------------------------------------------------------------------------
// Candidate union (plugin + user vars)
// ---------------------------------------------------------------------------

/**
 * Build the candidate list for a `{{` trigger. Pure data flow — caller
 * supplies the precedence-layer module lists; this function unions them,
 * applies the namespace filter, and de-duplicates with shadowing labels.
 *
 * Ordering: plugin vars first (registry order — already grouped by concern),
 * then user vars in highest-precedence-wins order. Shadowed entries are
 * dropped from the candidate list (the IO seam doesn't need to render them);
 * the surviving entry's `shadowedBy` field stays empty because we always
 * keep the topmost.
 *
 * Filtering by `query` is case-insensitive `startsWith`.
 */
export function buildCandidates(ctx: CandidateContext): VarCandidate[] {
  const out: VarCandidate[] = [];
  const seenNames = new Set<string>();
  const queryLower = (ctx.query ?? "").toLowerCase();

  // Plugin vars — only when the trigger isn't restricted to the `vars.` ns.
  if (!ctx.varsNamespaceOnly) {
    for (const entry of Object.values(PLUGIN_VAR_REGISTRY)) {
      if (queryLower && !entry.name.toLowerCase().startsWith(queryLower)) continue;
      out.push(pluginCandidate(entry));
      seenNames.add(`plugin:${entry.name}`);
    }
  }

  // User vars — walk in precedence order (highest first): project, global,
  // module. The "current module" is treated as part of the module layer.
  const layered: Array<{ scope: PrecedenceScope; sourceId: string; module: WorkflowModule }> = [];
  for (const m of ctx.projectModules ?? []) {
    layered.push({ scope: "project", sourceId: m.id, module: m });
  }
  for (const m of ctx.globalModules ?? []) {
    layered.push({ scope: "global", sourceId: m.id, module: m });
  }
  if (ctx.currentModule) {
    layered.push({ scope: "module", sourceId: ctx.currentModule.id, module: ctx.currentModule });
  }

  for (const { scope, sourceId, module } of layered) {
    for (const decl of module.vars) {
      if (queryLower && !decl.name.toLowerCase().startsWith(queryLower)) continue;
      const dedupKey = `user:${decl.name}`;
      if (seenNames.has(dedupKey)) continue;
      seenNames.add(dedupKey);
      out.push(userCandidate(decl, scope, sourceId));
    }
  }

  return out;
}

function pluginCandidate(entry: PluginVar): VarCandidate {
  return {
    name: entry.name,
    description: entry.description,
    kind: "plugin",
    sourceLabel: `Plugin (${precedenceScopeLabel("launch")})`,
    sourceAbbrev: `Plugin/${precedenceScopeAbbrev("launch")}`,
    preview: entry.example,
    insertText: `{{${entry.name}}}`,
  };
}

function userCandidate(
  decl: VarDecl,
  scope: PrecedenceScope,
  sourceId: string,
): VarCandidate {
  const description =
    (decl.kind === "object" && decl.description) ||
    `User-declared variable (declared in ${scopeSourcePhrase(scope, sourceId)}).`;
  const preview =
    decl.kind === "default"
      ? decl.value
      : decl.kind === "object"
        ? decl.default
        : undefined;
  return {
    name: decl.name,
    description,
    kind: "user",
    sourceLabel: precedenceScopeLabel(scope),
    sourceAbbrev: precedenceScopeAbbrev(scope),
    preview,
    insertText: `{{vars.${decl.name}}}`,
    moduleId: sourceId,
  };
}

function scopeSourcePhrase(scope: PrecedenceScope, sourceId: string): string {
  switch (scope) {
    case "module":
      return `module \`${sourceId}\``;
    case "global":
      return `global module \`${sourceId}\``;
    case "project":
      return `project module \`${sourceId}\``;
    case "launch":
      return "launch context";
  }
}

// ---------------------------------------------------------------------------
// File-path classification (pure)
// ---------------------------------------------------------------------------

const PROJECTS_ROOT = "Projects/";
const GLOBAL_MODULES_DIR = "Projects/_op-modules/";
const PER_PROJECT_MODULES_INFIX = "/MODULES/";
const WORKFLOW_FILENAME = "WORKFLOW.md";

export type WorkflowFileKind =
  | { kind: "global-module"; id: string }
  | { kind: "project-module"; slug: string; id: string }
  | { kind: "workflow"; slug: string };

/**
 * `true` iff the path is a workflow surface this extension should activate
 * on: a global module, a per-project module, or a per-project WORKFLOW.md.
 *
 * Pure — string-only, no vault reach. Mirrors the locations encoded in
 * `workflowModule.ts` + `workflowFile.ts`; keep both in lockstep when the
 * directory layout evolves.
 */
export function isWorkflowFile(path: string): boolean {
  return classifyWorkflowFile(path) !== null;
}

export function classifyWorkflowFile(path: string): WorkflowFileKind | null {
  if (!path.startsWith(PROJECTS_ROOT)) return null;
  if (path.startsWith(GLOBAL_MODULES_DIR)) {
    const rel = path.slice(GLOBAL_MODULES_DIR.length);
    if (rel.includes("/") || !rel.endsWith(".md")) return null;
    return { kind: "global-module", id: rel.slice(0, -3) };
  }
  if (path.endsWith(`/${WORKFLOW_FILENAME}`)) {
    const trimmed = path.slice(PROJECTS_ROOT.length);
    const slugEnd = trimmed.indexOf("/");
    if (slugEnd === -1) return null;
    const slug = trimmed.slice(0, slugEnd);
    return { kind: "workflow", slug };
  }
  const moduleIdx = path.indexOf(PER_PROJECT_MODULES_INFIX);
  if (moduleIdx === -1) return null;
  const before = path.slice(0, moduleIdx);
  const slugStart = before.lastIndexOf("/");
  if (slugStart === -1) return null;
  const slug = before.slice(slugStart + 1);
  if (!slug || before !== `${PROJECTS_ROOT.slice(0, -1)}/${slug}`) return null;
  const after = path.slice(moduleIdx + PER_PROJECT_MODULES_INFIX.length);
  if (after.includes("/") || !after.endsWith(".md")) return null;
  return { kind: "project-module", slug, id: after.slice(0, -3) };
}

// ---------------------------------------------------------------------------
// Keyed-map model affordance
// ---------------------------------------------------------------------------

/**
 * Gate for the keyed-map model affordance per OP-202. The affordance is
 * shown when:
 *
 *   - The workflow declares more than one agent in `default_agent` (so
 *     per-agent assignment is meaningful), AND
 *   - `default_model` is currently `kind: "all"` (a scalar or list applied
 *     to every agent — i.e. not yet a per-agent map).
 *
 * Pure — caller hands in a parsed `WorkflowFile`.
 */
export function keyedMapApplies(args: {
  defaultAgent: readonly string[];
  defaultModel: { kind: "all"; values: readonly string[] } | { kind: "perAgent"; perAgent: Readonly<Record<string, readonly string[]>> };
}): boolean {
  if (args.defaultAgent.length < 2) return false;
  return args.defaultModel.kind === "all";
}

/**
 * Normalize a frontmatter `default_agent` value into a string array. Scalars
 * yield a single-element array; arrays are kept verbatim with non-string
 * entries dropped. Anything else yields an empty array.
 */
export function readAgentList(raw: unknown): string[] {
  if (typeof raw === "string") {
    const t = raw.trim();
    return t ? [t] : [];
  }
  if (Array.isArray(raw)) {
    return raw
      .filter((v): v is string => typeof v === "string")
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
  }
  return [];
}

/**
 * Normalize a frontmatter `default_model` value when it's still in scalar/list
 * shape. Returns `null` when the value is already a keyed map (an object that
 * isn't an array) — caller treats that as "no conversion needed".
 */
export function readModelScalarOrList(raw: unknown): string[] | null {
  if (typeof raw === "string") {
    const t = raw.trim();
    return t ? [t] : [];
  }
  if (Array.isArray(raw)) {
    return raw
      .filter((v): v is string => typeof v === "string")
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
  }
  if (raw && typeof raw === "object") return null;
  return [];
}

/**
 * Render a per-agent keyed-map block from a current scalar/list value. Each
 * agent in `defaultAgent` is seeded with the same model values the caller is
 * upgrading from — the user typically tweaks one agent's row right after
 * accepting the affordance. Single-value vs list is preserved per row.
 *
 * Output is a YAML mapping fragment (no leading `default_model:` key — the
 * caller writes that). Indentation is two spaces per level, matching the
 * project's existing schema docs.
 */
export function renderPerAgentKeyedMap(args: {
  defaultAgent: readonly string[];
  modelValues: readonly string[];
}): string {
  const { defaultAgent, modelValues } = args;
  const lines: string[] = [];
  for (const agent of defaultAgent) {
    if (modelValues.length === 0) {
      lines.push(`  ${agent}: ""`);
    } else if (modelValues.length === 1) {
      lines.push(`  ${agent}: ${modelValues[0]}`);
    } else {
      lines.push(`  ${agent}:`);
      for (const v of modelValues) {
        lines.push(`    - ${v}`);
      }
    }
  }
  return lines.join("\n");
}
