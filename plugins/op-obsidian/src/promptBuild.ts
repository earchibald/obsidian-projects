import { App, TFile } from "obsidian";
import type { IssueStore } from "./issueStore";
import type { IssueEntry } from "./types";
import type { AgentLaunchMode, AgentProfile } from "./agentProfiles";
import { promptPreambleFor, renderSkillTrigger } from "./agentProfiles";
import type { InjectionSettings, WorkflowMode } from "./settings";
import { agentizeBody } from "./agentizeBody";
import { loadAndComposeWorkflow } from "./composeWorkflow";
import type { RenderContext } from "./pluginVarRegistry";

export { agentizeBody } from "./agentizeBody";

export interface BuildPromptArgs {
  entry: IssueEntry;
  profile: AgentProfile;
  injection: InjectionSettings;
  vaultBasePath?: string;
  mode?: AgentLaunchMode;
  /** OP-198 (2a): selects the workflow-injection engine. `'modules'` calls
   *  `loadAndComposeWorkflow`; `'legacy'` (default) inlines
   *  `Projects/<slug>/WORKFLOW.md` verbatim. */
  workflowMode?: WorkflowMode;
  /** OP-198 (2a): vault-wide user vars threaded into the composer's Global
   *  precedence layer. Unused when `workflowMode === 'legacy'`. */
  workflowVars?: Record<string, string>;
  /** OP-198 (2a) — extended in OP-199 (2b): name of the workflow step to
   *  compose for this launch. Defaults to `'kickoff'`. OP-199 wires
   *  `openAgent` to pass the active mode (`'evaluate'`, `'plan'`,
   *  `'implement'`, `'review'`, `'finalize'`); the launch falls back to
   *  `'kickoff'` if the workflow file lacks the requested step entirely. */
  workflowStep?: string;
  /** OP-199 (2b): absolute path of the agent's working directory. Surfaces as
   *  `{{repo_path}}` in modules. `undefined` for meta-only projects. */
  repoPath?: string;
  /** OP-199 (2b): current git branch at `repoPath`. Surfaces as `{{branch}}`
   *  in modules. `undefined` when the working directory isn't a git repo or
   *  `git rev-parse` fails — composer reports `missing-var` rather than
   *  breaking the launch. */
  branch?: string;
  /** OP-199 (2b): the issue's `parent:` frontmatter, looked up at launch via
   *  `metadataCache`. `null` (or omitted) → the registry renders
   *  `{{parent}}` as `PARENT_NONE_SENTINEL` ("(none — this is a top-level
   *  issue)"). A string is rendered verbatim. */
  parentId?: string | null;
  /** OP-200 (2c): canonical (versioned) model id chosen by `stepResolver`.
   *  Surfaces as `{{model}}` in modules. `undefined` when the workflow file
   *  declared no per-step / per-default model override (or when there is no
   *  workflow file) — matches the pre-2c behavior of leaving the slot empty
   *  so modules referencing `{{model}}` keep emitting `missing-var` until an
   *  author opts in. */
  resolvedModel?: string;
}

export async function buildPrompt(
  app: App,
  store: IssueStore,
  args: BuildPromptArgs,
): Promise<string> {
  const { entry, profile, injection, vaultBasePath } = args;
  const mode: AgentLaunchMode = args.mode ?? "work";
  const parts: string[] = [];

  if (injection.extraPreamble.trim()) parts.push(injection.extraPreamble.trim());
  const preamble = promptPreambleFor(profile, mode);
  if (preamble.trim()) parts.push(preamble.trim());

  parts.push(renderSkillTrigger(profile, entry.id));

  if (injection.includeWorkflow && entry.project) {
    const workflowMode: WorkflowMode = args.workflowMode ?? "legacy";
    let composedSection: string | null = null;

    if (workflowMode === "modules") {
      // OP-198 (2a) / OP-199 (2b): swap the legacy inline blob for OP-197's
      // composer. `composeWorkflowSection` returns:
      //   - null  → no WORKFLOW.md, fall through to legacy below
      //   - ""    → WORKFLOW.md exists but step was empty, suppress
      //   - text  → splice the composed section
      composedSection = await composeWorkflowSection(app, args);
    }

    if (composedSection !== null) {
      // Composer ran: '' means WORKFLOW.md exists but the step had no output
      // (e.g. `modules: []`). Don't push anything — the user opted into
      // modules mode so silently injecting the legacy inline blob would be
      // wrong. Non-empty: splice into the prompt as-is.
      if (composedSection) parts.push(composedSection);
    } else {
      // Legacy path — kept byte-identical (OP-198 acceptance criterion).
      const workflowPath = `Projects/${entry.project}/WORKFLOW.md`;
      const wf = app.vault.getAbstractFileByPath(workflowPath);
      if (wf instanceof TFile) {
        const raw = await app.vault.read(wf);
        const body = stripFrontmatter(raw).trim();
        if (body) {
          const cap = Math.max(0, injection.maxWorkflowChars | 0);
          if (cap === 0 || body.length > cap) {
            // Over the inline cap (or inlining disabled): point at the file
            // rather than burn kickoff context.
            parts.push(
              `## Project workflow\n\nSee ${workflowPath} for this project's SDLC policy. Read it before touching the repo.`,
            );
          } else {
            parts.push(`## Project workflow\n\nFrom ${workflowPath}:\n\n${body}`);
          }
        }
      }
    }
  }

  const header: string[] = [];
  header.push(`Issue: ${entry.id} — ${entry.title}`);
  header.push(`Project: ${entry.project}`);
  if (entry.status) header.push(`Status: ${entry.status}`);
  if (entry.pr) header.push(`PR: ${entry.pr}`);
  const notePath = vaultBasePath
    ? `${stripTrailingSlash(vaultBasePath)}/${entry.path}`
    : entry.path;
  header.push(`Note: ${notePath}`);
  parts.push(header.join("\n"));

  if (injection.injectBody) {
    const body = await readBodyOnly(app, entry);
    if (body) {
      const truncated = truncate(body, injection.maxBodyChars);
      parts.push(`## Body\n\n${truncated.text}${truncated.truncated ? `\n\n_(truncated — full body at ${notePath})_` : ""}`);
    }
  }

  if (injection.includeTasksList) {
    const tasks = store
      .tasks()
      .filter((t) => t.id.startsWith(`${entry.id}.`))
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    if (tasks.length > 0) {
      const lines = tasks.map((t) => `- [${t.status}] ${t.id} — ${t.title}`);
      parts.push(`## Tasks\n\n${lines.join("\n")}`);
    }
  }

  if (injection.includeRecentCommits > 0 && entry.commits && entry.commits.length > 0) {
    const recent = entry.commits.slice(-injection.includeRecentCommits);
    parts.push(`## Recent commits\n\n${recent.map((c) => `- ${c}`).join("\n")}`);
  }

  return parts.join("\n\n");
}

/**
 * OP-198 (2a) / OP-199 (2b): compose the workflow section for this launch via
 * OP-197's modular engine. Returns:
 *  - a non-empty `## Project workflow\n\n...` string when the step produced
 *    content;
 *  - `""` when WORKFLOW.md exists and the requested step exists but had no
 *    output (e.g. `modules: []`, or every module rendered to whitespace after
 *    var substitution, or every module's id failed to load with an
 *    `unknown-module` diagnostic) — caller suppresses the section without
 *    falling back to legacy, because the user explicitly chose modules mode
 *    AND explicitly defined the per-mode step. This is the explicit-suppress
 *    contract from OP-198. Note that `unknown-module` failures do NOT trigger
 *    the lenient kickoff fallback — the step is present in the workflow file,
 *    so "step intentionally defined but broken" is distinguishable from "step
 *    absent". Authors see `unknown-module` diagnostics in the Workflows
 *    settings pane; the fix is to add the missing module files, not to
 *    silently fall back to kickoff content.
 *  - `null` when WORKFLOW.md was not found (or couldn't be loaded) — caller
 *    falls back to the legacy inline path so users without a WORKFLOW.md
 *    see the same prompt they'd get in `'legacy'` mode.
 *
 * **OP-199 (2b) lenient kickoff fallback.** When the requested step is not
 * `'kickoff'` and the composer reports it as missing from the workflow
 * file's `steps[]` (signal: a `schema-mismatch` diagnostic with
 * `stepId === requestedStep`), retry once with `step: 'kickoff'`. This
 * keeps workflows authored before per-mode steps were a thing working —
 * every mode-launch composes the kickoff step. To opt out per-mode, an
 * author defines the per-mode step (even with `modules: []`, which is the
 * explicit-suppress contract above).
 *
 * **Diagnostic safety.** The `schema-mismatch + stepId === requestedStep`
 * detection uniquely identifies "step absent from steps[]". All other
 * `schema-mismatch` emit sites in the pipeline (file-not-found, type/schema
 * field errors, nested-extends violations) do NOT set `stepId`, so there are
 * no false positives that could trigger the fallback unexpectedly.
 *
 * **OP-199 (2b) `RenderContext`.** Now reads `args.repoPath` /
 * `args.branch` / `args.parentId` so modules referencing `{{repo_path}}` /
 * `{{branch}}` / `{{parent}}` resolve cleanly at launch. `model` stays
 * `undefined` until OP-200 (2c) ships the per-step resolver.
 *
 * **Exported surface invariants.** Safe to call with:
 *  - `entry.path` pointing at a non-existent note — path is only used for
 *    `RenderContext` display fields, not for disk I/O inside this function.
 *  - `injection.maxWorkflowChars === 0` — the composer emits a `size-budget`
 *    diagnostic for any non-empty text but still returns the content.
 *  - `vaultBasePath === ""` — sets `vault_path: ""` in the render context.
 *  - `entry.project === undefined` — short-circuits immediately and returns
 *    `null` (caller falls through to legacy path).
 *
 * Exported so `launchHeadlessSubtask` callers (currently the evaluator;
 * future per-step subtask launches) can compose the same workflow section
 * and prepend it to their custom prompts without going through the full
 * `buildPrompt` shape.
 */
export async function composeWorkflowSection(
  app: App,
  args: BuildPromptArgs,
): Promise<string | null> {
  const { entry, injection, vaultBasePath } = args;
  if (!entry.project) return null;

  const requestedStep = args.workflowStep ?? "kickoff";
  const render = buildLaunchRenderContext(app, args, vaultBasePath);
  const ctx = {
    render,
    globalVars: args.workflowVars ?? {},
    maxWorkflowChars: injection.maxWorkflowChars,
  };

  let { composed } = await loadAndComposeWorkflow(app, {
    project: entry.project,
    step: requestedStep,
    ctx,
  });

  // `null` means WORKFLOW.md was not found — signal the caller to fall
  // back to the legacy inline blob.
  if (!composed) return null;

  // OP-199 (2b) lenient fallback: requested step missing entirely → retry
  // with 'kickoff'. Detect via the schema-mismatch diagnostic the composer
  // emits at `composeWorkflowPure.ts` when `workflow.steps.find(...)` misses.
  // The diagnostic carries `stepId: requestedStep` so we can distinguish
  // "missing entirely" from "exists but unrelated schema-mismatch on a
  // module".
  const stepMissing =
    requestedStep !== "kickoff" &&
    composed.diagnostics.some(
      (d) => d.code === "schema-mismatch" && d.stepId === requestedStep,
    );
  if (stepMissing) {
    const retry = await loadAndComposeWorkflow(app, {
      project: entry.project,
      step: "kickoff",
      ctx,
    });
    if (retry.composed) composed = retry.composed;
  }

  const text = composed.text.trim();
  // Non-null but empty: WORKFLOW.md exists, requested step exists, but the
  // step produced nothing (e.g. `modules: []`). Return "" so the caller
  // suppresses the section without injecting legacy content.
  if (!text) return "";
  return `## Project workflow\n\n${text}`;
}

function buildLaunchRenderContext(
  app: App,
  args: BuildPromptArgs,
  vaultBasePath: string | undefined,
): RenderContext {
  const { entry, profile } = args;
  const mode: AgentLaunchMode = args.mode ?? "work";
  return {
    id: entry.id,
    title: entry.title,
    project: entry.project,
    status: entry.status,
    priority: entry.priority,
    // OP-199 (2b): `null` is a valid value — registry renders it as
    // `PARENT_NONE_SENTINEL`. `undefined` (parentId absent) is treated the
    // same: no parent.
    parent: args.parentId ?? null,
    pr_url: entry.pr,
    github_issue: entry.githubIssue,
    repo_path: args.repoPath,
    vault_path: vaultBasePath ?? "",
    vault_name: app.vault.getName(),
    branch: args.branch,
    today: today(),
    agent: profile.id,
    // OP-200 (2c): canonical model id from `stepResolver`, or `undefined`
    // when no workflow-file override applied.
    model: args.resolvedModel,
    mode,
  };
}

function today(): string {
  // ISO YYYY-MM-DD slice of the current UTC date. Using UTC is intentional:
  // it keeps the value consistent and reproducible regardless of the user's
  // local timezone, and avoids ambiguity at midnight. Modules that render
  // {{today}} and whose authors care about local date can override the value
  // via workflowVars.
  return new Date().toISOString().slice(0, 10);
}

async function readBodyOnly(app: App, entry: IssueEntry): Promise<string> {
  const f = app.vault.getAbstractFileByPath(entry.path);
  if (!(f instanceof TFile)) return "";
  const raw = await app.vault.read(f);
  return agentizeBody(stripFrontmatter(raw).trim());
}

function stripFrontmatter(raw: string): string {
  if (!raw.startsWith("---")) return raw;
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return raw;
  const afterFence = raw.indexOf("\n", end + 4);
  return afterFence === -1 ? "" : raw.slice(afterFence + 1);
}

function truncate(s: string, max: number): { text: string; truncated: boolean } {
  if (s.length <= max) return { text: s, truncated: false };
  return { text: s.slice(0, max).trimEnd(), truncated: true };
}

function stripTrailingSlash(p: string): string {
  return p.endsWith("/") ? p.slice(0, -1) : p;
}
