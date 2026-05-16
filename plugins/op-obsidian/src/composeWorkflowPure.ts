import {
  PLUGIN_VAR_REGISTRY,
  type RenderContext,
} from "./pluginVarRegistry";
import { renderTemplate } from "./renderTemplate";
import type { WorkflowDiagnostic } from "./workflowDiagnostic";
import type { VarDecl, WorkflowModule } from "./workflowModulePure";
import type { WorkflowFile, WorkflowStep } from "./workflowFilePure";
import { slugifySkillName } from "./lazySkillPure";

// Pure composition: turn the (loaded modules, parsed workflow file, mode,
// render context) tuple into a single composed prompt with per-var source
// tracking and a unified diagnostic stream. OP-197 (1d) — final grandchild of
// OP-184. No I/O, no clock, no Obsidian imports — every input flows in via
// arguments. The IO seam (`loadModuleSources` in `composeWorkflow.ts`) reads
// vault TFiles + bodies and hands the result to `composeWorkflow` defined here.
//
// Precedence (lowest → highest, later wins): Module → Global → Project → Launch.
//   - Module: a module's `vars: [name=value]` declaration (OP-195 schema).
//   - Global: vault-wide user vars (OP-181 plan §"Variable precedence" — lives
//             in `settings.workflowVars`; the wiring lands in OP-198).
//   - Project: per-project user vars (`STATUS.md` `vars:` map).
//   - Launch: per-launch overrides threaded through the launch UI / URI / CLI.
//
// Always-on plugin vars (OP-194's `PLUGIN_VAR_REGISTRY`) live exclusively at
// the Launch-override scope — they're computed per-launch from `RenderContext`
// and shadow any same-named lower-precedence value. The composer resolves user
// vars first (substituting `{{vars.<name>}}` tokens), then runs the OP-194
// renderer for `{{<name>}}` plugin-var tokens. This ordering means a user var
// can never accidentally shadow `{{id}}` or `{{branch}}`; the namespaces are
// disjoint by token shape.
//
// Diagnostics this composer emits (in addition to whatever the loader passed
// through):
//   - `missing-var` (warning): a `{{vars.<name>}}` token resolved to nothing
//     at every precedence layer.
//   - `missing-var` (warning): an `{{<name>}}` plugin-var token had no entry
//     in `PLUGIN_VAR_REGISTRY` or its compute returned `undefined`. (Re-emitted
//     by the OP-194 renderer; surfaced through here.)
//   - `malformed-frontmatter` (info): a module declared a var (`vars: [foo]`)
//     that its body never references — surfaces as info because the unused
//     declaration is harmless but worth flagging.
//   - `malformed-frontmatter` (warning): a module body references `{{vars.foo}}`
//     but no module at any scope declared `foo` — distinct from `missing-var`
//     ("declared somewhere but no value resolved" vs "never declared anywhere"
//     — OP-197 scope explicitly calls this out as undeclared-but-referenced).
//   - One info-severity `WorkflowDiagnostic` when the composed prompt's total
//     character count exceeds `ctx.maxWorkflowChars` (OP-181 Risk 1 mitigation).
//
// Returns a `ComposedPrompt` carrying the joined text, the per-chunk
// breakdown (for surfaces that want to show "module X contributed Y chars"),
// the per-user-var source map (for the dry-run / preview surface in OP-186),
// the total size, and the diagnostic stream.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Precedence layer a user-var value resolved from. Lowest → highest. */
export type UserVarScope = "module" | "global" | "project" | "launch";

/**
 * Where a single resolved user-var value came from. Surfaced on
 * `ComposedPrompt.perVarSourceMap` so dry-run / preview surfaces can show
 * "this value came from the global default, not the module's default".
 */
export interface UserVarSource {
  /** Resolved value (may be `null` if every layer was empty). */
  value: string | null;
  /** Layer that supplied the resolved value, or `null` when no layer did. */
  scope: UserVarScope | null;
  /** Identifier of the layer source — module id for `module`, "global" / project slug / "launch" otherwise. */
  source: string;
}

/**
 * One module's contribution to the composed prompt.
 */
export interface ComposedChunk {
  moduleId: string;
  scope: string;
  text: string;
  sizeChars: number;
}

/**
 * One `lazy: true` module, fully rendered, ready to be written as a Claude
 * Code skill by the IO layer (`emitLazySkills.ts`). Not part of the inlined
 * prompt `text`.
 */
export interface LazySkill {
  /** Module id (post-shadowing). */
  id: string;
  /** Derived, Claude-Code-valid skill name (`op-module-<id>` slugified). */
  name: string;
  /** SKILL.md `description:` — module.description, else module.title. */
  description: string;
  /** Fully var-resolved module body. */
  body: string;
}

/**
 * Result of `composeWorkflow`. Pure data — no methods, no live references.
 */
export interface ComposedPrompt {
  /** Joined text of every ordered chunk, separated by `\n\n`. */
  text: string;
  orderedChunks: ComposedChunk[];
  /** OP-192: `lazy: true` modules, partitioned out of `text`. Empty when no
   *  composed module is lazy. */
  lazySkills: LazySkill[];
  /**
   * For every user var referenced during this composition pass — including vars
   * referenced only in `lazy: true` module bodies, which are partitioned out of
   * `orderedChunks`/`text` but still rendered — the resolved value + the
   * precedence layer that supplied it. Vars never referenced are absent from
   * the map. To see only vars feeding the inlined prompt, cross-reference
   * `orderedChunks` module ids against the module declarations.
   */
  perVarSourceMap: Record<string, UserVarSource>;
  /**
   * UTF-16 code-unit count of `text` (i.e., `text.length`). This matches
   * JavaScript's `String.prototype.length` semantics — characters outside the
   * Basic Multilingual Plane (e.g. emoji) count as 2. Sufficient for the
   * informational size-budget guardrail; do not use for token-accurate
   * billing estimates.
   */
  sizeChars: number;
  diagnostics: WorkflowDiagnostic[];
}

/**
 * One pre-loaded module — the IO layer attaches its body content; the pure
 * composer reads `module.vars` for declarations and `body` for substitution.
 */
export interface LoadedModule {
  module: WorkflowModule;
  body: string;
}

/**
 * Composition input. The plugin-var context lives at `render`; user-var
 * scopes (Global, Project, Launch) come in as keyed maps so the composer
 * can flatten them into the precedence chain. `maxWorkflowChars` is the
 * size-budget cap (info-only).
 */
export interface ComposeContext {
  /** Plugin-var context — drives OP-194's `renderTemplate`. */
  render: RenderContext;
  /** Vault-wide user vars (OP-198 wires this from `settings.workflowVars`). */
  globalVars?: Record<string, string>;
  /** Per-project user vars (OP-198 wires this from `STATUS.md`). */
  projectVars?: Record<string, string>;
  /** Per-launch user vars (OP-186 / OP-198 wires this from launch UI / URI). */
  launchVars?: Record<string, string>;
  /** Soft cap — exceeding it surfaces an info-severity diagnostic. Default: 50000. */
  maxWorkflowChars?: number;
}

/**
 * Step selector. The composer reads the step record's `modules:` list and
 * filters the loaded module set by id; legacy synthetic steps with a
 * `legacyKickoffBody` are spliced in verbatim.
 */
export interface ComposeArgs {
  /** All modules the loader discovered, paired with their body content. */
  loadedModules: LoadedModule[];
  /** Parsed (post-merge) workflow file. */
  workflow: WorkflowFile;
  /** Step id to compose. Must exist in `workflow.steps`. */
  step: string;
  /** Render context + user-var scopes + budget. */
  ctx: ComposeContext;
}

// ---------------------------------------------------------------------------
// Defaults + helpers
// ---------------------------------------------------------------------------

export const DEFAULT_MAX_WORKFLOW_CHARS = 50000;

/**
 * Token shape for `{{vars.<name>}}`. Conservative `[a-zA-Z_][a-zA-Z0-9_-]*`
 * name pattern — allows `-` so module authors can write `{{vars.repo-path}}`
 * if they prefer hyphenated names. Whitespace inside the braces is tolerated.
 *
 * Factory function — returns a *fresh* `RegExp` instance each time. The `g`
 * flag makes the object stateful (`lastIndex` advances with every `exec`), so
 * a module-level shared regex is a footgun: any new call-site that starts
 * iterating before the previous one finishes would reset `lastIndex` beneath
 * the first caller. Returning a new instance per call eliminates the shared
 * state entirely.
 */
function newUserVarTokenRe(): RegExp {
  return /\{\{\s*vars\.([a-zA-Z_][a-zA-Z0-9_-]*)\s*\}\}/g;
}

/**
 * Extract every `vars.<name>` referenced in `text`. Returns a `Set<string>`
 * of unique names (order not preserved — the renderer walks left-to-right).
 */
function extractUserVarRefs(text: string): Set<string> {
  const names = new Set<string>();
  const re = newUserVarTokenRe();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    names.add(m[1]);
  }
  return names;
}

/**
 * Pull the inline default off a `VarDecl`. `bare` declarations have none.
 */
function moduleVarDefault(v: VarDecl): string | null {
  if (v.kind === "bare") return null;
  if (v.kind === "default") return v.value;
  if (v.kind === "object") return v.default ?? null;
  return null;
}

// ---------------------------------------------------------------------------
// Precedence resolver
// ---------------------------------------------------------------------------

interface ResolveUserVarArgs {
  name: string;
  modulesDeclaringIt: WorkflowModule[];
  globalVars: Record<string, string>;
  projectVars: Record<string, string>;
  launchVars: Record<string, string>;
}

/**
 * Resolve one user var through the precedence chain. Later wins. Returns the
 * value + the supplying scope (or `null, null` if every layer was empty).
 */
function resolveUserVar(args: ResolveUserVarArgs): UserVarSource {
  const { name, modulesDeclaringIt, globalVars, projectVars, launchVars } = args;

  // Start with the lowest precedence; walk up. The latest non-undefined wins.
  let value: string | null = null;
  let scope: UserVarScope | null = null;
  let source = "(unset)";

  // Module default(s). If multiple modules declare the same var with a
  // default, OP-195's intra-scope-collision validator already flagged the
  // problem; the composer takes the first declaration deterministically (by
  // module id sort) so a stale collision doesn't change rendering.
  if (modulesDeclaringIt.length > 0) {
    const sorted = [...modulesDeclaringIt].sort((a, b) => a.id.localeCompare(b.id));
    for (const m of sorted) {
      const decl = m.vars.find((v) => v.name === name);
      if (!decl) continue;
      const def = moduleVarDefault(decl);
      if (def !== null) {
        value = def;
        scope = "module";
        source = m.id;
        break;
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(globalVars, name)) {
    value = globalVars[name];
    scope = "global";
    source = "global";
  }

  if (Object.prototype.hasOwnProperty.call(projectVars, name)) {
    value = projectVars[name];
    scope = "project";
    source = "project";
  }

  if (Object.prototype.hasOwnProperty.call(launchVars, name)) {
    value = launchVars[name];
    scope = "launch";
    source = "launch";
  }

  return { value, scope, source };
}

// ---------------------------------------------------------------------------
// Module body renderer
// ---------------------------------------------------------------------------

interface RenderModuleArgs {
  module: WorkflowModule;
  body: string;
  /** All loaded modules — used to detect "declared somewhere but never referenced" cases. */
  allModulesByVarName: Map<string, WorkflowModule[]>;
  /** Pre-resolved user-var values (the same map ends up on `ComposedPrompt`). */
  perVarSourceMap: Record<string, UserVarSource>;
  ctx: ComposeContext;
}

interface RenderedModule {
  text: string;
  diagnostics: WorkflowDiagnostic[];
}

/**
 * Render a single module body. Two passes:
 *   1. Replace `{{vars.<name>}}` tokens via the resolved user-var map. Tokens
 *      that resolve to a value substitute. Tokens whose user var resolved to
 *      no value at any scope leave the token verbatim and emit either
 *      `missing-var` (warning) — declared somewhere but no value resolved —
 *      or `malformed-frontmatter` (warning, message: "undeclared but
 *      referenced") — never declared anywhere.
 *   2. Run OP-194's `renderTemplate` for plugin-var tokens (`{{id}}`, etc.).
 *      Diagnostics from renderTemplate are concatenated into the chunk's
 *      diagnostics.
 *
 * Always-on plugin vars (OP-194 registry) take precedence over user vars
 * sharing the same name only by *namespace* — `{{id}}` is plugin, `{{vars.id}}`
 * is user. The token shapes are disjoint, so there's no actual conflict; the
 * disjointness is the design.
 */
function renderModule(args: RenderModuleArgs): RenderedModule {
  const { module, body, allModulesByVarName, perVarSourceMap, ctx } = args;
  const diagnostics: WorkflowDiagnostic[] = [];

  // Pass 1: user-var substitution.
  const passOne = body.replace(newUserVarTokenRe(), (match, rawName: string) => {
    const name = rawName.trim();
    const source = perVarSourceMap[name];
    if (source && source.value !== null) {
      return source.value;
    }
    // No value resolved. Distinguish "declared but unset" from "undeclared".
    const declarers = allModulesByVarName.get(name) ?? [];
    if (declarers.length > 0) {
      diagnostics.push({
        code: "missing-var",
        severity: "warning",
        message: `Variable {{vars.${name}}} resolved to no value at any precedence layer in module ${module.id} — left verbatim. Set a default in a module's \`vars:\` declaration, in global settings, in the project's STATUS.md, or as a launch override.`,
        moduleId: module.id,
        varName: name,
      });
    } else {
      diagnostics.push({
        code: "malformed-frontmatter",
        severity: "warning",
        message: `Variable {{vars.${name}}} referenced in module ${module.id} but never declared in any module's \`vars:\` block — left verbatim. Add a declaration to a module so the value can be supplied at one of the four precedence layers.`,
        moduleId: module.id,
        varName: name,
      });
    }
    return match;
  });

  // Pass 2: plugin-var substitution via OP-194's renderTemplate.
  const rendered = renderTemplate(passOne, ctx.render);
  for (const d of rendered.diagnostics) {
    diagnostics.push({ ...d, moduleId: d.moduleId ?? module.id });
  }

  // Declared-but-unused check: walk the module's vars: declarations; any name
  // not referenced in the *original* body emits an info-severity diagnostic.
  const refs = extractUserVarRefs(body);
  for (const decl of module.vars) {
    if (!refs.has(decl.name)) {
      diagnostics.push({
        code: "malformed-frontmatter",
        severity: "info",
        message: `Module ${module.id} declares \`vars: [${decl.name}]\` but the body never references {{vars.${decl.name}}} — declaration is unused.`,
        moduleId: module.id,
        varName: decl.name,
      });
    }
  }

  return { text: rendered.text, diagnostics };
}

// ---------------------------------------------------------------------------
// Top-level composer
// ---------------------------------------------------------------------------

/**
 * Compose the prompt for one (workflow, step, ctx) tuple. Pure, sync.
 *
 * Algorithm:
 *   1. Find the named step in `workflow.steps`. Missing → returns a
 *      `schema-mismatch` diagnostic and an empty `ComposedPrompt`.
 *   2. If the step is the synthesised legacy kickoff (`legacyKickoffBody`),
 *      splice it inline — no module composition.
 *   3. Otherwise: walk `step.modules`, look up each id in `loadedModules`,
 *      compose in declared order. Missing module ids emit `unknown-module`.
 *   4. Resolve every referenced user var through the precedence chain once,
 *      then render every module's body with the resolved map.
 *   5. Join chunk texts with `\n\n`. Emit the size-budget info diagnostic if
 *      the total exceeds `ctx.maxWorkflowChars`.
 */
export function composeWorkflow(args: ComposeArgs): ComposedPrompt {
  const { loadedModules, workflow, step, ctx } = args;
  const diagnostics: WorkflowDiagnostic[] = [];

  const stepRecord = workflow.steps.find((s) => s.step === step);
  if (!stepRecord) {
    diagnostics.push({
      code: "schema-mismatch",
      severity: "error",
      message: `composeWorkflow: workflow ${workflow.source.path} has no step "${step}".`,
      stepId: step,
      extra: { path: workflow.source.path, step },
    });
    return emptyComposed(diagnostics);
  }

  // Legacy kickoff: synthesised step that wraps the entire WORKFLOW.md body.
  // OP-196 produces this when the file matches one of legacy shapes 1/2/3/5.
  // The composer splices the body verbatim — no template substitution because
  // legacy bodies predate the {{var}} contract.
  if (stepRecord.legacyKickoffBody !== undefined) {
    const text = stepRecord.legacyKickoffBody;
    const chunk: ComposedChunk = {
      moduleId: "<legacy-kickoff>",
      scope: stepRecord.step,
      text,
      sizeChars: text.length,
    };
    return finaliseComposed({
      orderedChunks: [chunk],
      lazySkills: [],
      perVarSourceMap: {},
      diagnostics,
      maxChars: ctx.maxWorkflowChars ?? DEFAULT_MAX_WORKFLOW_CHARS,
    });
  }

  // Modern step: look up each module by id, in the order the step lists them.
  const moduleById = new Map<string, LoadedModule>();
  for (const lm of loadedModules) moduleById.set(lm.module.id, lm);

  const orderedModules: LoadedModule[] = [];
  for (const id of stepRecord.modules) {
    const lm = moduleById.get(id);
    if (!lm) {
        diagnostics.push({
          code: "unknown-module",
          severity: "error",
          message: `composeWorkflow: step "${step}" references module "${id}" but no loaded module has that id. Check the module file exists in the configured global modules folder or in <project>/MODULES/${id}.md.`,
          stepId: step,
          moduleId: id,
          extra: { step, moduleId: id },
        });
      continue;
    }
    orderedModules.push(lm);
  }

  if (orderedModules.length === 0) {
    return finaliseComposed({
      orderedChunks: [],
      lazySkills: [],
      perVarSourceMap: {},
      diagnostics,
      maxChars: ctx.maxWorkflowChars ?? DEFAULT_MAX_WORKFLOW_CHARS,
    });
  }

  // Build the "which modules declare which user var" index from ALL loaded
  // modules — declarations from non-composed modules still count for the
  // undeclared-vs-declared distinction so the Module-default precedence layer
  // surfaces values authored elsewhere in the project.
  const allModulesByVarName = new Map<string, WorkflowModule[]>();
  for (const lm of loadedModules) {
    for (const decl of lm.module.vars) {
      const list = allModulesByVarName.get(decl.name) ?? [];
      list.push(lm.module);
      allModulesByVarName.set(decl.name, list);
    }
  }

  // Collect every user-var name referenced in any composed module body so we
  // resolve each exactly once (avoids re-walking precedence per occurrence).
  const referencedNames = new Set<string>();
  for (const lm of orderedModules) {
    for (const name of extractUserVarRefs(lm.body)) {
      referencedNames.add(name);
    }
  }

  const perVarSourceMap: Record<string, UserVarSource> = {};
  for (const name of referencedNames) {
    perVarSourceMap[name] = resolveUserVar({
      name,
      modulesDeclaringIt: allModulesByVarName.get(name) ?? [],
      globalVars: ctx.globalVars ?? {},
      projectVars: ctx.projectVars ?? {},
      launchVars: ctx.launchVars ?? {},
    });
  }

  const orderedChunks: ComposedChunk[] = [];
  const lazySkills: LazySkill[] = [];
  for (const lm of orderedModules) {
    const r = renderModule({
      module: lm.module,
      body: lm.body,
      allModulesByVarName,
      perVarSourceMap,
      ctx,
    });
    diagnostics.push(...r.diagnostics);
    if (lm.module.lazy) {
      const skillName = slugifySkillName(lm.module.id);
      let description = lm.module.description;
      if (description === undefined) {
        description = lm.module.title;
        diagnostics.push({
          code: "lazy-skill",
          severity: "warning",
          message: `Module ${lm.module.id} is lazy but has no \`description:\` — using its title as the skill activation hint, which may reduce activation accuracy.`,
          moduleId: lm.module.id,
        });
      }
      diagnostics.push({
        code: "lazy-skill",
        severity: "info",
        message: `Module ${lm.module.id} is lazy: emitted as the on-demand skill ${skillName} when a working directory is available, otherwise inlined as optional reference. Not part of the always-inlined prompt body.`,
        moduleId: lm.module.id,
      });
      lazySkills.push({
        id: lm.module.id,
        name: skillName,
        description,
        body: r.text,
      });
      continue;
    }
    orderedChunks.push({
      moduleId: lm.module.id,
      scope: lm.module.scope,
      text: r.text,
      sizeChars: r.text.length,
    });
  }

  return finaliseComposed({
    orderedChunks,
    lazySkills,
    perVarSourceMap,
    diagnostics,
    maxChars: ctx.maxWorkflowChars ?? DEFAULT_MAX_WORKFLOW_CHARS,
  });
}

// ---------------------------------------------------------------------------
// Tail
// ---------------------------------------------------------------------------

interface FinaliseArgs {
  orderedChunks: ComposedChunk[];
  lazySkills: LazySkill[];
  perVarSourceMap: Record<string, UserVarSource>;
  diagnostics: WorkflowDiagnostic[];
  maxChars: number;
}

function finaliseComposed(args: FinaliseArgs): ComposedPrompt {
  const text = args.orderedChunks.map((c) => c.text).join("\n\n");
  const sizeChars = text.length;
  const diagnostics = [...args.diagnostics];
  if (sizeChars > args.maxChars) {
    diagnostics.push({
      code: "size-budget",
      severity: "info",
      message:
        `Composed workflow is ${sizeChars} chars (cap ${args.maxChars}). ` +
        `Modern models tolerate this comfortably; the cap is a guardrail, not a constraint. ` +
        `Consider splitting a module if this surprises you.`,
      extra: { sizeChars, maxWorkflowChars: args.maxChars },
    });
  }
  return {
    text,
    orderedChunks: args.orderedChunks,
    lazySkills: args.lazySkills,
    perVarSourceMap: args.perVarSourceMap,
    sizeChars,
    diagnostics,
  };
}

function emptyComposed(diagnostics: WorkflowDiagnostic[]): ComposedPrompt {
  return {
    text: "",
    orderedChunks: [],
    lazySkills: [],
    perVarSourceMap: {},
    sizeChars: 0,
    diagnostics,
  };
}

// Re-export the registry for callers that want to introspect plugin vars
// alongside the user-var resolution above. Keeps a single import boundary.
export { PLUGIN_VAR_REGISTRY };
