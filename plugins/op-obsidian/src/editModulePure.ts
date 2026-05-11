import {
  globalModulePath,
  modulesFolderPath,
} from "./projectPaths";

// Pure helpers for op-edit-module. Kept separate from editModule.ts so they
// can be unit-tested without loading the obsidian module.

export type ModuleScopeKind = "global" | "project";

export interface BuildEditModulePromptArgs {
  /** Module id (filename basename without `.md`). */
  moduleId: string;
  /** "global" for `Projects/_op-modules/`, "project" for `Projects/<slug>/MODULES/`. */
  scopeKind: ModuleScopeKind;
  /** Project slug — required when `scopeKind === "project"`. */
  projectSlug?: string;
  /** Vault-relative module path — for example `Projects/_op-modules/orient.md`. */
  modulePath: string;
  /** Working dir the agent runs from. */
  repoPath: string;
  /** Vault absolute base path, when known. Lets the prompt embed an absolute target. */
  vaultBasePath?: string;
  /** Existing module body (frontmatter stripped). `null` if the file doesn't exist yet. */
  existingContent: string | null;
  /** Whether the module already has frontmatter (drives "edit" vs "author from scratch"). */
  hasFrontmatter: boolean;
}

const PREAMBLE =
  "You were launched to author or refine ONE Obsidian Projects workflow MODULE — a single module file that contributes a partition (preamble, role, evaluator hints, review checklist, …) of a project's composed workflow. Your job is to interview the user about that one module's purpose and write it to the module path below. Do NOT touch issue notes, do NOT run op-work / op-resolve / op-set-scope, do NOT bump versions or commit code. The module file is the only artifact you produce.";

const SCHEMA_REFERENCE = `Module frontmatter (required: id, title, type, scope):

\`\`\`yaml
---
id: <module-id>           # must match the filename basename (no .md)
title: "Human-readable title"
type: workflow-module     # exact literal — required
scope: <partition-key>    # e.g. kickoff, review, finalize
project: <slug>           # OPTIONAL — restrict to one project
agent: <agent-id>         # OPTIONAL — restrict to one agent (claude, gemini, …)
order: 0                  # OPTIONAL — integer sort key within the scope (default 0)
vars:                     # OPTIONAL — list of variable declarations
  - { name: tone, default: "concise", description: "Voice for the agent." }
  - { name: lang, default: "en" }
  - reviewer              # bare — no default; resolved at higher precedence
---
\`\`\`

Module body uses Obsidian Flavored Markdown. Reference variables with \`{{vars.<name>}}\` for user vars and \`{{<name>}}\` for plugin vars (id, title, project, today, agent, model, mode, branch, repo_path, vault_path, vault_name, …).`;

const INSTRUCTIONS = [
  "1. Read this project's STATUS.md, WORKFLOW.md (when present), and a sample of recent issues to ground yourself in how the project actually works today.",
  "2. If the module file already exists (its current contents are inlined below), treat it as the starting point — refine, don't replace, unless the user asks you to start over.",
  "3. Interview the user about the SINGLE module they want to author — what step it contributes to, what role/persona it presents, what variables it consumes, what it must NOT do. Keep tightly scoped to one module's job.",
  "4. Keep the file concise — bulleted prose, not a manual. Modules are composed alongside others; bloat in one module pushes the composed prompt over budget.",
  "5. Write the file via `obsidian create path=<modulePath> body=...` (or `obsidian property:set` for in-place edits). Frontmatter MUST set `type: workflow-module` and a non-empty `scope:`. Bare `vars:` entries are valid but prefer the OBJECT FORM `{ name: foo, default: \"bar\" }` for new declarations — cleaner inside YAML and forward-compatible with `description:`.",
  "6. When the user signals they're done, summarize what you wrote and exit. Do NOT offer to dispatch follow-ups, plan issues, or implement anything.",
];

export function buildEditModulePrompt(args: BuildEditModulePromptArgs): string {
  const {
    moduleId,
    scopeKind,
    projectSlug,
    modulePath,
    repoPath,
    vaultBasePath,
    existingContent,
    hasFrontmatter,
  } = args;
  const parts: string[] = [];

  parts.push(PREAMBLE);

  const header: string[] = [];
  header.push(`Module id: ${moduleId}`);
  header.push(`Module scope: ${scopeKind === "global" ? "global (vault-wide)" : `per-project (${projectSlug})`}`);
  header.push(`Module path: ${modulePath}`);
  if (vaultBasePath) {
    header.push(`Module absolute path: ${stripTrailingSlash(vaultBasePath)}/${modulePath}`);
  }
  header.push(`Working dir: ${repoPath}`);
  header.push(
    `Status: ${
      existingContent === null
        ? "no module file yet — author from scratch with the schema below"
        : hasFrontmatter
          ? "module file exists — refine in place"
          : "module file exists but is missing frontmatter — author the frontmatter using the schema below"
    }`,
  );
  parts.push(header.join("\n"));

  parts.push(`## What to do\n\n${INSTRUCTIONS.join("\n")}`);

  parts.push(`## Module schema reference\n\n${SCHEMA_REFERENCE}`);

  if (existingContent && existingContent.trim()) {
    parts.push(`## Current module body\n\n${existingContent.trim()}`);
  }

  return parts.join("\n\n");
}

function stripTrailingSlash(p: string): string {
  return p.endsWith("/") ? p.slice(0, -1) : p;
}

/**
 * Compute a module's vault-relative path from its scope kind, slug, and id.
 * Pure — no vault reach. Mirrors the locations encoded in `workflowModule.ts`;
 * keep them in lockstep.
 */
export function modulePathFor(args: {
  scopeKind: ModuleScopeKind;
  projectSlug?: string;
  moduleId: string;
  projectsRoot?: string;
}): string {
  const { scopeKind, projectSlug, moduleId, projectsRoot } = args;
  const id = moduleId.trim();
  if (!id) throw new Error("modulePathFor: moduleId is required");
  if (scopeKind === "global") {
    return globalModulePath(id, projectsRoot);
  }
  if (!projectSlug || !projectSlug.trim()) {
    throw new Error("modulePathFor: projectSlug is required for scopeKind=project");
  }
  return `${modulesFolderPath(projectSlug.trim(), projectsRoot)}/${id}.md`;
}
