export type AgentId = "claude" | "gemini" | "copilot";

export const AGENT_IDS: AgentId[] = ["claude", "gemini", "copilot"];

const DEFAULT_PREAMBLE =
  "You were launched to work on an Obsidian Projects issue that was delegated to you. Create an isolated git worktree before making any changes. Never edit the main checkout — the agent that delegated this issue may still hold it open, and any edit there risks branch, build, or vault-sync conflicts. If a PreToolUse guard blocks an edit, create the worktree. Do not bypass the gate with `OP_ALLOW_MAIN_EDIT=1`.";

const DEFAULT_PLAN_PREAMBLE =
  "You were launched in PLAN MODE to produce an implementation plan for an Obsidian Projects issue — not to implement it. Investigate the codebase and the issue note, think through the approach and its trade-offs, then present a concrete plan for the user to review before any code is written. Do not modify files or run mutating commands yet. The plan should cover: what will change, where, in what order, and what could go wrong. Once the user approves the plan, a separate session will carry out the implementation.";

const CLAUDE_PLAN_AGENT_NAME = "op-plan";

const CLAUDE_PLAN_AGENT_DEFINITION = {
  description:
    "Plan-only agent for Obsidian Projects issues. Investigates and proposes a plan; does not edit files.",
  prompt:
    "You plan implementation work for Obsidian Projects issues. You may freely use read-only and investigative tools (Bash for shell commands including the `obsidian` CLI and `git`, Read, Grep, Glob, WebFetch, WebSearch, Task, TodoWrite, Skill, ToolSearch). You MUST NOT modify files or run mutating commands: do not use Edit, Write, or NotebookEdit; do not run commands that change vault, git, or plugin state (no `obsidian op-*` mutations, no `git commit/push/merge/rebase`, no package installs, no plugin reloads). Produce a concrete plan — what changes, where, in what order, and what could go wrong — and wait for user approval before any implementation session begins.",
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

const CLAUDE_PLAN_LAUNCH_FLAGS = [
  "--agents",
  JSON.stringify({ [CLAUDE_PLAN_AGENT_NAME]: CLAUDE_PLAN_AGENT_DEFINITION }),
  "--agent",
  CLAUDE_PLAN_AGENT_NAME,
];

export type AgentLaunchMode = "work" | "plan";

export interface AgentProfile {
  id: AgentId;
  label: string;
  binary: string;
  launchFlags: string[];
  planLaunchFlags: string[];
  promptPreamble: string;
  planPromptPreamble: string;
  skillTrigger: string;
}

export type ProfileOverlay = Partial<Omit<AgentProfile, "id">>;

export const BASE_PROFILES: Readonly<Record<AgentId, AgentProfile>> = Object.freeze({
  claude: {
    id: "claude",
    label: "Claude Code",
    binary: "claude",
    launchFlags: ["--permission-mode", "auto"],
    planLaunchFlags: [...CLAUDE_PLAN_LAUNCH_FLAGS],
    promptPreamble: DEFAULT_PREAMBLE,
    planPromptPreamble: DEFAULT_PLAN_PREAMBLE,
    skillTrigger: "/op:issue {{id}}",
  },
  gemini: {
    id: "gemini",
    label: "Gemini CLI",
    binary: "gemini",
    launchFlags: [],
    planLaunchFlags: [],
    promptPreamble: DEFAULT_PREAMBLE,
    planPromptPreamble: DEFAULT_PLAN_PREAMBLE,
    skillTrigger: "Please call activate_skill for the \"op\" skill, then resume work on {{id}}.",
  },
  copilot: {
    id: "copilot",
    label: "Copilot CLI",
    binary: "copilot",
    launchFlags: [],
    planLaunchFlags: [],
    promptPreamble: DEFAULT_PREAMBLE,
    planPromptPreamble: DEFAULT_PLAN_PREAMBLE,
    skillTrigger: "Use the `op` skill to resume work on {{id}}.",
  },
});

export function mergeProfile(id: AgentId, overlay?: ProfileOverlay): AgentProfile {
  const base = BASE_PROFILES[id];
  if (!overlay) {
    return {
      ...base,
      launchFlags: [...base.launchFlags],
      planLaunchFlags: [...base.planLaunchFlags],
    };
  }
  return {
    id,
    label: overlay.label ?? base.label,
    binary: overlay.binary ?? base.binary,
    launchFlags: overlay.launchFlags ? [...overlay.launchFlags] : [...base.launchFlags],
    planLaunchFlags: overlay.planLaunchFlags
      ? [...overlay.planLaunchFlags]
      : [...base.planLaunchFlags],
    promptPreamble: overlay.promptPreamble ?? base.promptPreamble,
    planPromptPreamble: overlay.planPromptPreamble ?? base.planPromptPreamble,
    skillTrigger: overlay.skillTrigger ?? base.skillTrigger,
  };
}

export function renderSkillTrigger(profile: AgentProfile, issueId: string): string {
  return profile.skillTrigger.replace(/\{\{id\}\}/g, issueId);
}

export function launchFlagsFor(profile: AgentProfile, mode: AgentLaunchMode): string[] {
  return mode === "plan" ? [...profile.planLaunchFlags] : [...profile.launchFlags];
}

export function promptPreambleFor(profile: AgentProfile, mode: AgentLaunchMode): string {
  return mode === "plan" ? profile.planPromptPreamble : profile.promptPreamble;
}
