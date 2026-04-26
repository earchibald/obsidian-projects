import { spawn as realSpawn, type ChildProcess, type SpawnOptions } from "child_process";
import { emitStatus, emitStream, type RelaySession } from "./relaySession";

// Spawn `claude -p --output-format json …` with a prompt and agent config,
// streaming stdout/stderr through a `RelaySession` so the user has a visible
// surface to watch the headless subtask in. OP-181 §"Visibility tenet" — every
// step is observable. The discriminated-union `relaySession` arg is required
// so the typechecker rejects callers that try to skip the relay.
//
// Renamed from `launchHeadless` (OP-194/195/196) to `launchHeadlessSubtask`
// (OP-197) — the new name reflects the role: this isn't a top-level launch,
// it's a sub-task of an enclosing visible step. The signature change is the
// type-level enforcement of the visibility tenet.

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

export interface LaunchHeadlessSubtaskInput {
  prompt: string;
  /**
   * Visibility-tenet relay surface. Every caller must construct one — the
   * typechecker rejects calls that omit this field. Production paths
   * construct `{ kind: "tmux", ... }` (see `makeTmuxRelay`), test paths
   * construct `{ kind: "test", capture: vi.fn() }` (see `makeTestRelay`).
   */
  relaySession: RelaySession;
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

export interface LaunchHeadlessSubtaskResult<TJson = unknown> {
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

export function buildArgs(input: LaunchHeadlessSubtaskInput): string[] {
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
// config, collect stdout/stderr (mirrored to the relay so the user can watch
// progress live), JSON-parse stdout, and return the parsed object's `result`
// text plus the raw JSON. Default timeout: 10 minutes.
//
// On timeout: kills with SIGTERM (then SIGKILL after 1s grace) and throws
// HeadlessTimeoutError. On non-zero exit: HeadlessExitError. On malformed
// stdout: HeadlessParseError. The relay always sees a status-line at start
// + at end (success or error) so the visible surface always closes the loop.
export async function launchHeadlessSubtask<TJson = unknown>(
  input: LaunchHeadlessSubtaskInput,
): Promise<LaunchHeadlessSubtaskResult<TJson>> {
  if (!input.prompt || typeof input.prompt !== "string") {
    throw new Error("launchHeadlessSubtask: prompt is required");
  }
  const timeoutMs = input.timeoutMs ?? HEADLESS_DEFAULT_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error(`launchHeadlessSubtask: invalid timeoutMs ${timeoutMs}`);
  }

  const args = buildArgs(input);
  const cmd = input.claudeBinary ?? "claude";
  const spawnFn = input.spawnFn ?? realSpawn;
  const relay = input.relaySession;
  const agentLabel = input.agent ? `${input.agent} ` : "";
  emitStatus(relay, `launching headless subtask: ${agentLabel}(timeout ${timeoutMs}ms)`);
  const started = Date.now();

  const child = spawnFn(cmd, args, {
    cwd: input.cwd,
    env: input.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  child.stdout?.on("data", (chunk: Buffer | string) => {
    const s = chunk.toString();
    stdout += s;
    emitStream(relay, s);
  });
  child.stderr?.on("data", (chunk: Buffer | string) => {
    const s = chunk.toString();
    stderr += s;
    emitStream(relay, s);
  });

  return new Promise<LaunchHeadlessSubtaskResult<TJson>>((resolve, reject) => {
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
      emitStatus(relay, `headless subtask timed out after ${timeoutMs}ms`);
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
      emitStatus(relay, `headless subtask spawn error: ${err.message}`);
      reject(err);
    });

    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (killTimer) clearTimeout(killTimer);
      if (settled) return;
      settled = true;
      const exitCode = typeof code === "number" ? code : -1;
      if (exitCode !== 0) {
        emitStatus(
          relay,
          `headless subtask exited ${exitCode}${signal ? ` (signal ${signal})` : ""}`,
        );
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
        emitStatus(relay, `headless subtask returned malformed JSON`);
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
      const durationMs = Date.now() - started;
      emitStatus(relay, `headless subtask completed in ${durationMs}ms`);
      resolve({
        text,
        jsonResult: parsed as TJson,
        stdout,
        stderr,
        exitCode,
        durationMs,
      });
    });
  });
}
