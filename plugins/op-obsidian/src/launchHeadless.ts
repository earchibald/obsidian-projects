import { spawn as realSpawn, type ChildProcess, type SpawnOptions } from "child_process";

export const HEADLESS_DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

export interface AgentsSpec {
  [name: string]: {
    description?: string;
    prompt?: string;
    tools?: string[];
    model?: string;
    [k: string]: unknown;
  };
}

export type PermissionMode = "default" | "acceptEdits" | "bypassPermissions" | "dontAsk";

export interface LaunchHeadlessInput {
  prompt: string;
  // Optional inline agent definitions forwarded as `--agents '<json>'`. OP-95
  // confirmed `--agents` composes with `-p`, but the inline agent's `tools:`
  // allowlist is NOT enforced in `--agent <name>` mode; enforce tool scope at
  // the parent invocation via allowedTools / disallowedTools / permissionMode.
  agents?: AgentsSpec;
  agent?: string;
  allowedTools?: string[];
  disallowedTools?: string[];
  permissionMode?: PermissionMode;
  model?: string;
  claudeBinary?: string;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  extraArgs?: string[];
  // Injection point for tests — matches `child_process.spawn` signature.
  spawnFn?: (cmd: string, args: string[], options: SpawnOptions) => ChildProcess;
}

export interface LaunchHeadlessResult<TJson = unknown> {
  text: string;
  jsonResult: TJson;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

export class HeadlessTimeoutError extends Error {
  constructor(
    message: string,
    readonly timeoutMs: number,
    readonly partialStdout: string,
    readonly partialStderr: string,
  ) {
    super(message);
    this.name = "HeadlessTimeoutError";
  }
}

export class HeadlessExitError extends Error {
  constructor(
    message: string,
    readonly exitCode: number,
    readonly signal: NodeJS.Signals | null,
    readonly stdout: string,
    readonly stderr: string,
  ) {
    super(message);
    this.name = "HeadlessExitError";
  }
}

export class HeadlessParseError extends Error {
  constructor(
    message: string,
    readonly stdout: string,
    readonly parseError: Error,
  ) {
    super(message);
    this.name = "HeadlessParseError";
  }
}

export function buildArgs(input: LaunchHeadlessInput): string[] {
  const args: string[] = ["-p", "--output-format", "json"];
  if (input.agents) {
    args.push("--agents", JSON.stringify(input.agents));
  }
  if (input.agent) {
    args.push("--agent", input.agent);
  }
  if (input.model) {
    args.push("--model", input.model);
  }
  if (input.allowedTools && input.allowedTools.length > 0) {
    args.push("--allowedTools", input.allowedTools.join(" "));
  }
  if (input.disallowedTools && input.disallowedTools.length > 0) {
    args.push("--disallowedTools", input.disallowedTools.join(" "));
  }
  if (input.permissionMode) {
    args.push("--permission-mode", input.permissionMode);
  }
  if (input.extraArgs) {
    args.push(...input.extraArgs);
  }
  args.push(input.prompt);
  return args;
}

// Spawn `claude -p --output-format json …` with the given prompt and agent
// config, collect stdout/stderr, JSON-parse stdout, and return the parsed
// object's `result` text plus the raw JSON. Default timeout: 10 minutes.
// On timeout: kills with SIGTERM (then SIGKILL after 1s grace) and throws
// HeadlessTimeoutError. On non-zero exit: HeadlessExitError. On malformed
// stdout: HeadlessParseError.
export async function launchHeadless<TJson = unknown>(
  input: LaunchHeadlessInput,
): Promise<LaunchHeadlessResult<TJson>> {
  if (!input.prompt || typeof input.prompt !== "string") {
    throw new Error("launchHeadless: prompt is required");
  }
  const timeoutMs = input.timeoutMs ?? HEADLESS_DEFAULT_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error(`launchHeadless: invalid timeoutMs ${timeoutMs}`);
  }

  const args = buildArgs(input);
  const cmd = input.claudeBinary ?? "claude";
  const spawnFn = input.spawnFn ?? realSpawn;
  const started = Date.now();

  const child = spawnFn(cmd, args, {
    cwd: input.cwd,
    env: input.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  child.stdout?.on("data", (chunk: Buffer | string) => {
    stdout += chunk.toString();
  });
  child.stderr?.on("data", (chunk: Buffer | string) => {
    stderr += chunk.toString();
  });

  return new Promise<LaunchHeadlessResult<TJson>>((resolve, reject) => {
    let settled = false;
    let killTimer: ReturnType<typeof setTimeout> | undefined;

    const timer = setTimeout(() => {
      if (settled) return;
      try {
        child.kill("SIGTERM");
      } catch {
        /* ignore */
      }
      // Grace window before escalating to SIGKILL.
      killTimer = setTimeout(() => {
        try {
          child.kill("SIGKILL");
        } catch {
          /* ignore */
        }
      }, 1000);
      settled = true;
      reject(
        new HeadlessTimeoutError(
          `claude -p timed out after ${timeoutMs}ms`,
          timeoutMs,
          stdout,
          stderr,
        ),
      );
    }, timeoutMs);

    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });

    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (killTimer) clearTimeout(killTimer);
      if (settled) return;
      settled = true;
      const exitCode = typeof code === "number" ? code : -1;
      if (exitCode !== 0) {
        reject(
          new HeadlessExitError(
            `claude -p exited ${exitCode}${signal ? ` (signal ${signal})` : ""}: ${stderr.trim()}`,
            exitCode,
            signal,
            stdout,
            stderr,
          ),
        );
        return;
      }
      let parsed: any;
      try {
        parsed = JSON.parse(stdout);
      } catch (err) {
        reject(
          new HeadlessParseError(
            `claude -p stdout was not valid JSON: ${(err as Error).message}`,
            stdout,
            err as Error,
          ),
        );
        return;
      }
      const text = typeof parsed?.result === "string" ? parsed.result : "";
      resolve({
        text,
        jsonResult: parsed as TJson,
        stdout,
        stderr,
        exitCode,
        durationMs: Date.now() - started,
      });
    });
  });
}
