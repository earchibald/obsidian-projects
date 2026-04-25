import { App, TFile } from "obsidian";
import { execFile } from "child_process";
import { promisify } from "util";
import type { IssueEntry } from "./types";
import { extractIssueUrl, isAlreadyClosedError, type GithubCloseReason } from "./githubPure";

const pExecFile = promisify(execFile);

export interface CreateGithubIssueInput {
  repoPath: string;
  title: string;
  body: string;
}

export async function createGithubIssue(input: CreateGithubIssueInput): Promise<string> {
  const env = augmentedPathEnv();
  const args = ["issue", "create", "--title", input.title, "--body", input.body];
  try {
    const { stdout } = await pExecFile("gh", args, { cwd: input.repoPath, env });
    const url = extractIssueUrl(stdout);
    if (!url) throw new Error(`gh issue create returned no URL: ${stdout.trim()}`);
    return url;
  } catch (err: any) {
    const stderr = typeof err?.stderr === "string" ? err.stderr.trim() : "";
    const msg = stderr || err?.message || String(err);
    throw new Error(`gh issue create failed: ${msg}`);
  }
}

export type GithubIssueState = "OPEN" | "CLOSED" | "UNKNOWN";

export async function getIssueState(repoPath: string, url: string): Promise<GithubIssueState> {
  const env = augmentedPathEnv();
  try {
    const { stdout } = await pExecFile(
      "gh",
      ["issue", "view", url, "--json", "state"],
      { cwd: repoPath, env },
    );
    const parsed = JSON.parse(stdout) as { state?: string };
    const state = (parsed?.state ?? "").toUpperCase();
    if (state === "OPEN" || state === "CLOSED") return state;
    return "UNKNOWN";
  } catch {
    return "UNKNOWN";
  }
}

// Idempotent: safe to call repeatedly. Two layered defenses against gh's
// GraphQL `closeIssue` mutation rejecting already-closed issues with
// "Could not close the issue. (closeIssue)":
//   1. pre-check live state and short-circuit if already CLOSED;
//   2. tolerate that specific error as a no-op race — re-query state and
//      swallow if CLOSED, else re-throw.
// Real failures (auth, network, repo not found) still throw.
export async function closeGithubIssue(
  repoPath: string,
  url: string,
  reason: GithubCloseReason,
): Promise<void> {
  if ((await getIssueState(repoPath, url)) === "CLOSED") return;
  const env = augmentedPathEnv();
  try {
    await pExecFile("gh", ["issue", "close", url, "--reason", reason], { cwd: repoPath, env });
  } catch (err: any) {
    const stderr = typeof err?.stderr === "string" ? err.stderr.trim() : "";
    if (isAlreadyClosedError(stderr)) {
      if ((await getIssueState(repoPath, url)) === "CLOSED") return;
    }
    const msg = stderr || err?.message || String(err);
    throw new Error(`gh issue close failed: ${msg}`);
  }
}

export async function setGithubIssue(
  app: App,
  entry: IssueEntry,
  url: string,
): Promise<{ issueId: string; path: string; githubIssue: string }> {
  const u = url.trim();
  if (!/^https?:\/\/[^\s]+\/issues\/\d+/i.test(u)) {
    throw new Error(`github_issue URL must look like https://github.com/owner/repo/issues/N: ${url}`);
  }
  const f = app.vault.getAbstractFileByPath(entry.path);
  if (!(f instanceof TFile)) throw new Error(`Issue file not found on disk: ${entry.path}`);
  await app.fileManager.processFrontMatter(f, (fm) => {
    fm.github_issue = u;
  });
  return { issueId: entry.id, path: entry.path, githubIssue: u };
}

export { extractIssueUrl } from "./githubPure";

export function augmentedPathEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  const extras = [
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    `${process.env.HOME ?? ""}/.local/bin`,
  ];
  const existing = (env.PATH ?? "").split(":").filter(Boolean);
  const merged = [...existing];
  for (const p of extras) if (p && !merged.includes(p)) merged.push(p);
  env.PATH = merged.join(":");
  return env;
}
