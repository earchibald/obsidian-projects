import { normalizeSectionPayload, rewriteSection } from "./setSectionPure";

// Thin wrappers around the generic section helpers. OP-141 folded the bespoke
// implementations into `setSectionPure` after `rewriteSection`'s parameter type
// was widened from the SetSectionName allowlist to `string`. Exports stay so
// setEvaluation.ts and the existing test suite keep working.

export function normalizeEvaluationPayload(raw: string): string {
  return normalizeSectionPayload(raw, "Initial Evaluation");
}

export function rewriteEvaluationSection(
  text: string,
  payload: string,
): { next: string; replaced: boolean } {
  const { next, replaced } = rewriteSection(text, "Initial Evaluation", payload);
  return { next, replaced };
}
