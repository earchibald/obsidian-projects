import type { AgentProfile } from "./agentProfiles";
import { slugify } from "./slug";
import type { IssueEntry } from "./types";

// Always-on plugin vars surfaced to workflow-module templates. This file is
// the single source of truth: adding a new always-on var is one entry here,
// and every UI surface (renderer, autocomplete, settings reference panel,
// op-list-vars CLI, generated reference docs) reads from this registry. No
// duplication.
//
// OP-181 plan §"Variable templating" — these vars live exclusively at the
// Launch-override scope (level 4): they are computed per-launch from the
// launch context and shadow any same-named lower-precedence value. User vars
// (`{{vars.<name>}}`) are a separate namespace handled by 1b/1c/1d.

/**
 * Sentinel string emitted when an issue has no `parent:` frontmatter. Lives
 * in the registry (not duplicated at every callsite) so every surface that
 * renders a parent reference reads the same prose. Designed to be readable
 * inline — agents see prose-readable text rather than an empty string or an
 * unrendered `{{parent}}` token. Spec: OP-181 plan §"Variable templating".
 */
export const PARENT_NONE_SENTINEL = "(none — this is a top-level issue)";

/**
 * Flat record of every value any plugin-var entry might compute over.
 * Required fields are always present given a typed `RenderContext`; optional
 * fields are `undefined` when the issue or environment doesn't supply them
 * (e.g., a freshly created issue has no `branch`, no `pr_url`).
 *
 * This is the contract between `buildRenderContext` (assembly) and
 * `PluginVar.compute` (lookup) — keep changes here in lockstep with the
 * `PLUGIN_VAR_REGISTRY` entries below.
 */
export interface RenderContext {
  // Issue identity
  id: string;
  title: string;
  project: string;
  status: string;
  priority?: string;

  // Issue links
  /** `null` when the issue has no parent — registry returns `PARENT_NONE_SENTINEL`. */
  parent: string | null;
  pr_url?: string;
  github_issue?: string;

  // Repo / vault
  repo_path?: string;
  vault_path: string;
  vault_name: string;
  branch?: string;

  // Run context
  /** ISO `YYYY-MM-DD` — caller is responsible for formatting; pure-fn doesn't reach for `Date`. */
  today: string;
  agent: string;
  model?: string;
  mode: string;
}

/**
 * One entry per always-on var. `compute(ctx)` returns the rendered string,
 * or `undefined` if the value isn't available — the renderer leaves the token
 * verbatim and emits a `missing-var` diagnostic in that case (the verbatim
 * fallback is a soft failure, never a silent corruption).
 *
 * `ctx` is typed `Partial<RenderContext>` so callers with a fragment of the
 * full context (legacy callsites mid-migration, or unit tests of a single
 * field) can still resolve what they have. Full-context callers see no
 * spurious diagnostics because every field is populated.
 */
export interface PluginVar {
  name: string;
  /** One-line, prose, suitable for a settings reference panel and `op-list-vars`. */
  description: string;
  /** Concrete example string — for tooltips / autocomplete previews / docs. */
  example: string;
  compute: (ctx: Partial<RenderContext>) => string | undefined;
}

/**
 * Canonical registry. Map order is the order entries appear in `op-list-vars`
 * and the settings reference panel — keep grouped by concern (identity →
 * links → repo/vault → run context) for readability.
 */
export const PLUGIN_VAR_REGISTRY: Readonly<Record<string, PluginVar>> = Object.freeze({
  // Issue identity
  id: {
    name: "id",
    description: "The issue's canonical id (e.g., OP-194).",
    example: "OP-194",
    compute: (ctx) => ctx.id,
  },
  title: {
    name: "title",
    description: "The issue's title from its frontmatter.",
    example: "Generic {{var}} renderer + context builder",
    compute: (ctx) => ctx.title,
  },
  project: {
    name: "project",
    description: "The project slug the issue belongs to.",
    example: "obsidian-projects",
    compute: (ctx) => ctx.project,
  },
  status: {
    name: "status",
    description: "The issue's lifecycle status (open, in-progress, blocked, resolved, wontfix).",
    example: "in-progress",
    compute: (ctx) => ctx.status,
  },
  priority: {
    name: "priority",
    description: "The issue's priority (low, med, high) — undefined if not set.",
    example: "high",
    compute: (ctx) => ctx.priority,
  },
  slug: {
    name: "slug",
    description:
      "Branch-safe kebab-cased slug derived from `title` (lowercase, capped at 40 chars on a `-` boundary, leading `NN[a-z]?:` task-prefix stripped) — undefined if `title` collapses to empty.",
    example: "add-slug-plugin-var-extract-shared",
    compute: (ctx) => {
      if (ctx.title === undefined) return undefined;
      return (
        slugify(ctx.title, { caseFold: true, maxLen: 40, stripLeadingTaskPrefix: true }) ||
        undefined
      );
    },
  },

  // Issue links
  parent: {
    name: "parent",
    description: `The parent issue id from frontmatter, or \`${PARENT_NONE_SENTINEL}\` when no parent is set.`,
    example: "OP-184",
    compute: (ctx) => (ctx.parent === null ? PARENT_NONE_SENTINEL : ctx.parent),
  },
  pr_url: {
    name: "pr_url",
    description: "The pull-request URL once the issue has one — undefined before the PR opens.",
    example: "https://github.com/earchibald/obsidian-projects/pull/232",
    compute: (ctx) => ctx.pr_url,
  },
  github_issue: {
    name: "github_issue",
    description: "The mirrored GitHub issue URL when the issue is GH-linked — undefined when local-only.",
    example: "https://github.com/earchibald/obsidian-projects/issues/232",
    compute: (ctx) => ctx.github_issue,
  },

  // Repo / vault
  repo_path: {
    name: "repo_path",
    description: "Absolute path to the project's code repository — undefined for meta-only projects.",
    example: "/Users/you/Projects/obsidian-projects",
    compute: (ctx) => ctx.repo_path,
  },
  vault_path: {
    name: "vault_path",
    description: "Absolute path to the active Obsidian vault.",
    example: "/Users/you/work/Agent-Vault",
    compute: (ctx) => ctx.vault_path,
  },
  vault_name: {
    name: "vault_name",
    description: "Display name of the active Obsidian vault.",
    example: "Agent-Vault",
    compute: (ctx) => ctx.vault_name,
  },
  branch: {
    name: "branch",
    description:
      "The git branch the agent is operating on — undefined before the worktree exists or for meta-only projects.",
    example: "worktree-OP-220-add-slug-plugin-var-and-extract-shared",
    compute: (ctx) => ctx.branch,
  },

  // Run context
  today: {
    name: "today",
    description: "Today's date in ISO YYYY-MM-DD form, computed by the launching surface.",
    example: "2026-04-26",
    compute: (ctx) => ctx.today,
  },
  agent: {
    name: "agent",
    description: "The agent id launching this session (claude, gemini, copilot).",
    example: "claude",
    compute: (ctx) => ctx.agent,
  },
  model: {
    name: "model",
    description: "The resolved model id for this launch — undefined if the agent has no per-launch model selection.",
    example: "claude-opus-4-7",
    compute: (ctx) => ctx.model,
  },
  mode: {
    name: "mode",
    description: "The launch mode (evaluate, plan, implement, review, finalize).",
    example: "implement",
    compute: (ctx) => ctx.mode,
  },
});

/**
 * Per-launch context that `buildRenderContext` does not derive from the issue
 * note or the agent profile. Caller (1d's composition layer) reads vault and
 * repo state once and threads it through; the pure-fn boundary stays clean.
 *
 * `parent: string | null` — caller reads the issue's `parent:` frontmatter
 * and supplies `null` for top-level issues so the registry can emit the
 * sentinel.
 */
export interface LaunchContext {
  mode: string;
  model?: string;
  branch?: string;
  repo_path?: string;
  vault_path: string;
  vault_name: string;
  /** ISO YYYY-MM-DD. */
  today: string;
  /** `null` for top-level issues — registry will substitute the sentinel. */
  parent: string | null;
}

/**
 * Pure assembly: flatten an issue + agent profile + launch context into the
 * `RenderContext` that the renderer and downstream surfaces consume.
 *
 * No I/O. No vault reads. No clock reads. Every value comes from arguments —
 * call this exactly once per launch and reuse the result.
 */
export function buildRenderContext(args: {
  entry: IssueEntry;
  profile: AgentProfile;
  launch: LaunchContext;
}): RenderContext {
  const { entry, profile, launch } = args;
  return {
    id: entry.id,
    title: entry.title,
    project: entry.project,
    status: entry.status,
    priority: entry.priority,
    parent: launch.parent,
    pr_url: entry.pr,
    github_issue: entry.githubIssue,
    repo_path: launch.repo_path,
    vault_path: launch.vault_path,
    vault_name: launch.vault_name,
    branch: launch.branch,
    today: launch.today,
    agent: profile.id,
    model: launch.model,
    mode: launch.mode,
  };
}
