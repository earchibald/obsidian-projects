import { TFile, type App } from "obsidian";
import type { IssueEntry } from "./types";
import type { OpSettings } from "./settings";
import { AGENT_IDS, type AgentId, type AgentProfile } from "./agentProfiles";
import { resolveProfile } from "./openAgent";
import { resolveRepoPath } from "./repoPath";
import { loadAndComposeWorkflow } from "./composeWorkflow";
import { buildRenderContext, type RenderContext } from "./pluginVarRegistry";
import {
  buildExplainPayload,
  type ExplainWorkflowPayload,
} from "./explainWorkflowPure";
import { buildListVarsPayload, type ListVarsPayload } from "./listVarsPure";
import type { WorkflowDiagnostic } from "./workflowDiagnostic";

// IO seam for OP-203's two diagnostic CLIs. Both verbs need the same
// composed-prompt pipeline that the launcher uses (so output matches what the
// user would actually see at launch time); composition is the side-effect, the
// payload-builders themselves are pure.
//
// `explainWorkflow` resolves an issue, builds the launch render context, runs
// the modular composer for the requested step, and hands the result to
// `buildExplainPayload`. The pure layer owns the JSON shape; this file owns
// vault reads.
//
// `listVars` builds the same render context only when an issue resolves;
// otherwise it falls back to the registry-only payload.

export interface ExplainWorkflowDeps {
  settings: OpSettings;
  /** Resolves an issue id to its store entry. Throws when missing. */
  resolveIssue: (id: string) => IssueEntry;
}

export async function explainWorkflow(
  app: App,
  deps: ExplainWorkflowDeps,
  args: { issueId: string; mode: string; agent?: string },
): Promise<ExplainWorkflowPayload> {
  const entry = deps.resolveIssue(args.issueId);
  const project = entry.project;
  if (!project) {
    throw new Error(`op-explain-workflow: issue ${args.issueId} has no project`);
  }

  const agentRaw = args.agent ?? entry.agent ?? deps.settings.defaultAgent;
  const agentExplicit = args.agent !== undefined;
  const profile = resolveProfileById(deps.settings, agentRaw);

  const renderContext = buildIssueRenderContext(app, deps.settings, entry, profile, args.mode);
  const projectVars = readProjectVars(app, project);

  const { composed, bundle } = await loadAndComposeWorkflow(app, {
    project,
    step: args.mode,
    ctx: {
      render: renderContext,
      globalVars: deps.settings.workflowVars ?? {},
      projectVars,
      launchVars: {},
      maxWorkflowChars: deps.settings.injection.maxWorkflowChars,
    },
  });

  // Build the agent-unrecognized warning once — it may apply to both the
  // !composed path (no WORKFLOW.md) and the normal path.
  const agentDiags: WorkflowDiagnostic[] =
    agentExplicit && !(AGENT_IDS as readonly string[]).includes(agentRaw)
      ? [
          {
            code: "schema-mismatch",
            severity: "warning",
            message: `op-explain-workflow: agent "${agentRaw}" is not a known agent id (${AGENT_IDS.join(", ")}); using default "${profile.id}".`,
            extra: { requestedAgent: agentRaw, resolvedAgent: profile.id },
          },
        ]
      : [];

  if (!composed) {
    // WORKFLOW.md was not found or could not be salvaged. Surface the loader's
    // diagnostics through the unified formatter so the caller sees them —
    // previously this path returned an empty diagnostics array, silently
    // dropping errors like "WORKFLOW.md not found" or "schema-mismatch".
    return buildExplainPayload({
      issueId: args.issueId,
      project,
      mode: args.mode,
      context: renderContext,
      composed: {
        text: "",
        orderedChunks: [],
        perVarSourceMap: {},
        sizeChars: 0,
        diagnostics: [...agentDiags, ...bundle.diagnostics],
      },
    });
  }

  return buildExplainPayload({
    issueId: args.issueId,
    project,
    mode: args.mode,
    context: renderContext,
    composed:
      agentDiags.length > 0
        ? { ...composed, diagnostics: [...agentDiags, ...composed.diagnostics] }
        : composed,
  });
}

export interface ListVarsDeps {
  settings: OpSettings;
  resolveIssue: (id: string) => IssueEntry;
}

export async function listVars(
  app: App,
  deps: ListVarsDeps,
  args: { project?: string; issue?: string },
): Promise<ListVarsPayload> {
  if (!args.issue) {
    // No issue context. If `project` is supplied, pass it as a partial context
    // so vars whose `compute` only needs `project` will resolve; all others stay
    // null and `context.hasContext` will be `true`. Without `project`, this is a
    // pure registry-only payload with `hasContext: false`.
    return buildListVarsPayload(args.project ? { project: args.project } : undefined);
  }

  const entry = deps.resolveIssue(args.issue);
  if (args.project && args.project !== entry.project) {
    throw new Error(
      `op-list-vars: issue ${args.issue} belongs to project "${entry.project}", not "${args.project}".`,
    );
  }

  const agentRaw = entry.agent ?? deps.settings.defaultAgent;
  const profile = resolveProfileById(deps.settings, agentRaw);
  const renderContext = buildIssueRenderContext(app, deps.settings, entry, profile, "kickoff");
  return buildListVarsPayload(renderContext);
}

function resolveProfileById(settings: OpSettings, raw: string): AgentProfile {
  const id = (AGENT_IDS as readonly string[]).includes(raw)
    ? (raw as AgentId)
    : settings.defaultAgent;
  return resolveProfile(settings, id);
}

// OP-206 (3f): `buildIssueRenderContext` and `readProjectVars` are exported
// for reuse by `previewWorkflowModal.ts` so the Settings preview and the
// launcher both build the same RenderContext. If you add a new field to either
// function's output, check `previewWorkflowModal.ts` (`recompose()`) and
// `explainWorkflow.ts` (`explainWorkflow()`) in lockstep — they share the
// same interface contract and divergence produces a preview-vs-reality gap.
export function buildIssueRenderContext(
  app: App,
  settings: OpSettings,
  entry: IssueEntry,
  profile: AgentProfile,
  mode: string,
): RenderContext {
  const repo_path = resolveRepoPath(app, settings, entry.project) ?? undefined;
  const launch = {
    mode,
    repo_path,
    vault_path: vaultBasePath(app),
    vault_name: app.vault.getName(),
    today: today(),
    parent: readParent(app, entry.path),
  };
  return buildRenderContext({ entry, profile, launch });
}

function readParent(app: App, issuePath: string): string | null {
  const file = app.vault.getAbstractFileByPath(issuePath);
  if (!(file instanceof TFile)) return null;
  const fm = app.metadataCache.getFileCache(file)?.frontmatter;
  if (!fm || typeof fm !== "object") return null;
  const v = (fm as Record<string, unknown>).parent;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export function readProjectVars(app: App, project: string): Record<string, string> {
  const statusPath = `Projects/${project}/STATUS.md`;
  const file = app.vault.getAbstractFileByPath(statusPath);
  if (!(file instanceof TFile)) return {};
  const fm = app.metadataCache.getFileCache(file)?.frontmatter;
  if (!fm || typeof fm !== "object") return {};
  const raw = (fm as Record<string, unknown>).vars;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

function vaultBasePath(app: App): string {
  const adapter = app.vault.adapter as { getBasePath?: () => string };
  return typeof adapter.getBasePath === "function" ? adapter.getBasePath() : "";
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
