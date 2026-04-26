import type { IssueEntry } from "./types";
import type { Complexity } from "./setFlow";
import type { SetEvaluationResult } from "./setEvaluation";
import type { SetFlowResult } from "./setFlow";
import type {
  LaunchHeadlessSubtaskInput,
  LaunchHeadlessSubtaskResult,
} from "./launchHeadlessSubtask";
import type { RelaySession } from "./relaySession";

const EVALUATOR_AGENT_NAME = "op-evaluate";

/**
 * OP-199 (2b): hard cap on the `## Project workflow` section prepended to the
 * evaluator's prompt. The evaluator is a quick triage agent whose only job is
 * scope/complexity classification; it doesn't need the full 50 000-char
 * default budget. A long workflow section would push the evaluator into a
 * slower reasoning regime, risk hitting per-call context limits, and could
 * confuse the `COMPLEXITY:` trailer parser if the model starts reasoning
 * inside the workflow text.
 *
 * 6 000 chars is enough for a detailed per-step description while still being
 * well under the evaluator's overall prompt budget. Authors who want richer
 * workflow context at evaluate-time can define a dedicated `evaluate:` step
 * with a small focused module rather than relying on the default budget.
 *
 * Exported so callers (main.ts) can advertise the cap in diagnostics without
 * hard-coding a magic number.
 */
export const EVALUATOR_MAX_WORKFLOW_CHARS = 6000;

const EVALUATOR_AGENT_DEFINITION = {
  description:
    "Evaluate-only agent for Obsidian Projects issues — triages scope and complexity, emits a final `COMPLEXITY:` marker.",
  prompt:
    "You triage an Obsidian Projects issue. You MUST NOT modify files or run mutating commands. Produce a short `## Initial Evaluation` body (no H2 headings inside, no file edits): what is being asked, how big the change looks (simple vs. complex), where in the codebase it lands, what already exists vs. what is new, and any open questions. At the end of your response, on its own line, emit exactly one classification in the form `COMPLEXITY: simple` or `COMPLEXITY: complex`. Nothing after that line.",
  tools: [
    "Bash",
    "Read",
    "Grep",
    "Glob",
    "WebFetch",
    "WebSearch",
    "Task",
    "TodoWrite",
    "Skill",
    "ToolSearch",
  ],
};

export interface EvaluatorParseResult {
  evaluation: string;
  complexity: Complexity;
}

// Pull the final `COMPLEXITY: simple|complex` marker from the evaluator's
// response and return the body with that trailer stripped. Throws when the
// marker is missing or unrecognized — callers treat that as an evaluator
// failure and leave `flow`/`complexity` unset.
export function parseEvaluatorClassification(raw: string): EvaluatorParseResult {
  if (typeof raw !== "string") {
    throw new Error("evaluator result is not a string");
  }
  const trimmed = raw.replace(/\r\n/g, "\n").trimEnd();
  if (!trimmed) throw new Error("evaluator returned an empty response");
  const re = /^\s*COMPLEXITY:\s*(simple|complex)\s*$/im;
  const match = trimmed.match(re);
  if (!match) {
    throw new Error(
      "evaluator response missing `COMPLEXITY: simple|complex` trailer",
    );
  }
  const complexity = match[1].toLowerCase() as Complexity;
  const evaluation = trimmed.replace(re, "").trimEnd();
  if (!evaluation) {
    throw new Error("evaluator response had only a classification, no evaluation body");
  }
  return { evaluation, complexity };
}

// Prompt handed to `claude -p`. The inline `--agents` definition enforces
// read-only scope; the prompt itself names the issue and embeds the scope
// body so the evaluator doesn't have to read the note first. The final
// `COMPLEXITY:` marker is parsed by `parseEvaluatorClassification`.
//
// OP-199 (2b): an optional `workflowSection` is prepended verbatim — when
// the caller is in modules-mode, it composes the workflow's `evaluate` step
// (via `composeWorkflowSection` from `promptBuild.ts`) and threads the
// result here. `null` / empty means no injection (legacy mode, or modules
// mode without a workflow file). The trailing `evaluate` paragraph stays
// at the end so the `COMPLEXITY:` marker contract is unchanged.
export function buildEvaluatorPrompt(
  entry: IssueEntry,
  body: string,
  workflowSection?: string | null,
): string {
  const parts: string[] = [];
  if (workflowSection && workflowSection.trim().length > 0) {
    parts.push(workflowSection.trim());
  }
  parts.push(
    `Evaluate ${entry.id} — ${entry.title}. Project: ${entry.project}. Note path: ${entry.path}.`,
  );
  parts.push(
    "Follow your agent definition: produce a short evaluation, then emit a final line of the form `COMPLEXITY: simple` or `COMPLEXITY: complex`.",
  );
  const trimmedBody = body.trim();
  if (trimmedBody.length > 0) {
    parts.push("## Issue body\n\n" + trimmedBody);
  }
  return parts.join("\n\n");
}

export interface EvaluatorFlowDeps {
  launch: (input: LaunchHeadlessSubtaskInput) => Promise<LaunchHeadlessSubtaskResult>;
  setEvaluation: (entry: IssueEntry, evaluation: string) => Promise<SetEvaluationResult>;
  setFlow: (
    entry: IssueEntry,
    input: { flow?: "evaluate"; complexity?: Complexity },
  ) => Promise<SetFlowResult>;
  /**
   * Visibility-tenet relay that the headless evaluator subtask streams into.
   * Production callers construct a tmux-shaped relay backed by `Notice` +
   * `console.log` (see `main.ts:runEvaluatorForIssue`); tests construct
   * `makeTestRelay()` and assert on the captured event stream. Required —
   * the typechecker rejects deps that omit it.
   */
  relaySession: RelaySession;
  /**
   * OP-199 (2b): optional async hook that returns the composed workflow
   * section to prepend to the evaluator's prompt. Wired by `main.ts` to
   * `composeWorkflowSection(app, { ..., workflowStep: 'evaluate' })` when
   * `settings.workflowMode === 'modules'`. `null` (or omission) means no
   * injection — the evaluator's prompt is byte-identical to the pre-OP-199
   * shape, so legacy mode and tests that don't supply this dep see no
   * behavior change.
   *
   * **Closure-capture ordering.** The production closure in `main.ts` captures
   * `entry` by reference. `runEvaluatorFlow` invokes this dep as its FIRST
   * step — before `setEvaluation` or `setFlow` write back to frontmatter —
   * so the composed render context always sees the pre-mutation `entry` state
   * (e.g. `status: 'open'`, not `'evaluate'`). If a future refactor moves
   * this invocation after a mutation, the composed context will reflect the
   * post-mutation state; that would be a behaviour change worth a deliberate
   * comment at the new callsite.
   */
  composeWorkflowSection?: () => Promise<string | null>;
}

export interface EvaluatorFlowResult {
  evaluation: string;
  complexity: Complexity;
  setEvaluationResult: SetEvaluationResult;
  setFlowResult: SetFlowResult;
}

// Orchestrates launchHeadlessSubtask → setEvaluation → setFlow. On any failure the
// error is rethrown so the caller can surface it via Notice and skip the
// frontmatter writes (flow/complexity stay unset).
export async function runEvaluatorFlow(
  deps: EvaluatorFlowDeps,
  entry: IssueEntry,
  body: string,
): Promise<EvaluatorFlowResult> {
  // OP-199 (2b): compose the workflow section for the `evaluate` step
  // (when modules-mode is on). Fail-soft — any error in the composer
  // bubbles up as `null` so a misconfigured workflow file doesn't block
  // the evaluator launch.
  let workflowSection: string | null = null;
  if (deps.composeWorkflowSection) {
    try {
      workflowSection = await deps.composeWorkflowSection();
    } catch (err) {
      console.warn("[op-obsidian] evaluator: composeWorkflowSection threw — proceeding without injection", err);
      workflowSection = null;
    }
  }
  const prompt = buildEvaluatorPrompt(entry, body, workflowSection);
  const launchResult = await deps.launch({
    prompt,
    agents: { [EVALUATOR_AGENT_NAME]: EVALUATOR_AGENT_DEFINITION },
    agent: EVALUATOR_AGENT_NAME,
    permissionMode: "dontAsk",
    allowedTools: EVALUATOR_AGENT_DEFINITION.tools,
    relaySession: deps.relaySession,
  });
  const parsed = parseEvaluatorClassification(launchResult.text);
  const setEvaluationResult = await deps.setEvaluation(entry, parsed.evaluation);
  const setFlowResult = await deps.setFlow(entry, {
    flow: "evaluate",
    complexity: parsed.complexity,
  });
  return {
    evaluation: parsed.evaluation,
    complexity: parsed.complexity,
    setEvaluationResult,
    setFlowResult,
  };
}
