import { App, TFile, normalizePath } from "obsidian";
import { findProjectBySlug } from "./projects";
import { sanitizeIssueTitle } from "./sanitize";
import { renderDocNote, isDocType, type DocType } from "./docCreatePure";

export interface DocCreateInput {
  slug: string;
  docType: string;
  title: string;
  body?: string;
}

export interface DocCreateResult {
  path: string;
  file: TFile;
  project: string;
  docType: DocType;
}

/**
 * Create a vault-only DOC note under `Projects/<slug>/DOCS/`. Refuses
 * `DOCS/superpowers/` (the repo-symlinked tree is out of scope per OP-218).
 */
export async function docCreate(app: App, input: DocCreateInput): Promise<DocCreateResult> {
  const project = findProjectBySlug(app, input.slug);
  if (!project) throw new Error(`op-doc-create: unknown project slug "${input.slug}"`);
  if (!isDocType(input.docType)) {
    throw new Error(
      `op-doc-create: doc_type must be one of plan|spec|adr|runbook (got ${JSON.stringify(input.docType)})`,
    );
  }
  const sanitized = sanitizeIssueTitle(input.title);
  if (sanitized.length === 0) {
    throw new Error("op-doc-create: title sanitizes to empty — pass a non-empty title");
  }

  const docsFolder = `Projects/${project.slug}/DOCS`;
  if (!app.vault.getAbstractFileByPath(docsFolder)) {
    await app.vault.createFolder(docsFolder);
  }

  // Filename pattern: <doc_type> — <title>.md (em-dash separator matches the
  // existing issue-note style; titles are sanitized to be vault-safe).
  const filename = `${input.docType} — ${sanitized}.md`;
  const path = normalizePath(`${docsFolder}/${filename}`);
  if (path.includes("/DOCS/superpowers/")) {
    throw new Error(
      "op-doc-create: refusing to write under DOCS/superpowers/ (repo-symlinked, out of scope)",
    );
  }
  if (app.vault.getAbstractFileByPath(path)) {
    throw new Error(`op-doc-create: file already exists at ${path}`);
  }
  const content = renderDocNote({
    project: project.slug,
    docType: input.docType,
    title: input.title,
    body: input.body,
  });
  const file = await app.vault.create(path, content);
  return { path, file, project: project.slug, docType: input.docType };
}
