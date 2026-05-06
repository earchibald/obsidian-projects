import { App, TFile } from "obsidian";
import type { IssueStore } from "./issueStore";
import type { IssueEntry } from "./types";
import { workIssue, type WorkIssueArgs, type WorkIssueResult } from "./workIssue";

export interface OnboardIssueArgs {
  agent: string;
  agentSession?: string;
  force?: boolean;
}

export interface OnboardIssueResult extends WorkIssueResult {
  onboardedAt: string;
}

export async function onboardIssue(
  app: App,
  store: IssueStore,
  entry: IssueEntry,
  args: OnboardIssueArgs,
): Promise<OnboardIssueResult> {
  const workArgs: WorkIssueArgs = {
    agent: args.agent,
    agentSession: args.agentSession,
    force: args.force,
  };

  const res = await workIssue(app, store, entry, workArgs);

  if (!res.registered) {
    return { ...res, onboardedAt: "" };
  }

  const file = app.vault.getAbstractFileByPath(entry.path);
  if (!(file instanceof TFile)) {
    throw new Error(`Issue file not found on disk: ${entry.path}`);
  }

  const onboardedAt = new Date().toISOString();

  await app.fileManager.processFrontMatter(file, (fm) => {
    fm.onboarded_at = onboardedAt;
    fm.agent_origin = "onboard";
  });

  return { ...res, onboardedAt };
}
