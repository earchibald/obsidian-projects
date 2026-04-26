import { App, TFile } from "obsidian";
import { notify } from "./notificationLog";
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
import { userError } from "./userError";
import {
  buildEditModulePrompt,
  modulePathFor,
  type ModuleScopeKind,
} from "./editModulePure";

export {
  buildEditModulePrompt,
  modulePathFor,
} from "./editModulePure";
export type { BuildEditModulePromptArgs, ModuleScopeKind } from "./editModulePure";

export interface EditModuleArgs {
  /** Module id (filename basename without `.md`). Required. */
  moduleId: string;
  /** "global" → `Projects/_op-modules/`. "project" → `Projects/<slug>/MODULES/`. */
  scopeKind: ModuleScopeKind;
  /**
   * Project slug. Required when `scopeKind === "project"`. For globals it's
   * still useful as the working-dir hint — pass the user's intended project
   * (or omit to fall back to the orchestrator's working-dir picker).
   */
  projectSlug?: string;
}

export interface EditModuleResult {
  moduleId: string;
  scopeKind: ModuleScopeKind;
  projectSlug?: string;
  agent: AgentId;
  workingDir: string;
  modulePath: string;
  scriptPath: string;
  tmuxSession: string;
  tmuxWindow: string;
}

export async function editModule(
  app: App,
  settings: OpSettings,
  detector: AgentDetector,
  saveSettings: () => Promise<void>,
  args: EditModuleArgs,
): Promise<EditModuleResult | undefined> {
  const moduleId = args.moduleId.trim();
  if (!moduleId) {
    notify("op-edit-module: moduleId is required");
    return undefined;
  }

  if (args.scopeKind === "project" && !args.projectSlug?.trim()) {
    notify("op-edit-module: project slug is required for per-project modules");
    return undefined;
  }

  const detection = detector.get() ?? (await detector.refresh());
  const installed = AGENT_IDS.filter((id) => detection?.[id]?.installed);
  if (installed.length === 0) {
    notify("op: no supported agent binaries found on PATH");
    return undefined;
  }

  const agentId = await pickAgent(app, settings, installed);
  if (!agentId) return undefined;

  const profile = resolveProfile(settings, agentId);

  const det = detection[agentId];
  if (!det.installed) {
    notify(`op: ${agentId} binary not found on PATH (looking for "${profile.binary}")`);
    return undefined;
  }

  // Resolve working dir from the slug when supplied (preferred — gives the
  // agent repo context). When editing a global module without a slug, fall
  // back to the vault root via the same modal flow used for workflow editing.
  const slugForCwd = args.projectSlug?.trim() || "_op-modules";
  const wd = await resolveWorkingDirForSlug(app, settings, slugForCwd, saveSettings);
  if (!wd) {
    userError(
      `op-edit-module: working directory required for ${slugForCwd} — launch cancelled`,
      `Set \`repo_path:\` in Projects/${slugForCwd}/STATUS.md, or re-run the command and fill in the working-dir prompt.`,
    );
    return undefined;
  }

  const modulePath = modulePathFor({
    scopeKind: args.scopeKind,
    projectSlug: args.projectSlug,
    moduleId,
  });

  const { existingContent, hasFrontmatter } = await readModuleBody(app, modulePath);

  const vaultBasePath = getVaultBasePath(app);
  const prompt = buildEditModulePrompt({
    moduleId,
    scopeKind: args.scopeKind,
    projectSlug: args.projectSlug,
    modulePath,
    repoPath: wd.path,
    vaultBasePath,
    existingContent,
    hasFrontmatter,
  });

  // Like edit-workflow, module-edit sessions deliberately bypass the layout
  // orchestrator — there's no issue here, just a single-file authoring task.
  const { scriptPath, tmuxSession, tmuxWindow } = await launchInTerminal({
    cwd: wd.path,
    binary: det.path ?? profile.binary,
    launchFlags: launchFlagsFor(profile, "implement"),
    prompt,
    terminalApp: settings.terminal,
    iTermPlacement: settings.iTermPlacement,
    tmuxBinary: settings.tmuxBinary,
    agentId,
    windowName: `op-module-${moduleId}`,
  });

  return {
    moduleId,
    scopeKind: args.scopeKind,
    projectSlug: args.projectSlug,
    agent: agentId,
    workingDir: wd.path,
    modulePath,
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

async function readModuleBody(
  app: App,
  path: string,
): Promise<{ existingContent: string | null; hasFrontmatter: boolean }> {
  const f = app.vault.getAbstractFileByPath(path);
  if (!(f instanceof TFile)) return { existingContent: null, hasFrontmatter: false };
  const raw = await app.vault.read(f);
  const hasFrontmatter = raw.startsWith("---") && raw.indexOf("\n---", 3) !== -1;
  return { existingContent: stripFrontmatter(raw), hasFrontmatter };
}

function stripFrontmatter(raw: string): string {
  if (!raw.startsWith("---")) return raw;
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return raw;
  const afterFence = raw.indexOf("\n", end + 4);
  return afterFence === -1 ? "" : raw.slice(afterFence + 1);
}

function getVaultBasePath(app: App): string | undefined {
  const adapter = app.vault.adapter as unknown as { basePath?: string; getBasePath?: () => string };
  if (typeof adapter.getBasePath === "function") return adapter.getBasePath();
  if (typeof adapter.basePath === "string") return adapter.basePath;
  return undefined;
}
