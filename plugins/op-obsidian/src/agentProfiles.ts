export type AgentId = "claude" | "gemini" | "copilot";

export const AGENT_IDS: AgentId[] = ["claude", "gemini", "copilot"];

const DEFAULT_PREAMBLE =
  "You were launched to work on an Obsidian Projects issue that was delegated to you. If the work touches more than a single file or involves more than one trivial edit, create an isolated git worktree before making changes — the agent that delegated this issue may still hold the main checkout open, and a worktree keeps your branch, builds, and vault sync from colliding with theirs. Skip the worktree only for one-line doc tweaks, single-field schema comments, or typo fixes.";

export interface AgentProfile {
  id: AgentId;
  label: string;
  binary: string;
  launchFlags: string[];
  promptPreamble: string;
  skillTrigger: string;
}

export type ProfileOverlay = Partial<Omit<AgentProfile, "id">>;

export const BASE_PROFILES: Readonly<Record<AgentId, AgentProfile>> = Object.freeze({
  claude: {
    id: "claude",
    label: "Claude Code",
    binary: "claude",
    launchFlags: ["--permission-mode", "auto"],
    promptPreamble: DEFAULT_PREAMBLE,
    skillTrigger: "/op:issue {{id}}",
  },
  gemini: {
    id: "gemini",
    label: "Gemini CLI",
    binary: "gemini",
    launchFlags: [],
    promptPreamble: DEFAULT_PREAMBLE,
    skillTrigger: "Please call activate_skill for the \"op\" skill, then resume work on {{id}}.",
  },
  copilot: {
    id: "copilot",
    label: "Copilot CLI",
    binary: "copilot",
    launchFlags: [],
    promptPreamble: DEFAULT_PREAMBLE,
    skillTrigger: "Use the `op` skill to resume work on {{id}}.",
  },
});

export function mergeProfile(id: AgentId, overlay?: ProfileOverlay): AgentProfile {
  const base = BASE_PROFILES[id];
  if (!overlay) return { ...base, launchFlags: [...base.launchFlags] };
  return {
    id,
    label: overlay.label ?? base.label,
    binary: overlay.binary ?? base.binary,
    launchFlags: overlay.launchFlags ? [...overlay.launchFlags] : [...base.launchFlags],
    promptPreamble: overlay.promptPreamble ?? base.promptPreamble,
    skillTrigger: overlay.skillTrigger ?? base.skillTrigger,
  };
}

export function renderSkillTrigger(profile: AgentProfile, issueId: string): string {
  return profile.skillTrigger.replace(/\{\{id\}\}/g, issueId);
}
