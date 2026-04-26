// Pure payload-builder for `op-list-vars`. OP-203 (3c).
//
// Walks the `PLUGIN_VAR_REGISTRY` and emits each entry's `name`, `description`,
// `example`, plus the optional current value resolved against a `RenderContext`
// when the caller supplied one. Used by the Settings panel's "Available
// variables" reference (when context-less) and by `op-explain-workflow` /
// future doc generators that want to bundle the registry into their output.
//
// Pure: no Obsidian imports, no I/O, no clock.

import { PLUGIN_VAR_REGISTRY, type PluginVar, type RenderContext } from "./pluginVarRegistry";

/**
 * One row per registry entry. `currentValue` is `null` when context-less or
 * when the var's `compute` returned `undefined` for the supplied context.
 */
export interface ListVarRow {
  name: string;
  description: string;
  example: string;
  currentValue: string | null;
}

/** Optional context for the resolved-value column. Either a full `RenderContext` or a partial. */
export type ListVarsContext = Partial<RenderContext> | undefined;

export interface ListVarsPayload {
  /** When `context` is supplied, mirrors the keys we successfully resolved off it. */
  context: ListVarsContextSummary;
  vars: ListVarRow[];
}

export interface ListVarsContextSummary {
  /** `true` when the caller provided a context (even an empty `{}`); `false` for the registry-only path. */
  hasContext: boolean;
  /** Selection of context fields that drove resolution — surfaces in the JSON for debugging. */
  issueId?: string;
  project?: string;
  agent?: string;
  mode?: string;
  model?: string;
}

/**
 * Build the payload. When `context` is `undefined`, every `currentValue` is
 * `null` and `context.hasContext` is `false`. When `context` is provided, each
 * registry entry's `compute` is called with it; `undefined` returns map to
 * `null` (not the literal string "undefined") so the JSON serialization stays
 * machine-readable.
 *
 * Output order matches `PLUGIN_VAR_REGISTRY` insertion order (identity →
 * links → repo/vault → run context). This is the same order the Settings
 * reference panel lists, so the CLI's golden snapshot doubles as documentation
 * that "what you see in the panel = what you see in the CLI".
 */
export function buildListVarsPayload(context?: ListVarsContext): ListVarsPayload {
  const hasContext = context !== undefined;
  const ctxForCompute: Partial<RenderContext> = context ?? {};

  const vars: ListVarRow[] = Object.values(PLUGIN_VAR_REGISTRY).map((entry) =>
    rowFor(entry, hasContext, ctxForCompute),
  );

  const summary: ListVarsContextSummary = { hasContext };
  if (hasContext) {
    if (typeof ctxForCompute.id === "string") summary.issueId = ctxForCompute.id;
    if (typeof ctxForCompute.project === "string") summary.project = ctxForCompute.project;
    if (typeof ctxForCompute.agent === "string") summary.agent = ctxForCompute.agent;
    if (typeof ctxForCompute.mode === "string") summary.mode = ctxForCompute.mode;
    if (typeof ctxForCompute.model === "string") summary.model = ctxForCompute.model;
  }

  return { context: summary, vars };
}

function rowFor(entry: PluginVar, hasContext: boolean, ctx: Partial<RenderContext>): ListVarRow {
  const row: ListVarRow = {
    name: entry.name,
    description: entry.description,
    example: entry.example,
    currentValue: null,
  };
  if (!hasContext) return row;
  const computed = entry.compute(ctx);
  row.currentValue = computed === undefined ? null : computed;
  return row;
}

/**
 * Compact one-line summary for stdout. Counts the rows that resolved to a
 * concrete value vs. those that came back null. CLI emits this; the full
 * structured payload remains in `op-last-response.md`.
 */
export function summarizeListVarsPayload(p: ListVarsPayload): string {
  if (!p.context.hasContext) {
    return `op-list-vars: ${p.vars.length} registry entries (no context)`;
  }
  const resolved = p.vars.filter((v) => v.currentValue !== null).length;
  const ctx = p.context;
  const ctxParts: string[] = [];
  if (ctx.issueId) ctxParts.push(`issue=${ctx.issueId}`);
  if (ctx.project) ctxParts.push(`project=${ctx.project}`);
  if (ctx.agent) ctxParts.push(`agent=${ctx.agent}`);
  if (ctx.mode) ctxParts.push(`mode=${ctx.mode}`);
  const ctxTail = ctxParts.length ? ` for ${ctxParts.join(" ")}` : "";
  return `op-list-vars: ${resolved}/${p.vars.length} resolved${ctxTail}`;
}
