import { execFile } from "child_process";
import { promisify } from "util";

const pExecFile = promisify(execFile);

/**
 * Test seam — production calls forward to `pExecFile(git, args, { cwd, timeout })`
 * (which `promisify(execFile)` resolves to `{ stdout, stderr }`). Tests inject
 * a fake to skip spawning a real subprocess. The fake's signature mirrors
 * `pExecFile` for interchangeability.
 */
export type GitExecFn = (
  file: string,
  args: string[],
  options: { cwd?: string; timeout?: number },
) => Promise<{ stdout: string; stderr: string }>;

/**
 * OP-199 (2b): resolve the current git branch at `cwd` so `openAgent` /
 * `launchHeadlessSubtask` can populate `{{branch}}` in the launch's
 * `RenderContext`.
 *
 * Fail-soft contract: any failure returns `undefined`. The composer surfaces a
 * `missing-var` diagnostic for `{{branch}}` references at render time, but
 * the launch itself proceeds — workflow injection is best-effort, not a hard
 * gate on launch.
 *
 * Specific failure modes and their outcomes:
 *
 * - **Not a git repo / permission error**: `git rev-parse` exits non-zero →
 *   caught by the `try/catch` → `undefined`.
 *
 * - **Detached HEAD** (mid-rebase, mid-cherry-pick, `git checkout <sha>`):
 *   `--abbrev-ref HEAD` returns the literal string `"HEAD"`. We treat that as
 *   "no useful branch name" and return `undefined` so modules see the same
 *   `missing-var` diagnostic they'd see in a non-repo dir, rather than
 *   rendering the uninformative literal `"HEAD"`.
 *
 * - **Mid-merge** (`git merge` in progress): the working tree is NOT detached
 *   during a merge — `MERGE_HEAD` exists but `HEAD` still points to the
 *   current branch. `--abbrev-ref HEAD` returns the branch name normally.
 *   This is correct behaviour: the branch is unambiguous and modules that
 *   render `{{branch}}` get the expected value.
 *
 * - **Unborn HEAD** (fresh `git init` with no commits): `git rev-parse
 *   --abbrev-ref HEAD` exits with a non-zero status and writes
 *   `"fatal: ambiguous argument 'HEAD'"` to stderr → caught by `try/catch` →
 *   `undefined`.
 *
 * - **Worktree teardown race** (underlying HEAD file is being removed
 *   concurrently): `git rev-parse` is a read-only operation and either
 *   returns a valid name or exits non-zero — both paths are handled. The
 *   2 000 ms timeout prevents a hanging launch if the git index is locked.
 *
 * - **Missing `git` binary**: `execFile` throws `ENOENT` → caught → `undefined`.
 */
export async function gitBranchAt(
  cwd: string,
  opts: { gitBinary?: string; timeoutMs?: number; execFn?: GitExecFn } = {},
): Promise<string | undefined> {
  if (!cwd) return undefined;
  const gitBinary = opts.gitBinary ?? "git";
  const timeout = opts.timeoutMs ?? 2000;
  const exec: GitExecFn = opts.execFn ?? (pExecFile as unknown as GitExecFn);
  try {
    const { stdout } = await exec(
      gitBinary,
      ["rev-parse", "--abbrev-ref", "HEAD"],
      { cwd, timeout },
    );
    const name = stdout.trim();
    if (!name || name === "HEAD") return undefined;
    return name;
  } catch {
    return undefined;
  }
}
