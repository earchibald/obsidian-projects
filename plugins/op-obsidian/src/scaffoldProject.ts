import { App, normalizePath } from "obsidian";
import type { IssueStore } from "./issueStore";
import { createIssue, type CreateIssueResult, type Priority } from "./createIssue";

export interface ScaffoldProjectInput {
  slug: string;
  prefix: string;
  repoPath?: string;
  seedTitle?: string;
  seedPriority?: Priority;
  seedScope?: string[];
  seedScopeBody?: string;
}

export interface ScaffoldProjectResult {
  slug: string;
  prefix: string;
  projectFolder: string;
  basePath: string;
  statusPath: string;
  /** OP-188: every new project lands with a default `WORKFLOW.md` that ships
   *  the canonical evaluate → plan → implement → review → finalize sequence,
   *  matching the pre-OP-188 hardcoded `flowOrchestrator` matrix. The file is
   *  self-contained (no `extends:`) so the project doesn't depend on a global
   *  `_op-workflow.md` the plugin doesn't auto-install. */
  workflowPath: string;
  seed?: CreateIssueResult;
}

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
const PREFIX_RE = /^[A-Z][A-Z0-9]*$/;

export async function scaffoldProject(
  app: App,
  store: IssueStore,
  input: ScaffoldProjectInput,
): Promise<ScaffoldProjectResult> {
  const slug = input.slug.trim();
  const prefix = input.prefix.trim();
  if (!SLUG_RE.test(slug)) {
    throw new Error(`Invalid slug "${slug}" — use lowercase letters, digits, and hyphens.`);
  }
  if (!PREFIX_RE.test(prefix)) {
    throw new Error(`Invalid prefix "${prefix}" — use uppercase letters/digits starting with a letter.`);
  }

  const repoPath = input.repoPath?.trim();
  if (repoPath !== undefined && repoPath !== "") {
    if (!repoPath.startsWith("/")) {
      throw new Error(
        `Invalid repo_path "${repoPath}" — must be an absolute path (no ~ expansion, no vault-relative).`,
      );
    }
  }

  const projectFolder = normalizePath(`Projects/${slug}`);
  if (app.vault.getAbstractFileByPath(projectFolder)) {
    throw new Error(`Project folder already exists: ${projectFolder}`);
  }

  // Enforce unique prefix across projects.
  for (const file of app.vault.getMarkdownFiles()) {
    if (!file.path.startsWith("Projects/") || !file.path.endsWith("/STATUS.md")) continue;
    const fm = app.metadataCache.getFileCache(file)?.frontmatter;
    if (fm?.type === "project-status" && fm?.prefix === prefix) {
      throw new Error(`Prefix "${prefix}" already in use by ${file.path}`);
    }
  }

  await app.vault.createFolder(projectFolder);

  const basePath = normalizePath(`${projectFolder}/${slug}.base`);
  await app.vault.create(basePath, renderBase(slug));

  const statusPath = normalizePath(`${projectFolder}/STATUS.md`);
  await app.vault.create(statusPath, renderStatus(slug, prefix, repoPath));

  // OP-188: seed the default workflow file so the orchestrator's
  // workflow-file walker (flowOrchestrator.ts) finds a canonical step list
  // for this project the first time auto-advance fires. Self-contained
  // (no `extends:`) — keeps new projects working without depending on a
  // global `_op-workflow.md` that the plugin doesn't auto-install.
  const workflowPath = normalizePath(`${projectFolder}/WORKFLOW.md`);
  await app.vault.create(workflowPath, renderDefaultWorkflow(slug));

  let seed: CreateIssueResult | undefined;
  const seedTitle = input.seedTitle?.trim();
  if (seedTitle) {
    // createIssue uses listProjects() to find the new project — IssueStore and metadataCache
    // may not have indexed the freshly-written STATUS.md yet, so retry briefly.
    seed = await retryCreateSeed(app, store, {
      slug,
      title: seedTitle,
      priority: input.seedPriority ?? "med",
      scope: input.seedScope ?? [],
      scopeBody: input.seedScopeBody,
    });
  }

  return { slug, prefix, projectFolder, basePath, statusPath, workflowPath, seed };
}

async function retryCreateSeed(
  app: App,
  store: IssueStore,
  input: {
    slug: string;
    title: string;
    priority: Priority;
    scope: string[];
    scopeBody?: string;
  },
): Promise<CreateIssueResult> {
  const deadline = Date.now() + 2000;
  let lastErr: unknown;
  while (Date.now() < deadline) {
    try {
      return await createIssue(app, store, input);
    } catch (err: any) {
      lastErr = err;
      if (!/Unknown project slug/i.test(String(err?.message ?? err))) throw err;
      await sleep(50);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function renderStatus(slug: string, prefix: string, repoPath?: string): string {
  const lines = [
    "---",
    `project: ${slug}`,
    `prefix: ${prefix}`,
    "type: project-status",
  ];
  if (repoPath && repoPath.trim()) {
    lines.push(`repo_path: ${repoPath.trim()}`);
  }
  lines.push(
    "tags:",
    `  - project/${slug}`,
    "---",
    "",
    `![[${slug}.base#Open Issues]]`,
    "",
  );
  return lines.join("\n");
}

function renderBase(slug: string): string {
  return DEFAULT_BASE_TEMPLATE.replaceAll("<slug>", slug);
}

/**
 * OP-188: default workflow file for a freshly-scaffolded project. Ships the
 * canonical 5-step sequence — evaluate → plan → implement → review →
 * finalize — that the pre-OP-188 `flowOrchestrator` hardcoded matrix
 * encoded. Empty `modules: []` per step: this issue's scope is the
 * orchestration sequence, not the module library.
 *
 * `default_agent: claude` and `default_model: opus` mirror the project's
 * pre-modules defaults (see `agentProfiles.ts`). Projects that prefer a
 * different agent or model set can edit this file via `op-edit-workflow`.
 */
function renderDefaultWorkflow(slug: string): string {
  return [
    "---",
    "type: workflow",
    "schema: 1",
    `project: ${slug}`,
    "default_agent: claude",
    "default_model: opus",
    "steps:",
    "  - step: evaluate",
    "    modules: []",
    "  - step: plan",
    "    modules: []",
    "  - step: implement",
    "    modules: []",
    "  - step: review",
    "    modules: []",
    "  - step: finalize",
    "    modules: []",
    "---",
    "",
    `# ${slug} — workflow`,
    "",
    "Default 5-step sequence shipped at scaffold time. Edit this file to add",
    "modules to a step (`modules: [<id>]`), override the agent or model on a",
    "specific step, or insert custom steps. Auto-advance walks `steps:` in",
    "order; complexity decides whether `evaluate` skips `plan` (`simple` →",
    "evaluate jumps to `implement`; `complex` → evaluate → plan).",
    "",
  ].join("\n");
}

const DEFAULT_BASE_TEMPLATE = `filters:
  and:
    - file.inFolder("Projects/<slug>")
    - project == "<slug>"
properties:
  id:
    displayName: ID
  status:
    displayName: Status
  priority:
    displayName: Priority
  created:
    displayName: Created
  resolved:
    displayName: Resolved
  issue:
    displayName: Issue
  doc_type:
    displayName: Doc Type
views:
  - type: table
    name: Open Issues
    filters:
      and:
        - type == "issue"
        - status != "resolved"
        - status != "wontfix"
    groupBy:
      property: status
      direction: ASC
    order:
      - id
      - file.name
      - status
      - priority
      - created
  - type: table
    name: Board
    filters:
      and:
        - type == "issue"
        - status != "resolved"
        - status != "wontfix"
    groupBy:
      property: status
      direction: ASC
    order:
      - id
      - file.name
      - priority
      - created
  - type: table
    name: Tasks by Issue
    filters:
      and:
        - type == "task"
        - status != "completed"
    groupBy:
      property: issue
      direction: ASC
    order:
      - id
      - file.name
      - status
      - issue
  - type: table
    name: Resolved Log
    filters:
      and:
        - type == "issue"
        - or:
            - status == "resolved"
            - status == "wontfix"
    order:
      - id
      - file.name
      - status
      - resolved
      - created
  - type: table
    name: Docs Index
    filters:
      and:
        - type == "doc"
    groupBy:
      property: doc_type
      direction: ASC
    order:
      - file.name
      - doc_type
      - status
      - issue
      - created
`;
