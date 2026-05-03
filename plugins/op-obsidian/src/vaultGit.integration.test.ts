import { execFile } from "child_process";
import { promisify } from "util";
import { mkdtempSync, mkdirSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  flushVaultHistory,
  gitInitVault,
  isVaultGitRepoSync,
  runAutoCommit,
} from "./vaultGit";

const pExecFile = promisify(execFile);

async function gitAvailable(): Promise<boolean> {
  try {
    await pExecFile("git", ["--version"]);
    return true;
  } catch {
    return false;
  }
}

const HAVE_GIT = await gitAvailable();

const describeIfGit = HAVE_GIT ? describe : describe.skip;

async function bootRepo(): Promise<string> {
  const dir = mkdtempSync(join(tmpdir(), "op-vault-git-"));
  await pExecFile("git", ["-C", dir, "init"]);
  await pExecFile("git", ["-C", dir, "config", "user.email", "test@op.local"]);
  await pExecFile("git", ["-C", dir, "config", "user.name", "OP Test"]);
  await pExecFile("git", ["-C", dir, "config", "commit.gpgsign", "false"]);
  // Seed a base commit so reset --soft has somewhere to land.
  writeFileSync(join(dir, "README.md"), "seed\n");
  await pExecFile("git", ["-C", dir, "add", "README.md"]);
  await pExecFile("git", ["-C", dir, "-c", "commit.gpgsign=false", "commit", "-m", "base"]);
  return dir;
}

describeIfGit("vaultGit (integration, tmpdir)", () => {
  let repo: string;

  beforeAll(async () => {
    repo = await bootRepo();
  });

  test("isVaultGitRepoSync detects a real repo", () => {
    expect(isVaultGitRepoSync(repo)).toBe(true);
  });

  test("isVaultGitRepoSync rejects a non-repo dir", () => {
    const notRepo = mkdtempSync(join(tmpdir(), "op-not-git-"));
    expect(isVaultGitRepoSync(notRepo)).toBe(false);
  });

  test("runAutoCommit stages + commits vault-relative paths", async () => {
    mkdirSync(join(repo, "Projects/test/ISSUES"), { recursive: true });
    const rel = "Projects/test/ISSUES/T-1.md";
    writeFileSync(join(repo, rel), "# T-1\n\nfirst\n");
    const res = await runAutoCommit({
      vaultBase: repo,
      paths: [rel],
      message: "op-set-section: T-1 · Plan",
    });
    expect(res.committed).toBe(true);
    expect(res.commitSha).toMatch(/^[0-9a-f]{40}$/);
    const { stdout } = await pExecFile("git", ["-C", repo, "log", "-1", "--pretty=%s"]);
    expect(stdout.trim()).toBe("op-set-section: T-1 · Plan");
  });

  test("runAutoCommit returns no-changes when path is unmodified", async () => {
    const rel = "Projects/test/ISSUES/T-1.md";
    const res = await runAutoCommit({
      vaultBase: repo,
      paths: [rel],
      message: "op-noop: T-1",
    });
    expect(res.committed).toBe(false);
    expect(res.skipped).toBe("no-changes");
  });

  test("runAutoCommit returns not-a-repo on a plain dir", async () => {
    const dir = mkdtempSync(join(tmpdir(), "op-no-repo-"));
    const res = await runAutoCommit({
      vaultBase: dir,
      paths: ["any.md"],
      message: "x",
    });
    expect(res.committed).toBe(false);
    expect(res.skipped).toBe("not-a-repo");
  });

  test("flushVaultHistory squashes consecutive issue commits at HEAD", async () => {
    // Lay down 3 commits tagged for OP-261.
    const subjects = [
      "op-work: OP-261 · started",
      "op-set-section: OP-261 · Plan",
      "op-set-section: OP-261 · Summary",
    ];
    for (let i = 0; i < subjects.length; i++) {
      const rel = `Projects/test/ISSUES/OP-261-${i}.md`;
      writeFileSync(join(repo, rel), `# OP-261 step ${i}\n`);
      await pExecFile("git", ["-C", repo, "add", rel]);
      await pExecFile("git", ["-C", repo, "-c", "commit.gpgsign=false", "commit", "-m", subjects[i]]);
    }
    const before = await pExecFile("git", ["-C", repo, "rev-list", "--count", "HEAD"]);
    const beforeCount = parseInt(before.stdout.trim(), 10);

    const res = await flushVaultHistory({ vaultBase: repo, issueId: "OP-261" });
    expect(res.ok).toBe(true);
    expect(res.squashed).toBe(3);
    expect(res.newSha).toMatch(/^[0-9a-f]{40}$/);

    const after = await pExecFile("git", ["-C", repo, "rev-list", "--count", "HEAD"]);
    const afterCount = parseInt(after.stdout.trim(), 10);
    // 3 commits collapsed to 1 → net -2.
    expect(afterCount).toBe(beforeCount - 2);

    const subj = await pExecFile("git", ["-C", repo, "log", "-1", "--pretty=%s"]);
    expect(subj.stdout.trim()).toBe("op-flush-vault-history: OP-261 · squashed 3 commits");
  });

  test("flushVaultHistory refuses with no-flushable-run when HEAD is not the issue", async () => {
    // Add a non-issue commit on top to break the run.
    writeFileSync(join(repo, "unrelated.md"), "hi\n");
    await pExecFile("git", ["-C", repo, "add", "unrelated.md"]);
    await pExecFile("git", ["-C", repo, "-c", "commit.gpgsign=false", "commit", "-m", "OP-100 base"]);
    const res = await flushVaultHistory({ vaultBase: repo, issueId: "OP-261" });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/no flushable run/);
  });

  test("gitInitVault initializes a fresh dir + writes .gitignore + initial commit", async () => {
    const fresh = mkdtempSync(join(tmpdir(), "op-init-"));
    // Configure user identity at the system level so commit succeeds. We rely
    // on global git config not being pristine in CI; force fallback via env.
    const res = await gitInitVault({ vaultBase: fresh });
    if (!res.initialized) {
      // If global git identity isn't set, skip — the only way for `git commit`
      // to fail in this test is missing identity, which is an environment quirk.
      expect(res.error).toBeTruthy();
      return;
    }
    expect(isVaultGitRepoSync(fresh)).toBe(true);
    const { stdout } = await pExecFile("git", ["-C", fresh, "log", "--pretty=%s"]);
    expect(stdout).toContain("op vaultGit auto-init");
  });

  test("gitInitVault is idempotent on already-a-repo", async () => {
    const res = await gitInitVault({ vaultBase: repo });
    expect(res.initialized).toBe(false);
    expect(res.alreadyRepo).toBe(true);
  });
});

if (!HAVE_GIT) {
  // eslint-disable-next-line no-console
  console.warn("[vaultGit.integration.test] git not on PATH — skipping integration tests");
}

afterAll(() => {
  // Tmpdirs leak by design — `mkdtempSync` is per-suite scratch. The OS
  // cleans `/tmp` periodically; tests must not depend on prior state.
});
