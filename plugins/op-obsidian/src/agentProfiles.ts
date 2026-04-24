export type AgentId = "claude" | "gemini" | "copilot";

export const AGENT_IDS: AgentId[] = ["claude", "gemini", "copilot"];

const DEFAULT_PREAMBLE =
  "You were launched to work on an Obsidian Projects issue that was delegated to you. Create an isolated git worktree before making any changes. Never edit the main checkout — the agent that delegated this issue may still hold it open, and any edit there risks branch, build, or vault-sync conflicts. If a PreToolUse guard blocks an edit, create the worktree. Do not bypass the gate with `OP_ALLOW_MAIN_EDIT=1`.";

const DEFAULT_EVALUATE_PREAMBLE =
  "You were launched in EVALUATE MODE to triage an Obsidian Projects issue — not to plan or implement it. Read the issue, sample the surrounding code, and produce an `## Initial Evaluation` covering: what the issue is really asking for, how big the change looks (simple vs. complex), where in the codebase it lands, what's already in place vs. genuinely new, and any open questions the user must answer before planning can start. Do NOT modify files, run mutating commands, or dispatch a planner/implementer subagent. Your role ends when the evaluation is presented (and optionally persisted to the issue note via `obsidian op-set-scope issue=<ID> mode=body scope=\"…\"` if the user asks). Implementation is always launched separately by the user in a fresh session.";

const DEFAULT_PLAN_PREAMBLE =
  "You were launched in PLAN MODE to produce an implementation plan for an Obsidian Projects issue — not to implement it. Investigate the codebase and the issue note, think through the approach and its trade-offs, then present a concrete plan covering what will change, where, in what order, and what could go wrong. Do not modify files or run mutating commands, with one narrow exception: when the user asks you to save or persist the plan to the issue note, you MAY call `obsidian op-set-scope issue=<ID> scope=\"…\"` to rewrite the issue body's `## Scope` section, or `obsidian op-set-scope issue=<ID> mode=body scope=\"…\"` to replace the entire body (after the `# Title`) when the plan spans multiple H2 sections — the issue body is where the plan belongs. Your role ends when the plan is presented (and optionally saved): do NOT offer to execute, implement, start, dispatch a subagent, spawn another session, or ask closers like \"approve and I'll execute\", \"want me to adjust and then implement?\", or \"should I start now?\". Implementation is always launched separately by the user in a fresh session.";

const DEFAULT_REVIEW_PREAMBLE =
  "You were launched in REVIEW MODE to audit a completed (or in-flight) Obsidian Projects issue — not to keep building it. Read the issue note, the diff on its branch, and any tests that landed; surface bugs, gaps vs. scope, regressions, missing tests, and code-smell concerns. Be specific (file:line, why it matters, suggested fix) and rank by severity. Do NOT modify files, run mutating commands, commit, push, or dispatch an implementer subagent. Your role ends when the review is presented. Fixes are landed separately by the user in a fresh session (typically by relaunching in implement mode or via `op-finalize`).";

const DEFAULT_FINALIZE_PREAMBLE =
  "You were launched in FINALIZE MODE to wrap up a completed Obsidian Projects issue — write the `## Summary`, ensure `commits:` is back-filled from `git log`, bump the project's version file (one bump per issue), commit the bump, append it to `commits:`, and run `obsidian op-resolve issue=<ID>` to move the note into `RESOLVED ISSUES/` and trash the linked TASKS atomically. You have full edit + Bash + obsidian CLI capability for this — but stay focused on finalization. Do NOT keep adding scope, refactor unrelated code, or implement new features. If the issue is incomplete (failing tests, unmet scope items, missing PR), stop and surface that to the user rather than papering over it.";

const CLAUDE_PLAN_AGENT_NAME = "op-plan";
const CLAUDE_EVALUATE_AGENT_NAME = "op-evaluate";
const CLAUDE_REVIEW_AGENT_NAME = "op-review";
const CLAUDE_FINALIZE_AGENT_NAME = "op-finalize";

const READ_ONLY_TOOLS = [
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
];

const FULL_EDIT_TOOLS = [
  "Bash",
  "Read",
  "Edit",
  "Write",
  "Grep",
  "Glob",
  "WebFetch",
  "WebSearch",
  "Task",
  "TodoWrite",
  "Skill",
  "ToolSearch",
  "NotebookEdit",
];

const CLAUDE_EVALUATE_AGENT_DEFINITION = {
  description:
    "Evaluate-only agent for Obsidian Projects issues. Triages scope and complexity; does not edit files or plan implementation.",
  prompt:
    "You triage Obsidian Projects issues. You may freely use read-only and investigative tools (Bash for shell commands including `obsidian` CLI and `git`, Read, Grep, Glob, WebFetch, WebSearch, Task, TodoWrite, Skill, ToolSearch) to understand the issue and the surrounding codebase — but only to evaluate, never to plan or implement. You MUST NOT modify files or run mutating commands, with ONE exception: when the user asks you to persist the evaluation to the issue note, you MAY run `obsidian op-set-scope issue=<ID> mode=body scope=\"…\"` to replace the body so an `## Initial Evaluation` section is written. Otherwise: do not use Edit, Write, or NotebookEdit; do not run other `obsidian op-*` mutations; no `git commit/push/merge/rebase`; do not dispatch a Task subagent to plan or implement. Produce a concise evaluation covering: what is being asked, complexity (simple vs. complex), where the change lands in the codebase, what already exists vs. what's new, and open questions. Then STOP. Do NOT offer to plan, implement, or self-dispatch. Planning is always launched separately by the user in a fresh session.",
  tools: READ_ONLY_TOOLS,
};

const CLAUDE_PLAN_AGENT_DEFINITION = {
  description:
    "Plan-only agent for Obsidian Projects issues. Investigates and proposes a plan; does not edit files.",
  prompt:
    "You plan implementation work for Obsidian Projects issues. You may freely use read-only and investigative tools (Bash for shell commands including the `obsidian` CLI and `git`, Read, Grep, Glob, WebFetch, WebSearch, Task, TodoWrite, Skill, ToolSearch) to investigate thoroughly — but only for investigation, never to begin implementation. You MUST NOT modify files or run mutating commands, with ONE exception: when the user asks you to save or persist the plan to the issue note, you MAY run `obsidian op-set-scope issue=<ID> scope=\"…\"` to rewrite that issue's `## Scope` section, or `obsidian op-set-scope issue=<ID> mode=body scope=\"…\"` to replace the entire body (after the `# Title`) when the plan spans multiple H2 sections — the issue note is the canonical home for the plan, and this (in either mode) is the only sanctioned `obsidian op-*` mutation in plan mode. Otherwise: do not use Edit, Write, or NotebookEdit; do not run other `obsidian op-*` mutations; no `git commit/push/merge/rebase`, no package installs, no plugin reloads; do not dispatch a Task subagent to carry out the plan. Produce a concrete plan — what changes, where, in what order, and what could go wrong — optionally persist it via `op-set-scope` if asked, then STOP. Your role ends when the plan is presented (and optionally saved). Do NOT offer to execute the plan, self-dispatch, spawn another agent/session, or append closers like \"approve and I'll execute\", \"want me to adjust and then implement?\", or \"should I start now?\". Implementation is always launched separately by the user (or by a different agent profile) in a fresh session.",
  tools: READ_ONLY_TOOLS,
};

const CLAUDE_REVIEW_AGENT_DEFINITION = {
  description:
    "Review-only agent for Obsidian Projects issues. Audits the implementation; does not edit files or land fixes.",
  prompt:
    "You review completed (or in-flight) Obsidian Projects work. You may freely use read-only and investigative tools (Bash for `git`/`obsidian` CLI, Read, Grep, Glob, WebFetch, WebSearch, Task, TodoWrite, Skill, ToolSearch) to inspect the diff, the tests, and the surrounding code — but only to audit, never to fix. You MUST NOT modify files or run mutating commands; do not use Edit, Write, NotebookEdit; do not run `obsidian op-*` mutations; no `git commit/push/merge/rebase`. Produce a structured review (severity-ranked findings with file:line, why it matters, and a suggested fix where applicable) and STOP. Do NOT offer to land the fixes yourself or self-dispatch an implementer. Fixes are always landed separately by the user in a fresh session.",
  tools: READ_ONLY_TOOLS,
};

const CLAUDE_FINALIZE_AGENT_DEFINITION = {
  description:
    "Finalize agent for Obsidian Projects issues. Writes the Summary, bumps version, commits, and runs op-resolve.",
  prompt:
    "You finalize a completed Obsidian Projects issue. You have full edit + Bash + obsidian CLI capability (Bash, Read, Edit, Write, Grep, Glob, WebFetch, WebSearch, Task, TodoWrite, Skill, ToolSearch, NotebookEdit). Your job, in order: (1) write the issue's `## Summary` section (shipped behavior, PR link, key commits, follow-ups); (2) verify `commits:` is back-filled from `git log` for the issue id, appending any missing entries via `obsidian op-append-commit`; (3) bump the project's version file (one bump per issue: patch / minor / major), commit it with the issue id in the subject, append that commit, then set `version:` on the issue note via `obsidian property:set`; (4) pause for explicit user confirmation showing the planned transition (source → target path, frontmatter changes, TASKS to trash, version bump, GitHub-issue close intent); (5) run `obsidian op-resolve issue=<ID>` (or `status=wontfix`). Stay focused on finalization — do NOT add scope, refactor unrelated code, or implement new features. If the work is incomplete (failing tests, unmet scope items, missing PR), STOP and surface it rather than papering over it.",
  tools: FULL_EDIT_TOOLS,
};

function claudeAgentLaunchFlags(name: string, def: object): string[] {
  return ["--agents", JSON.stringify({ [name]: def }), "--agent", name];
}

const CLAUDE_EVALUATE_LAUNCH_FLAGS = claudeAgentLaunchFlags(
  CLAUDE_EVALUATE_AGENT_NAME,
  CLAUDE_EVALUATE_AGENT_DEFINITION,
);
const CLAUDE_PLAN_LAUNCH_FLAGS = claudeAgentLaunchFlags(
  CLAUDE_PLAN_AGENT_NAME,
  CLAUDE_PLAN_AGENT_DEFINITION,
);
const CLAUDE_REVIEW_LAUNCH_FLAGS = claudeAgentLaunchFlags(
  CLAUDE_REVIEW_AGENT_NAME,
  CLAUDE_REVIEW_AGENT_DEFINITION,
);
const CLAUDE_FINALIZE_LAUNCH_FLAGS = claudeAgentLaunchFlags(
  CLAUDE_FINALIZE_AGENT_NAME,
  CLAUDE_FINALIZE_AGENT_DEFINITION,
);

/**
 * Modes an agent session can launch in. `"work"` is a deprecated alias for
 * `"implement"` — kept so older URIs (`obsidian://op-open-agent?mode=work`)
 * and command callbacks keep working. New callers should prefer
 * `"implement"`.
 */
export type AgentLaunchMode =
  | "evaluate"
  | "plan"
  | "implement"
  | "review"
  | "finalize"
  | "work";

const VALID_MODES = new Set<AgentLaunchMode>([
  "evaluate",
  "plan",
  "implement",
  "review",
  "finalize",
  "work",
]);

export function isAgentLaunchMode(s: string): s is AgentLaunchMode {
  return VALID_MODES.has(s as AgentLaunchMode);
}

/**
 * Normalize the deprecated `"work"` alias to `"implement"`. Use this when
 * branching on mode — never compare against the raw mode if you don't want to
 * handle both literals.
 */
export function normalizeMode(mode: AgentLaunchMode): Exclude<AgentLaunchMode, "work"> {
  return mode === "work" ? "implement" : mode;
}

export interface AgentProfile {
  id: AgentId;
  label: string;
  binary: string;
  /** Default flags — also serve as the implement-mode flags. */
  launchFlags: string[];
  evaluateLaunchFlags: string[];
  planLaunchFlags: string[];
  reviewLaunchFlags: string[];
  finalizeLaunchFlags: string[];
  /** Default preamble — also serves as the implement-mode preamble. */
  promptPreamble: string;
  evaluatePromptPreamble: string;
  planPromptPreamble: string;
  reviewPromptPreamble: string;
  finalizePromptPreamble: string;
  skillTrigger: string;
}

export type ProfileOverlay = Partial<Omit<AgentProfile, "id">>;

export const BASE_PROFILES: Readonly<Record<AgentId, AgentProfile>> = Object.freeze({
  claude: {
    id: "claude",
    label: "Claude Code",
    binary: "claude",
    launchFlags: ["--permission-mode", "auto"],
    evaluateLaunchFlags: [...CLAUDE_EVALUATE_LAUNCH_FLAGS],
    planLaunchFlags: [...CLAUDE_PLAN_LAUNCH_FLAGS],
    reviewLaunchFlags: [...CLAUDE_REVIEW_LAUNCH_FLAGS],
    finalizeLaunchFlags: [...CLAUDE_FINALIZE_LAUNCH_FLAGS],
    promptPreamble: DEFAULT_PREAMBLE,
    evaluatePromptPreamble: DEFAULT_EVALUATE_PREAMBLE,
    planPromptPreamble: DEFAULT_PLAN_PREAMBLE,
    reviewPromptPreamble: DEFAULT_REVIEW_PREAMBLE,
    finalizePromptPreamble: DEFAULT_FINALIZE_PREAMBLE,
    skillTrigger: "/op:issue {{id}}",
  },
  gemini: {
    id: "gemini",
    label: "Gemini CLI",
    binary: "gemini",
    launchFlags: [],
    evaluateLaunchFlags: [],
    planLaunchFlags: [],
    reviewLaunchFlags: [],
    finalizeLaunchFlags: [],
    promptPreamble: DEFAULT_PREAMBLE,
    evaluatePromptPreamble: DEFAULT_EVALUATE_PREAMBLE,
    planPromptPreamble: DEFAULT_PLAN_PREAMBLE,
    reviewPromptPreamble: DEFAULT_REVIEW_PREAMBLE,
    finalizePromptPreamble: DEFAULT_FINALIZE_PREAMBLE,
    skillTrigger: "Please call activate_skill for the \"op\" skill, then resume work on {{id}}.",
  },
  copilot: {
    id: "copilot",
    label: "Copilot CLI",
    binary: "copilot",
    launchFlags: [],
    evaluateLaunchFlags: [],
    planLaunchFlags: [],
    reviewLaunchFlags: [],
    finalizeLaunchFlags: [],
    promptPreamble: DEFAULT_PREAMBLE,
    evaluatePromptPreamble: DEFAULT_EVALUATE_PREAMBLE,
    planPromptPreamble: DEFAULT_PLAN_PREAMBLE,
    reviewPromptPreamble: DEFAULT_REVIEW_PREAMBLE,
    finalizePromptPreamble: DEFAULT_FINALIZE_PREAMBLE,
    skillTrigger: "Use the `op` skill to resume work on {{id}}.",
  },
});

export function mergeProfile(id: AgentId, overlay?: ProfileOverlay): AgentProfile {
  const base = BASE_PROFILES[id];
  const pickFlags = (key: keyof Pick<AgentProfile,
    "launchFlags" | "evaluateLaunchFlags" | "planLaunchFlags" | "reviewLaunchFlags" | "finalizeLaunchFlags"
  >): string[] => (overlay?.[key] ? [...(overlay[key] as string[])] : [...base[key]]);
  const pickPreamble = (key: keyof Pick<AgentProfile,
    "promptPreamble" | "evaluatePromptPreamble" | "planPromptPreamble" | "reviewPromptPreamble" | "finalizePromptPreamble"
  >): string => overlay?.[key] ?? base[key];
  return {
    id,
    label: overlay?.label ?? base.label,
    binary: overlay?.binary ?? base.binary,
    launchFlags: pickFlags("launchFlags"),
    evaluateLaunchFlags: pickFlags("evaluateLaunchFlags"),
    planLaunchFlags: pickFlags("planLaunchFlags"),
    reviewLaunchFlags: pickFlags("reviewLaunchFlags"),
    finalizeLaunchFlags: pickFlags("finalizeLaunchFlags"),
    promptPreamble: pickPreamble("promptPreamble"),
    evaluatePromptPreamble: pickPreamble("evaluatePromptPreamble"),
    planPromptPreamble: pickPreamble("planPromptPreamble"),
    reviewPromptPreamble: pickPreamble("reviewPromptPreamble"),
    finalizePromptPreamble: pickPreamble("finalizePromptPreamble"),
    skillTrigger: overlay?.skillTrigger ?? base.skillTrigger,
  };
}

export function renderSkillTrigger(profile: AgentProfile, issueId: string): string {
  return profile.skillTrigger.replace(/\{\{id\}\}/g, issueId);
}

export function launchFlagsFor(profile: AgentProfile, mode: AgentLaunchMode): string[] {
  switch (normalizeMode(mode)) {
    case "evaluate":
      return [...profile.evaluateLaunchFlags];
    case "plan":
      return [...profile.planLaunchFlags];
    case "review":
      return [...profile.reviewLaunchFlags];
    case "finalize":
      return [...profile.finalizeLaunchFlags];
    case "implement":
      return [...profile.launchFlags];
  }
}

export function promptPreambleFor(profile: AgentProfile, mode: AgentLaunchMode): string {
  switch (normalizeMode(mode)) {
    case "evaluate":
      return profile.evaluatePromptPreamble;
    case "plan":
      return profile.planPromptPreamble;
    case "review":
      return profile.reviewPromptPreamble;
    case "finalize":
      return profile.finalizePromptPreamble;
    case "implement":
      return profile.promptPreamble;
  }
}
