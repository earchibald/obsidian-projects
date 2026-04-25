import { App, Notice, TFile } from "obsidian";
import type { OpSettings } from "./settings";
import {
  AGENT_IDS,
  type AgentId,
  type AgentProfile,
  launchFlagsFor,
  mergeProfile,
} from "./agentProfiles";
import type { AgentDetector } from "./agentDetect";
import { AgentPickerModal } from "./modals";
import { launchInTerminal } from "./terminalLaunch";
import { resolveWorkingDirForSlug } from "./workingDir";
import { workflowPathFor } from "./workflow";
import { userError } from "./userError";
import { buildEditWorkflowPrompt } from "./editWorkflowPure";

export { buildEditWorkflowPrompt } from "./editWorkflowPure";
export type { BuildEditWorkflowPromptArgs } from "./editWorkflowPure";

export interface EditWorkflowResult {
  project: string;
  agent: AgentId;
  workingDir: string;
  workflowPath: string;
  scriptPath: string;
  tmuxSession: string;
  tmuxWindow: string;
}

export async function editWorkflow(
  app: App,
  settings: OpSettings,
  detector: AgentDetector,
  saveSettings: () => Promise<void>,
  slug: string,
): Promise<EditWorkflowResult | undefined> {
  const trimmed = slug.trim();
  if (!trimmed) {
    new Notice("op-edit-workflow: project slug is required");
    return undefined;
  }

  const detection = detector.get() ?? (await detector.refresh());
  const installed = AGENT_IDS.filter((id) => detection?.[id]?.installed);
  if (installed.length === 0) {
    new Notice("op: no supported agent binaries found on PATH");
    return undefined;
  }

  const agentId = await pickAgent(app, settings, installed);
  if (!agentId) return undefined;

  const profile = resolveProfile(settings, agentId);

  const det = detection[agentId];
  if (!det.installed) {
    new Notice(`op: ${agentId} binary not found on PATH (looking for "${profile.binary}")`);
    return undefined;
  }

  const wd = await resolveWorkingDirForSlug(app, settings, trimmed, saveSettings);
  if (!wd) {
    userError(
      `op-edit-workflow: working directory required for ${trimmed} — launch cancelled`,
      `Set \`repo_path:\` in Projects/${trimmed}/STATUS.md, or re-run the command and fill in the working-dir prompt.`,
    );
    return undefined;
  }

  const workflowPath = workflowPathFor(trimmed);
  const existingContent = await readWorkflowBody(app, workflowPath);

  const vaultBasePath = getVaultBasePath(app);
  const prompt = buildEditWorkflowPrompt({
    slug: trimmed,
    workflowPath,
    repoPath: wd.path,
    vaultBasePath,
    existingContent,
  });

  // Workflow editor sessions deliberately bypass the layout orchestrator —
  // it keys per-issue surface state and there's no issue here. Falls through
  // to the standard tmux/iTerm path with our explicit windowName.
  const { scriptPath, tmuxSession, tmuxWindow } = await launchInTerminal({
    cwd: wd.path,
    binary: det.path ?? profile.binary,
    // Use implement-mode flags so the agent has full edit capability — the
    // workflow file is the only sanctioned write target for the session.
    launchFlags: launchFlagsFor(profile, "implement"),
    prompt,
    terminalApp: settings.terminal,
    iTermPlacement: settings.iTermPlacement,
    tmuxBinary: settings.tmuxBinary,
    agentId,
    windowName: `op-workflow-${trimmed}`,
  });

  return {
    project: trimmed,
    agent: agentId,
    workingDir: wd.path,
    workflowPath,
    scriptPath,
    tmuxSession,
    tmuxWindow,
  };
}

async function pickAgent(
  app: App,
  settings: OpSettings,
  installed: AgentId[],
): Promise<AgentId | undefined> {
  const defaultId = settings.defaultAgent;
  const mustPick = settings.alwaysPick;
  if (!mustPick && installed.includes(defaultId)) return defaultId;
  if (!mustPick && installed.length === 1) return installed[0];
  return new Promise((resolve) => {
    new AgentPickerModal(app, installed, defaultId, (id) => resolve(id)).open();
  });
}

function resolveProfile(settings: OpSettings, id: AgentId): AgentProfile {
  return mergeProfile(id, settings.agentOverlays[id]);
}

async function readWorkflowBody(app: App, path: string): Promise<string | null> {
  const f = app.vault.getAbstractFileByPath(path);
  if (!(f instanceof TFile)) return null;
  const raw = await app.vault.read(f);
  return stripFrontmatter(raw);
}

function stripFrontmatter(raw: string): string {
  if (!raw.startsWith("---")) return raw;
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return raw;
  const afterFence = raw.indexOf("\n", end + 4);
  return afterFence === -1 ? "" : raw.slice(afterFence + 1);
}

function stripTrailingSlash(p: string): string {
  return p.endsWith("/") ? p.slice(0, -1) : p;
}

function getVaultBasePath(app: App): string | undefined {
  const adapter = app.vault.adapter as unknown as { basePath?: string; getBasePath?: () => string };
  if (typeof adapter.getBasePath === "function") return adapter.getBasePath();
  if (typeof adapter.basePath === "string") return adapter.basePath;
  return undefined;
}
