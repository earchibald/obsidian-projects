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
import { workIssue } from "./workIssue";
import { resolveWorkingDir } from "./workingDir";
import { launchInTerminal } from "./terminalLaunch";
import type { AgentDetector } from "./agentDetect";
import { AgentPickerModal } from "./modals";
import { userError } from "./userError";

/** Arguments accepted by {@link openAgent}. */
export interface OpenAgentArgs {
  /** The issue the agent will work on. `entry.path` must point at a real note. */
  entry: IssueEntry;
  /** Skip detection / defaults and force this agent. */
  agentOverride?: AgentId;
  /** Always show the picker modal even when a default would satisfy the pick. */
  forcePick?: boolean;
  /** `"work"` (default) flips the issue to `in-progress`; `"plan"` is read-only. */
  mode?: AgentLaunchMode;
}

/** Result payload returned when a launch succeeds. */
export interface OpenAgentResult {
  issueId: string;
  agent: AgentId;
  mode: AgentLaunchMode;
  /** Absolute path that the agent's shell was cd'd into. */
  workingDir: string;
  /** Path to the generated launch script (useful for debugging failures). */
  scriptPath: string;
  /** Shared tmux session name (always `op-agents`). */
  tmuxSession: string;
  /** tmux window name — equals the issue id. */
  tmuxWindow: string;
}

/**
 * Launch an agent session for `args.entry`.
 *
 * High-level flow:
 *  1. Resolve an agent id (arg override → default → picker modal).
 *  2. Verify the agent binary is on PATH via the cached {@link AgentDetector}.
 *  3. Resolve the working directory; abort with a `Notice` if none configured.
 *  4. Write `fm.agent` up front so the sidebar badge reflects intent even if
 *     the terminal launch later throws (OP-71).
 *  5. In `"work"` mode, call `workIssue` to flip status → `in-progress` and
 *     create the first TASKS note (OP-93).
 *  6. Build the prompt and shell out via {@link launchInTerminal}.
 *
 * @returns The {@link OpenAgentResult}, or `undefined` if the launch was
 *   cancelled (no agent installed, user dismissed the picker, working dir
 *   missing). Any cancellation path also surfaces an Obsidian `Notice`.
 * @throws Propagates errors from `launchInTerminal` (tmux failure, iTerm
 *   AppleScript failure). The issue's `fm.agent` is left set so the sidebar
 *   reflects the attempted launch.
 */
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
    userError(
      `op: working directory required for ${args.entry.project} — launch cancelled`,
      `Set \`repo_path:\` in Projects/${args.entry.project}/STATUS.md, or re-open the agent and fill in the working-dir prompt.`,
    );
    return undefined;
  }

  // Write fm.agent up front so the sidebar badge reflects the user's intent
  // even if the terminal/orchestrator launch later throws (OP-71). The resolve
  // flow clears it on issue close, and the SessionEnd hook clears it on
  // genuine session exit — both still apply.
  await recordAgentOnIssue(app, args.entry.path, agentId);

  // OP-93: flip status to in-progress and seed the TASKS note here, so the
  // agent inherits a started issue. Auto-mode agents otherwise often skipped
  // op-work and jumped open → resolved, leaving no in-progress trail. Plan
  // mode is read-only by contract — leave the issue untouched.
  if (mode === "work" && args.entry.status !== "resolved" && args.entry.status !== "wontfix") {
    try {
      await workIssue(app, store, args.entry);
      args.entry.status = "in-progress";
    } catch (err) {
      console.error("[op-obsidian] op-open-agent: pre-launch op-work failed", err);
      new Notice(`op: failed to mark ${args.entry.id} in-progress before launch — agent should run op-work itself`);
    }
  }

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
      settings,
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

/**
 * Merge the user's overlay (from settings) on top of the built-in profile for
 * `id`. The result is the fully-resolved profile used at launch time —
 * `binary`, `launchFlags`, `promptPreamble`, etc.
 */
export function resolveProfile(settings: OpSettings, id: AgentId): AgentProfile {
  return mergeProfile(id, settings.agentOverlays[id]);
}

/**
 * Write `agent: <id>` into the issue note's frontmatter. Used by the sidebar
 * badge and by the SessionEnd hook to reconcile stale state. No-op if the
 * path does not resolve to a {@link TFile}.
 */
export async function recordAgentOnIssue(app: App, path: string, agentId: AgentId): Promise<void> {
  const file = app.vault.getAbstractFileByPath(path);
  if (!(file instanceof TFile)) return;
  await app.fileManager.processFrontMatter(file, (fm) => {
    fm.agent = agentId;
  });
}

/**
 * Remove `agent:` from the issue note's frontmatter. Called by `op-resolve`
 * and the SessionEnd hook when an agent session genuinely ends. No-op if the
 * path does not resolve to a {@link TFile}.
 */
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
