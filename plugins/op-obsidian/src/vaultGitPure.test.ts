import { describe, expect, test } from "vitest";
import {
  VAULT_GIT_DEFAULT_GITIGNORE,
  computeFlushPlan,
  formatCommitMessage,
  type FlushLogEntry,
} from "./vaultGitPure";

describe("formatCommitMessage", () => {
  test("cmd + issue + subject", () => {
    expect(
      formatCommitMessage({
        cmd: "op-set-section",
        issueId: "OP-261",
        subject: "Plan",
      }),
    ).toBe("op-set-section: OP-261 · Plan");
  });

  test("cmd + issue only", () => {
    expect(formatCommitMessage({ cmd: "op-resolve", issueId: "OP-12" })).toBe(
      "op-resolve: OP-12",
    );
  });

  test("cmd + subject (no issue) e.g. op-scaffold", () => {
    expect(
      formatCommitMessage({ cmd: "op-scaffold", subject: "demo (DEMO)" }),
    ).toBe("op-scaffold · demo (DEMO)");
  });

  test("cmd only", () => {
    expect(formatCommitMessage({ cmd: "op-migrate-add-managed-flag" })).toBe(
      "op-migrate-add-managed-flag",
    );
  });

  test("subject newlines are folded to spaces", () => {
    expect(
      formatCommitMessage({
        cmd: "op-set-section",
        issueId: "OP-1",
        subject: "Plan\nbody",
      }),
    ).toBe("op-set-section: OP-1 · Plan body");
  });

  test("trims whitespace around segments", () => {
    expect(
      formatCommitMessage({
        cmd: "  op-new  ",
        issueId: "  OP-9 ",
        subject: "  the title  ",
      }),
    ).toBe("op-new: OP-9 · the title");
  });
});

describe("VAULT_GIT_DEFAULT_GITIGNORE", () => {
  test("includes the documented ignores", () => {
    expect(VAULT_GIT_DEFAULT_GITIGNORE).toContain(".obsidian/workspace*");
    expect(VAULT_GIT_DEFAULT_GITIGNORE).toContain("Projects/_scratch/");
    expect(VAULT_GIT_DEFAULT_GITIGNORE).toContain("*.tmp");
  });
});

const e = (sha: string, subject: string): FlushLogEntry => ({ sha, subject });

describe("computeFlushPlan", () => {
  test("returns null on empty log", () => {
    expect(computeFlushPlan([], "OP-261")).toBeNull();
  });

  test("returns null when HEAD subject does not mention the issue", () => {
    const log = [e("h1", "op-set-section: OP-100 · Plan"), e("h2", "feat: X")];
    expect(computeFlushPlan(log, "OP-261")).toBeNull();
  });

  test("returns null on a single-commit run (1 → 1 squash is no-op)", () => {
    const log = [
      e("h1", "op-set-section: OP-261 · Plan"),
      e("h2", "OP-100 unrelated"),
    ];
    expect(computeFlushPlan(log, "OP-261")).toBeNull();
  });

  test("plans squash for consecutive issue commits at HEAD", () => {
    const log = [
      e("aaa", "op-resolve: OP-261"),
      e("bbb", "op-set-section: OP-261 · Summary"),
      e("ccc", "op-append-commit: OP-261"),
      e("ddd", "op-work: OP-261 · in-progress"),
      e("eee", "OP-100 unrelated"),
      e("fff", "OP-90 unrelated"),
    ];
    const plan = computeFlushPlan(log, "OP-261");
    expect(plan).not.toBeNull();
    expect(plan!.fromExclusiveSha).toBe("eee");
    expect(plan!.toSha).toBe("aaa");
    expect(plan!.count).toBe(4);
    expect(plan!.squashedShas).toEqual(["aaa", "bbb", "ccc", "ddd"]);
  });

  test("stops on the first non-matching commit (preserves interleaved work)", () => {
    const log = [
      e("h1", "op-set-section: OP-261 · Summary"),
      e("h2", "OP-261 work"),
      e("h3", "OP-200 unrelated"),
      e("h4", "OP-261 earlier work"),
      e("h5", "OP-100 base"),
    ];
    const plan = computeFlushPlan(log, "OP-261");
    expect(plan).not.toBeNull();
    expect(plan!.count).toBe(2);
    expect(plan!.squashedShas).toEqual(["h1", "h2"]);
    expect(plan!.fromExclusiveSha).toBe("h3");
  });

  test("returns null when run extends to bottom of log window (no visible parent)", () => {
    const log = [
      e("h1", "OP-261 first"),
      e("h2", "OP-261 second"),
    ];
    expect(computeFlushPlan(log, "OP-261")).toBeNull();
  });

  test("issue-id boundary: OP-26 does not match OP-261", () => {
    const log = [
      e("h1", "OP-261 final"),
      e("h2", "OP-26 distinct"),
      e("h3", "OP-50 base"),
    ];
    const plan = computeFlushPlan(log, "OP-26");
    expect(plan).toBeNull();
  });

  test("issue-id boundary: OP-261 does not match OP-2611", () => {
    const log = [
      e("h1", "OP-2611 final"),
      e("h2", "OP-261 base"),
    ];
    expect(computeFlushPlan(log, "OP-261")).toBeNull();
  });

  test("rejects empty issue id", () => {
    expect(computeFlushPlan([e("h1", "anything")], "")).toBeNull();
  });
});
