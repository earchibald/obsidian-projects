import { App, TFile } from "obsidian";
import type { IssueEntry } from "./types";

// OP-188: `Flow` is a free-form step id. The pre-OP-188 closed enum
// (`evaluate | planning | … | done`) was retired when the orchestrator moved
// from a hardcoded transition matrix to a workflow-file walker — the walker
// itself enforces "is this step in the workflow," and the legacy alias map
// in `flowOrchestrator.ts:LEGACY_FLOW_ALIAS` keeps pre-OP-188 frontmatter
// parseable.
//
// `validateFlow` keeps the minimum guard: trim non-empty so writers can't
// silently land a blank `flow:` value. Step ids that don't appear in the
// project's workflow surface as no-op auto-advances at orchestrator time
// rather than as setFlow-time rejections — matching the "schema-conformant
// writes, walker-enforced semantics" split the workflow-modules engine uses
// elsewhere.
export type Flow = string;

export const COMPLEXITY_VALUES = ["simple", "complex"] as const;
export type Complexity = (typeof COMPLEXITY_VALUES)[number];

export interface SetFlowInput {
  flow?: Flow | null;
  complexity?: Complexity | null;
}

export interface SetFlowResult {
  issueId: string;
  path: string;
  flow: Flow | null;
  complexity: Complexity | null;
}

// Frontmatter-only mutation of `flow` and/or `complexity`. Pass `null` for a
// field to clear it; omit the key to leave it untouched. At least one key must
// be provided. Values validated against schema enums.
export async function setFlow(
  app: App,
  entry: IssueEntry,
  input: SetFlowInput,
): Promise<SetFlowResult> {
  const hasFlow = Object.prototype.hasOwnProperty.call(input, "flow");
  const hasComplexity = Object.prototype.hasOwnProperty.call(input, "complexity");
  if (!hasFlow && !hasComplexity) {
    throw new Error("setFlow: must provide at least one of flow or complexity");
  }
  if (hasFlow && input.flow !== null && input.flow !== undefined) {
    validateFlow(input.flow);
  }
  if (hasComplexity && input.complexity !== null && input.complexity !== undefined) {
    validateComplexity(input.complexity);
  }

  const file = requireFile(app, entry.path);
  let finalFlow: Flow | null = null;
  let finalComplexity: Complexity | null = null;

  await app.fileManager.processFrontMatter(file, (fm) => {
    if (hasFlow) {
      if (input.flow === null || input.flow === undefined) {
        delete fm.flow;
      } else {
        fm.flow = input.flow;
      }
    }
    if (hasComplexity) {
      if (input.complexity === null || input.complexity === undefined) {
        delete fm.complexity;
      } else {
        fm.complexity = input.complexity;
      }
    }
    finalFlow = (typeof fm.flow === "string" ? fm.flow : null) as Flow | null;
    finalComplexity = (typeof fm.complexity === "string" ? fm.complexity : null) as Complexity | null;
  });

  return {
    issueId: entry.id,
    path: entry.path,
    flow: finalFlow,
    complexity: finalComplexity,
  };
}

export function validateFlow(v: string): asserts v is Flow {
  if (typeof v !== "string" || v.trim() === "") {
    throw new Error(`Invalid flow: ${JSON.stringify(v)} — expected a non-empty step id string`);
  }
}

export function validateComplexity(v: string): asserts v is Complexity {
  if (!(COMPLEXITY_VALUES as readonly string[]).includes(v)) {
    throw new Error(
      `Invalid complexity: ${JSON.stringify(v)} — expected one of ${COMPLEXITY_VALUES.join(", ")}`,
    );
  }
}

function requireFile(app: App, path: string): TFile {
  const f = app.vault.getAbstractFileByPath(path);
  if (!(f instanceof TFile)) throw new Error(`Issue file not found on disk: ${path}`);
  return f;
}
