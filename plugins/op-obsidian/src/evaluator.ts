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
export function buildEvaluatorPrompt(entry: IssueEntry, body: string): string {
  const parts: string[] = [];
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
  const prompt = buildEvaluatorPrompt(entry, body);
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
