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
 * Fail-soft contract: any failure (not a repo, detached HEAD, missing `git`,
 * permission error) returns `undefined`. The composer surfaces a
 * `missing-var` diagnostic for `{{branch}}` references at render time, but
 * the launch itself proceeds — workflow injection is best-effort, not a hard
 * gate on launch.
 *
 * Detached HEAD note: `--abbrev-ref HEAD` returns the literal string `HEAD`
 * when the working tree is detached. We treat that as "no useful branch
 * name" and return `undefined` so modules see the same `missing-var` they'd
 * see in a non-repo dir, rather than rendering the (uninformative) literal
 * `HEAD`.
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
