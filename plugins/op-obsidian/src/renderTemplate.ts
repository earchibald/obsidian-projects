import { PLUGIN_VAR_REGISTRY, type RenderContext } from "./pluginVarRegistry";
import type { WorkflowDiagnostic } from "./workflowDiagnostic";

// Generic `{{var}}` template renderer. Pure function — no I/O, no clock, no
// vault reads. Replaces the ad-hoc `\{\{id\}\}` regex `renderSkillTrigger`
// used to carry, so every prompt-shaping callsite (skill-trigger today,
// composed-module bodies in 1d) goes through the same code path with the
// same diagnostic contract.
//
// Token shape: `{{ name }}` — name is `[a-zA-Z_][a-zA-Z0-9_]*`. Whitespace
// inside the braces is allowed and trimmed (including newlines, since `\s*`
// matches `\n`). Tokens that don't match this shape (e.g., `{{ foo-bar }}`,
// `{{vars.x}}`, `{{}}`) are left verbatim by this pass — 1b/1c handle the
// `vars.<name>` namespace separately.
//
// Resolution: looks up `name` in `PLUGIN_VAR_REGISTRY`; calls `compute(ctx)`.
// On `undefined` (compute returned undefined) or unknown name (no registry
// entry), the token is left verbatim and a `missing-var` diagnostic is
// recorded. Verbatim fallback is a soft failure — never silently corrupts a
// prompt with empty strings, never throws on a typo'd name.
//
// Idempotency: the renderer is a fixed point for *fully-resolved* strings —
// re-rendering a string whose every substitution produced a value with no
// `{{...}}`-shaped substrings leaves text and diagnostics unchanged. If a
// resolved value itself contains `{{name}}`-shaped text (e.g., a title like
// "Use {{id}} in prose"), the next pass will attempt to resolve those inner
// tokens. This is intentional: `{{title}}` is replaced in the first pass;
// the caller controls whether to run additional passes. Single-pass rendering
// is the common case; the verbatim fallback guards against partial expansion
// producing a silently-garbled output.

export interface RenderResult {
  text: string;
  diagnostics: WorkflowDiagnostic[];
}

const TOKEN_RE = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

/**
 * Render a template string against a context. Accepts `Partial<RenderContext>`
 * so callers that only have a fragment of the full context (e.g., the legacy
 * `renderSkillTrigger` callsite, which only knows the issue id and agent)
 * can still render — fields the ctx doesn't supply are treated as undefined
 * by `PluginVar.compute`, which surfaces a `missing-var` diagnostic and
 * leaves the token verbatim. Full-context callers (1d's composer) will pass
 * a full `RenderContext` and see no spurious diagnostics.
 */
export function renderTemplate(text: string, ctx: Partial<RenderContext>): RenderResult {
  const diagnostics: WorkflowDiagnostic[] = [];

  const next = text.replace(TOKEN_RE, (match, rawName: string) => {
    const name = rawName.trim();
    const entry = PLUGIN_VAR_REGISTRY[name];
    if (!entry) {
      diagnostics.push({
        code: "missing-var",
        severity: "warning",
        message: `Unknown variable {{${name}}} — left verbatim. Add an entry to pluginVarRegistry.ts (always-on var) or declare it as a user var (vars.${name}).`,
        varName: name,
        // `syntax: "plugin"` lets the editor locator try `{{name}}` first so it
        // doesn't accidentally squiggle a `{{vars.name}}` user-var token that
        // happens to share the same name but is declared and resolves fine.
        extra: { syntax: "plugin" },
      });
      return match;
    }
    const value = entry.compute(ctx);
    if (value === undefined) {
      diagnostics.push({
        code: "missing-var",
        severity: "warning",
        message: `Variable {{${name}}} resolved to undefined for this context — left verbatim.`,
        varName: name,
        extra: { syntax: "plugin" },
      });
      return match;
    }
    return value;
  });

  return { text: next, diagnostics };
}
