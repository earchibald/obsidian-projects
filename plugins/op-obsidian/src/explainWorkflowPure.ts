// Pure payload-builder for `op-explain-workflow`. OP-203 (3c).
//
// Reads a `ComposedPrompt` (from OP-197's `composeWorkflow`) plus the
// `RenderContext` the launcher would have built and produces the structured
// JSON payload the CLI writes to `Projects/_scratch/op-last-response.md`. The
// payload is the same shape the dry-run preview surface (OP-206) consumes —
// `composed.text` is byte-identical to what the launcher would inject, by
// construction.
//
// Per-var precedence breakdown reads directly from
// `ComposedPrompt.perVarSourceMap` rather than the diagnostic stream:
// diagnostics carry `precedenceScope` only on resolution failures, but every
// referenced var deserves a row regardless of outcome. Declared-but-
// unreferenced vars surface through the existing `malformed-frontmatter` info
// diagnostic (OP-197) — we don't synthesize extra rows for them so the
// formatter contract stays the only source of "things to surface".
//
// Pure: no Obsidian imports, no I/O, no clock. Every input flows in via
// arguments.

import type { ComposedPrompt, UserVarScope, UserVarSource } from "./composeWorkflowPure";
import type { RenderContext } from "./pluginVarRegistry";
import type { WorkflowDiagnostic } from "./workflowDiagnostic";
import {
  diagnosticToBlock,
  diagnosticToLine,
  formatDiagnostics,
  PRECEDENCE_SCOPES,
  type FormattedDiagnostic,
  type PrecedenceScopeAbbrev,
  type PrecedenceScopeLabel,
} from "./workflowDiagnosticFormat";

/**
 * One per referenced user var in the composed prompt. `scope` / `scopeLabel` /
 * `scopeAbbrev` are `null` when the var resolved to no value at any layer —
 * the row still exists so callers can see the unresolved name in the breakdown.
 */
export interface ExplainVarRow {
  name: string;
  value: string | null;
  /**
   * Lowest-level precedence layer that supplied the resolved value. Mirrors
   * the composer's `UserVarScope` so structured consumers can switch on it
   * without re-parsing the human label.
   */
  scope: UserVarScope | null;
  /** Full canonical name for primary copy. Per OP-201, this is what user-visible text shows. */
  scopeLabel: PrecedenceScopeLabel | null;
  /** Compact abbreviation for tooltip-only consumers. NEVER paired with primary copy. */
  scopeAbbrev: PrecedenceScopeAbbrev | null;
  /** Identifier of the supplying source — module id, "global", project slug, "launch", or "(unset)". */
  source: string;
}

/** One per ordered chunk in the composed prompt. Mirrors `ComposedChunk` minus the body text. */
export interface ExplainChunkRow {
  moduleId: string;
  scope: string;
  sizeChars: number;
}

/**
 * Structured payload for `op-explain-workflow`. Written verbatim into the
 * `op-last-response.md` JSON; CLI prose is derived from this shape via
 * `diagnosticToLine` / `diagnosticToBlock`.
 */
export interface ExplainWorkflowPayload {
  /** Issue id passed in via `issue=`. */
  issueId: string;
  /** Project slug derived from the issue's `project:` frontmatter. */
  project: string;
  /** Workflow step id this composition targeted (the `mode=` arg). */
  mode: string;
  /** Agent id used for the render context (from `agent=` arg or the issue's frontmatter). */
  agent: string;
  /** Resolved model id when one was selected for this launch context. */
  model?: string;
  composed: {
    /** Verbatim from `ComposedPrompt.text` — same string the launcher would inject. */
    text: string;
    sizeChars: number;
    chunks: ExplainChunkRow[];
  };
  /** One row per referenced user var. Sorted by name for stable golden output. */
  vars: ExplainVarRow[];
  /** Every diagnostic, formatted through the unified 3a formatter. */
  diagnostics: FormattedDiagnostic[];
  /** One-line prose rendering per diagnostic — the same shape `op-list-vars` and the dry-run banner emit. */
  diagnosticLines: string[];
  /** Multi-line block rendering per diagnostic, joined with blank lines. Empty when no diagnostics. */
  diagnosticBlocks: string;
}

export interface BuildExplainPayloadArgs {
  issueId: string;
  project: string;
  mode: string;
  context: RenderContext;
  composed: ComposedPrompt;
}

/**
 * Build the structured payload from a composer result + the launch context.
 * Pure: input → output, no side effects. `composed.diagnostics` is run through
 * the unified formatter exactly once and the prose lines are derived from the
 * formatted records, so editor squiggles, the dry-run banner, and this CLI all
 * agree byte-for-byte on what they show.
 */
export function buildExplainPayload(args: BuildExplainPayloadArgs): ExplainWorkflowPayload {
  const { issueId, project, mode, context, composed } = args;

  const chunks: ExplainChunkRow[] = composed.orderedChunks.map((c) => ({
    moduleId: c.moduleId,
    scope: c.scope,
    sizeChars: c.sizeChars,
  }));

  const vars: ExplainVarRow[] = Object.entries(composed.perVarSourceMap)
    .map(([name, source]) => varRow(name, source))
    .sort((a, b) => a.name.localeCompare(b.name));

  const formatted = formatDiagnostics(composed.diagnostics);
  const diagnosticLines = composed.diagnostics.map(diagnosticToLine);
  const diagnosticBlocks = composed.diagnostics.map(diagnosticToBlock).join("\n\n");

  const payload: ExplainWorkflowPayload = {
    issueId,
    project,
    mode,
    agent: context.agent,
    composed: {
      text: composed.text,
      sizeChars: composed.sizeChars,
      chunks,
    },
    vars,
    diagnostics: formatted,
    diagnosticLines,
    diagnosticBlocks,
  };
  if (context.model !== undefined) payload.model = context.model;
  return payload;
}

function varRow(name: string, source: UserVarSource): ExplainVarRow {
  if (source.scope === null) {
    return {
      name,
      value: source.value,
      scope: null,
      scopeLabel: null,
      scopeAbbrev: null,
      source: source.source,
    };
  }
  const entry = PRECEDENCE_SCOPES[source.scope];
  return {
    name,
    value: source.value,
    scope: source.scope,
    scopeLabel: entry.label,
    scopeAbbrev: entry.abbrev,
    source: source.source,
  };
}

/**
 * One-line summary suitable for the CLI's stdout one-liner. Compact: counts of
 * referenced vars + per-severity diagnostic counts + composed size. The full
 * structured payload remains in `op-last-response.md`.
 */
export function summarizeExplainPayload(p: ExplainWorkflowPayload): string {
  const counts = severityCounts(p.diagnostics);
  return (
    `op-explain-workflow: ${p.issueId} mode=${p.mode} agent=${p.agent}` +
    ` → ${p.composed.sizeChars} chars, ${p.vars.length} var${p.vars.length === 1 ? "" : "s"},` +
    ` ${counts.error}E/${counts.warning}W/${counts.info}I diagnostics`
  );
}

function severityCounts(ds: readonly FormattedDiagnostic[]): {
  error: number;
  warning: number;
  info: number;
} {
  const out = { error: 0, warning: 0, info: 0 };
  for (const d of ds) out[d.severity] += 1;
  return out;
}

/**
 * Walk `PRECEDENCE_SCOPES` to surface every layer's canonical label as
 * structured data — used by callers (Settings reference panel, future doc
 * generators) that want to render the precedence ladder without hardcoding the
 * names.
 */
export function precedenceLadder(): Array<{
  scope: UserVarScope;
  label: PrecedenceScopeLabel;
  abbrev: PrecedenceScopeAbbrev;
}> {
  const order: UserVarScope[] = ["module", "global", "project", "launch"];
  return order.map((scope) => {
    const entry = PRECEDENCE_SCOPES[scope];
    return { scope, label: entry.label, abbrev: entry.abbrev };
  });
}
