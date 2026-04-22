export type AgentId = "claude" | "gemini" | "copilot";

export const AGENT_IDS: AgentId[] = ["claude", "gemini", "copilot"];

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
    promptPreamble: "",
    skillTrigger: "/op:issue {{id}}",
  },
  gemini: {
    id: "gemini",
    label: "Gemini CLI",
    binary: "gemini",
    launchFlags: [],
    promptPreamble: "",
    skillTrigger: "Please call activate_skill for the \"op\" skill, then resume work on {{id}}.",
  },
  copilot: {
    id: "copilot",
    label: "Copilot CLI",
    binary: "copilot",
    launchFlags: [],
    promptPreamble: "",
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
