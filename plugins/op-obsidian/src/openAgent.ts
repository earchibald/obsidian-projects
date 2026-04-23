import { App, Notice, TFile } from "obsidian";
import type { IssueStore } from "./issueStore";
import type { IssueEntry } from "./types";
import type { OpSettings } from "./settings";
import {
  AGENT_IDS,
  type AgentId,
  type AgentLaunchMode,
  type AgentProfile,
  launchFlagsFor,
  mergeProfile,
} from "./agentProfiles";
import { buildPrompt } from "./promptBuild";
import { resolveWorkingDir } from "./workingDir";
import { launchInTerminal } from "./terminalLaunch";
import type { AgentDetector } from "./agentDetect";
import { AgentPickerModal } from "./modals";

export interface OpenAgentArgs {
  entry: IssueEntry;
  agentOverride?: AgentId;
  forcePick?: boolean;
  mode?: AgentLaunchMode;
}

export interface OpenAgentResult {
  issueId: string;
  agent: AgentId;
  mode: AgentLaunchMode;
  workingDir: string;
  scriptPath: string;
  tmuxSession: string;
  tmuxWindow: string;
}

export async function openAgent(
  app: App,
  store: IssueStore,
  settings: OpSettings,
  detector: AgentDetector,
  saveSettings: () => Promise<void>,
  args: OpenAgentArgs,
): Promise<OpenAgentResult | undefined> {
  const detection = detector.get() ?? (await detector.refresh());
  const mode: AgentLaunchMode = args.mode ?? "work";

  const agentId = await pickAgent(app, settings, detection, args);
  if (!agentId) return undefined;

  const profile = resolveProfile(settings, agentId);

  const det = detection[agentId];
  if (!det.installed) {
    new Notice(`op: ${agentId} binary not found on PATH (looking for "${profile.binary}")`);
    return undefined;
  }

  const wd = await resolveWorkingDir(app, settings, args.entry, saveSettings);
  if (!wd) {
    new Notice("op: working directory required — launch cancelled");
    return undefined;
  }

  // Write fm.agent up front so the sidebar badge reflects the user's intent
  // even if the terminal/orchestrator launch later throws (OP-71). The resolve
  // flow clears it on issue close, and the SessionEnd hook clears it on
  // genuine session exit — both still apply.
  await recordAgentOnIssue(app, args.entry.path, agentId);

  const vaultBasePath = getVaultBasePath(app);
  const prompt = await buildPrompt(app, store, {
    entry: args.entry,
    profile,
    injection: settings.injection,
    vaultBasePath,
    mode,
  });

  const { scriptPath, tmuxSession, tmuxWindow } = await launchInTerminal({
    cwd: wd.path,
    binary: det.path ?? profile.binary,
    launchFlags: launchFlagsFor(profile, mode),
    prompt,
    terminalApp: settings.terminal,
    iTermPlacement: settings.iTermPlacement,
    tmuxBinary: settings.tmuxBinary,
    issueId: args.entry.id,
    agentId,
    orchestrator: {
      settings: settings.orchestrator,
      registry: {
        get: () => settings.orchestratorState,
        save: async (reg) => {
          settings.orchestratorState = reg;
          await saveSettings();
        },
      },
    },
  });

  return {
    issueId: args.entry.id,
    agent: agentId,
    mode,
    workingDir: wd.path,
    scriptPath,
    tmuxSession,
    tmuxWindow,
  };
}

async function pickAgent(
  app: App,
  settings: OpSettings,
  detection: ReturnType<AgentDetector["get"]> | Awaited<ReturnType<AgentDetector["refresh"]>>,
  args: OpenAgentArgs,
): Promise<AgentId | undefined> {
  if (args.agentOverride) return args.agentOverride;

  const installed = AGENT_IDS.filter((id) => detection?.[id]?.installed);
  if (installed.length === 0) {
    new Notice("op: no supported agent binaries found on PATH");
    return undefined;
  }

  const mustPick = args.forcePick || settings.alwaysPick;
  const defaultId = settings.defaultAgent;

  if (!mustPick && installed.includes(defaultId)) return defaultId;
  if (!mustPick && installed.length === 1) return installed[0];

  return new Promise((resolve) => {
    new AgentPickerModal(app, installed, defaultId, (id) => resolve(id)).open();
  });
}

export function resolveProfile(settings: OpSettings, id: AgentId): AgentProfile {
  return mergeProfile(id, settings.agentOverlays[id]);
}

export async function recordAgentOnIssue(app: App, path: string, agentId: AgentId): Promise<void> {
  const file = app.vault.getAbstractFileByPath(path);
  if (!(file instanceof TFile)) return;
  await app.fileManager.processFrontMatter(file, (fm) => {
    fm.agent = agentId;
  });
}

export async function clearAgentOnIssue(app: App, path: string): Promise<void> {
  const file = app.vault.getAbstractFileByPath(path);
  if (!(file instanceof TFile)) return;
  await app.fileManager.processFrontMatter(file, (fm) => {
    delete fm.agent;
  });
}

function getVaultBasePath(app: App): string | undefined {
  const adapter = app.vault.adapter as unknown as { basePath?: string; getBasePath?: () => string };
  if (typeof adapter.getBasePath === "function") return adapter.getBasePath();
  if (typeof adapter.basePath === "string") return adapter.basePath;
  return undefined;
}
