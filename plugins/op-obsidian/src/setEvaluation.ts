import { App, TFile } from "obsidian";
import type { IssueEntry } from "./types";
import {
  normalizeEvaluationPayload,
  rewriteEvaluationSection,
} from "./setEvaluationPure";

export interface SetEvaluationResult {
  issueId: string;
  path: string;
  evaluation: string;
  replaced: boolean;
}

// Replace (or append) the body's `## Initial Evaluation` section. Frontmatter
// and any `# Title` heading plus any other H2 sections are preserved. Payload
// must not contain an H2 — that would terminate the Initial Evaluation section.
export async function setEvaluation(
  app: App,
  entry: IssueEntry,
  evaluation: string,
): Promise<SetEvaluationResult> {
  const payload = normalizeEvaluationPayload(evaluation);
  const file = requireFile(app, entry.path);
  const text = await app.vault.read(file);
  const { next, replaced } = rewriteEvaluationSection(text, payload);
  if (next !== text) {
    await app.vault.modify(file, next);
  }
  return { issueId: entry.id, path: entry.path, evaluation: payload, replaced };
}

function requireFile(app: App, path: string): TFile {
  const f = app.vault.getAbstractFileByPath(path);
  if (!(f instanceof TFile)) throw new Error(`Issue file not found on disk: ${path}`);
  return f;
}
