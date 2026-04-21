import { App, TFile } from "obsidian";
import type { IssueEntry } from "./types";

export interface AppendCommitInput {
  sha: string;
  subject: string;
}

export interface AppendCommitResult {
  issueId: string;
  path: string;
  entry: string;
  added: boolean;
  commits: string[];
}

export async function appendCommit(
  app: App,
  entry: IssueEntry,
  input: AppendCommitInput,
): Promise<AppendCommitResult> {
  const sha = input.sha.trim();
  const subject = input.subject.trim();
  if (!/^[0-9a-f]{7,40}$/i.test(sha)) {
    throw new Error(`Invalid sha: ${input.sha}`);
  }
  if (!subject) {
    throw new Error("Commit subject is required");
  }
  const line = `${sha} ${subject}`;

  const file = requireFile(app, entry.path);
  let added = false;
  let commits: string[] = [];

  await app.fileManager.processFrontMatter(file, (fm) => {
    const current = Array.isArray(fm.commits)
      ? fm.commits.filter((x: unknown): x is string => typeof x === "string")
      : [];
    const shaPrefix = sha.slice(0, 7).toLowerCase();
    const already = current.some((c) => c.toLowerCase().startsWith(shaPrefix));
    if (already) {
      commits = current;
      return;
    }
    current.push(line);
    fm.commits = current;
    commits = current;
    added = true;
  });

  return { issueId: entry.id, path: entry.path, entry: line, added, commits };
}

export interface SetPrResult {
  issueId: string;
  path: string;
  pr: string;
}

export async function setPr(app: App, entry: IssueEntry, url: string): Promise<SetPrResult> {
  const u = url.trim();
  if (!/^https?:\/\//i.test(u)) {
    throw new Error(`pr URL must be http(s): ${url}`);
  }
  const file = requireFile(app, entry.path);
  await app.fileManager.processFrontMatter(file, (fm) => {
    fm.pr = u;
  });
  return { issueId: entry.id, path: entry.path, pr: u };
}

function requireFile(app: App, path: string): TFile {
  const f = app.vault.getAbstractFileByPath(path);
  if (!(f instanceof TFile)) throw new Error(`Issue file not found on disk: ${path}`);
  return f;
}
