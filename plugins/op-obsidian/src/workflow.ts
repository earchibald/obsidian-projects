import { App, TFile, normalizePath } from "obsidian";

export interface GetWorkflowResult {
  project: string;
  path: string;
  exists: boolean;
  content: string | null;
  size: number;
}

export function workflowPathFor(project: string): string {
  return normalizePath(`Projects/${project}/WORKFLOW.md`);
}

export async function getWorkflow(app: App, project: string): Promise<GetWorkflowResult> {
  const slug = project.trim();
  if (!slug) throw new Error("project is required");
  const path = workflowPathFor(slug);
  const f = app.vault.getAbstractFileByPath(path);
  if (!(f instanceof TFile)) {
    return { project: slug, path, exists: false, content: null, size: 0 };
  }
  const content = await app.vault.read(f);
  return { project: slug, path, exists: true, content, size: content.length };
}
