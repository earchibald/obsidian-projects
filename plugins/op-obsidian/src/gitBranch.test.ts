import { describe, it, expect, vi } from "vitest";
import { gitBranchAt, type GitExecFn } from "./gitBranch";

function fakeExec(stdout: string, stderr = ""): GitExecFn {
  return vi.fn(async () => ({ stdout, stderr }));
}

function failingExec(err: Error): GitExecFn {
  return vi.fn(async () => {
    throw err;
  });
}

describe("gitBranchAt", () => {
  it("returns the trimmed branch name on success", async () => {
    const exec = fakeExec("feature/op-199\n");
    const branch = await gitBranchAt("/tmp/repo", { execFn: exec });
    expect(branch).toBe("feature/op-199");
    expect(exec).toHaveBeenCalledWith(
      "git",
      ["rev-parse", "--abbrev-ref", "HEAD"],
      expect.objectContaining({ cwd: "/tmp/repo" }),
    );
  });

  it("returns undefined when stdout is the literal 'HEAD' (detached)", async () => {
    // `--abbrev-ref HEAD` returns 'HEAD' for detached HEAD. Treat as no branch.
    const exec = fakeExec("HEAD\n");
    const branch = await gitBranchAt("/tmp/repo", { execFn: exec });
    expect(branch).toBeUndefined();
  });

  it("returns undefined when stdout is empty", async () => {
    const exec = fakeExec("");
    const branch = await gitBranchAt("/tmp/repo", { execFn: exec });
    expect(branch).toBeUndefined();
  });

  it("returns undefined when execFn throws (not a repo / missing git)", async () => {
    const exec = failingExec(new Error("fatal: not a git repository"));
    const branch = await gitBranchAt("/tmp/notarepo", { execFn: exec });
    expect(branch).toBeUndefined();
  });

  it("returns undefined when cwd is empty without invoking exec", async () => {
    const exec = fakeExec("never");
    const branch = await gitBranchAt("", { execFn: exec });
    expect(branch).toBeUndefined();
    expect(exec).not.toHaveBeenCalled();
  });

  it("forwards the timeout option", async () => {
    const exec = fakeExec("main\n");
    await gitBranchAt("/tmp/repo", { execFn: exec, timeoutMs: 50 });
    expect(exec).toHaveBeenCalledWith(
      "git",
      ["rev-parse", "--abbrev-ref", "HEAD"],
      expect.objectContaining({ cwd: "/tmp/repo", timeout: 50 }),
    );
  });
});
