import { execFile } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import { join } from "path";
import * as fsp from "fs/promises";
import { App } from "obsidian";
import {
  VAULT_GIT_DEFAULT_GITIGNORE,
  computeFlushPlan,
  formatCommitMessage,
  type FlushLogEntry,
} from "./vaultGitPure";

const pExecFile = promisify(execFile);

/** Maximum bytes of `git log` we read for a flush plan. ~200 commits is well
 * past any plausible per-issue history; bounding the buffer keeps memory
 * predictable. */
const FLUSH_LOG_MAX = 200;

/** Command timeout for vault-git child processes. Auto-commit calls run in
 * the hot path on every mutation, so we cap them aggressively — anything
 * past 5s is a signal to skip the commit and surface a console warning,
 * never to block the op-* response. */
const GIT_TIMEOUT_MS = 5_000;

/**
 * Resolve the absolute filesystem path of the vault root, or `undefined` if
 * the adapter doesn't expose one (mobile / web / shimmed adapters in tests).
 * Mirrors the `resolveCookieCachePath` shape used elsewhere in main.ts.
 */
export function resolveVaultBasePath(app: App): string | undefined {
  const adapter = app.vault.adapter as unknown as {
    basePath?: string;
    getBasePath?: () => string;
  };
  if (typeof adapter.basePath === "string") return adapter.basePath;
  if (typeof adapter.getBasePath === "function") return adapter.getBasePath();
  return undefined;
}

/**
 * `true` when `<vaultBase>/.git` exists (either a directory for normal repos
 * or a file for git submodules/worktrees). Synchronous so the per-mutation
 * fast path can short-circuit without awaiting an FS roundtrip.
 */
export function isVaultGitRepoSync(vaultBase: string): boolean {
  if (!vaultBase) return false;
  return existsSync(join(vaultBase, ".git"));
}

export interface AutoCommitInput {
  vaultBase: string;
  paths: readonly string[];
  message: string;
}

export interface AutoCommitResult {
  committed: boolean;
  // Set when we deliberately skipped: `not-a-repo`, `no-changes`, `git-missing`.
  skipped?: "not-a-repo" | "no-changes" | "git-missing";
  // Set when git itself errored. Best-effort: caller logs and moves on.
  error?: string;
  commitSha?: string;
}

/**
 * Stage `paths` and commit them in `vaultBase`. Returns `{committed:false, skipped}`
 * for the documented no-op cases (not a repo, nothing changed) and never
 * throws — the audit + UI flow on the caller side must not be blocked by
 * a transient git failure.
 *
 * `paths` are vault-relative (matches what op-* handlers track in
 * `inFlightOpWritePaths`). We `git add --` them (literal interpretation, no
 * pathspec magic) and let git deduplicate against the index.
 */
export async function runAutoCommit(input: AutoCommitInput): Promise<AutoCommitResult> {
  const { vaultBase, paths, message } = input;
  if (!vaultBase) return { committed: false, skipped: "not-a-repo" };
  if (!isVaultGitRepoSync(vaultBase)) {
    return { committed: false, skipped: "not-a-repo" };
  }
  if (paths.length === 0) return { committed: false, skipped: "no-changes" };

  try {
    await pExecFile("git", ["-C", vaultBase, "add", "--", ...paths], {
      timeout: GIT_TIMEOUT_MS,
    });
  } catch (err: any) {
    if (err?.code === "ENOENT") return { committed: false, skipped: "git-missing" };
    return { committed: false, error: stringifyExecErr(err) };
  }

  // Skip the commit when nothing actually changed (e.g. an op-* call that
  // was idempotent — append-commit on a sha already present).
  try {
    const { stdout } = await pExecFile(
      "git",
      ["-C", vaultBase, "diff", "--cached", "--name-only"],
      { timeout: GIT_TIMEOUT_MS },
    );
    if (stdout.trim().length === 0) {
      return { committed: false, skipped: "no-changes" };
    }
  } catch (err: any) {
    return { committed: false, error: stringifyExecErr(err) };
  }

  try {
    await pExecFile(
      "git",
      [
        "-C",
        vaultBase,
        "-c",
        "commit.gpgsign=false",
        "commit",
        "-m",
        message,
        "--no-verify",
      ],
      { timeout: GIT_TIMEOUT_MS },
    );
    const { stdout } = await pExecFile(
      "git",
      ["-C", vaultBase, "rev-parse", "HEAD"],
      { timeout: GIT_TIMEOUT_MS },
    );
    return { committed: true, commitSha: stdout.trim() };
  } catch (err: any) {
    return { committed: false, error: stringifyExecErr(err) };
  }
}

export interface FlushVaultHistoryInput {
  vaultBase: string;
  issueId: string;
  // Subject for the squashed commit. Defaults to "flush" when omitted.
  subject?: string;
}

export interface FlushVaultHistoryResult {
  ok: boolean;
  // Reason when ok=false.
  error?: string;
  squashed?: number;
  // SHA of the new squashed commit (or HEAD if no-op).
  newSha?: string;
  // SHA range that was squashed (newest first), for the JSON response.
  squashedShas?: string[];
}

/**
 * Squash the consecutive run of issue-tagged commits at HEAD into one. See
 * `computeFlushPlan` for the boundary logic.
 *
 * Implementation: `git reset --soft <fromExclusiveSha>` then commit. Both
 * idempotent + reversible via `ORIG_HEAD` until the next reset. Refuses
 * cleanly when the vault isn't a git repo or the plan is null.
 */
export async function flushVaultHistory(
  input: FlushVaultHistoryInput,
): Promise<FlushVaultHistoryResult> {
  const { vaultBase, issueId } = input;
  if (!vaultBase) return { ok: false, error: "vault path unavailable" };
  if (!isVaultGitRepoSync(vaultBase)) {
    return { ok: false, error: "vault is not a git repo" };
  }
  if (!issueId) return { ok: false, error: "issue id required" };

  let log: FlushLogEntry[];
  try {
    const { stdout } = await pExecFile(
      "git",
      [
        "-C",
        vaultBase,
        "log",
        `-n`,
        String(FLUSH_LOG_MAX),
        "--pretty=format:%H%x09%s",
      ],
      { timeout: GIT_TIMEOUT_MS },
    );
    log = parseGitLog(stdout);
  } catch (err: any) {
    if (err?.code === "ENOENT") return { ok: false, error: "git not on PATH" };
    return { ok: false, error: stringifyExecErr(err) };
  }

  const plan = computeFlushPlan(log, issueId);
  if (!plan) {
    return { ok: false, error: `no flushable run at HEAD for ${issueId}` };
  }

  const message = formatCommitMessage({
    cmd: "op-flush-vault-history",
    issueId,
    subject: input.subject ?? `squashed ${plan.count} commits`,
  });

  try {
    await pExecFile(
      "git",
      ["-C", vaultBase, "reset", "--soft", plan.fromExclusiveSha],
      { timeout: GIT_TIMEOUT_MS },
    );
    await pExecFile(
      "git",
      [
        "-C",
        vaultBase,
        "-c",
        "commit.gpgsign=false",
        "commit",
        "-m",
        message,
        "--no-verify",
      ],
      { timeout: GIT_TIMEOUT_MS },
    );
    const { stdout } = await pExecFile(
      "git",
      ["-C", vaultBase, "rev-parse", "HEAD"],
      { timeout: GIT_TIMEOUT_MS },
    );
    return {
      ok: true,
      squashed: plan.count,
      newSha: stdout.trim(),
      squashedShas: plan.squashedShas,
    };
  } catch (err: any) {
    return { ok: false, error: stringifyExecErr(err) };
  }
}

export interface GitInitVaultInput {
  vaultBase: string;
  /** Override the seeded `.gitignore`. Defaults to {@link VAULT_GIT_DEFAULT_GITIGNORE}. */
  gitignoreContent?: string;
}

export interface GitInitVaultResult {
  initialized: boolean;
  alreadyRepo?: boolean;
  error?: string;
}

/**
 * `git init` the vault if it isn't already a repo, write a sensible
 * `.gitignore`, and create the initial commit. Idempotent: returns
 * `{initialized:false, alreadyRepo:true}` when the vault is already a repo.
 */
export async function gitInitVault(
  input: GitInitVaultInput,
): Promise<GitInitVaultResult> {
  const { vaultBase } = input;
  if (!vaultBase) return { initialized: false, error: "vault path unavailable" };
  if (isVaultGitRepoSync(vaultBase)) {
    return { initialized: false, alreadyRepo: true };
  }
  const content = input.gitignoreContent ?? VAULT_GIT_DEFAULT_GITIGNORE;
  try {
    await pExecFile("git", ["-C", vaultBase, "init"], { timeout: GIT_TIMEOUT_MS });
    const ignorePath = join(vaultBase, ".gitignore");
    if (!existsSync(ignorePath)) {
      await fsp.writeFile(ignorePath, content, "utf8");
    }
    await pExecFile("git", ["-C", vaultBase, "add", "--", ".gitignore"], {
      timeout: GIT_TIMEOUT_MS,
    });
    await pExecFile(
      "git",
      [
        "-C",
        vaultBase,
        "-c",
        "commit.gpgsign=false",
        "commit",
        "-m",
        "vault: initial commit (op vaultGit auto-init)",
        "--no-verify",
        "--allow-empty",
      ],
      { timeout: GIT_TIMEOUT_MS },
    );
    return { initialized: true };
  } catch (err: any) {
    if (err?.code === "ENOENT") return { initialized: false, error: "git not on PATH" };
    return { initialized: false, error: stringifyExecErr(err) };
  }
}

function parseGitLog(stdout: string): FlushLogEntry[] {
  const out: FlushLogEntry[] = [];
  for (const line of stdout.split("\n")) {
    if (!line) continue;
    const tab = line.indexOf("\t");
    if (tab <= 0) continue;
    out.push({ sha: line.slice(0, tab), subject: line.slice(tab + 1) });
  }
  return out;
}

function stringifyExecErr(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as { stderr?: string; message?: string; code?: unknown };
    if (typeof e.stderr === "string" && e.stderr.trim().length > 0) {
      return e.stderr.trim().split("\n").slice(0, 3).join(" ");
    }
    if (typeof e.message === "string") return e.message;
  }
  return String(err);
}
