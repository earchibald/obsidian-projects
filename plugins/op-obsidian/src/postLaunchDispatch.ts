import { execFile } from "child_process";
import { promisify } from "util";

const pExecFile = promisify(execFile);

export type ExecShim = (
  file: string,
  args: readonly string[],
) => Promise<{ stdout: string; stderr: string }>;

export interface DispatchPostLaunchArgs {
  tmuxBinary: string;
  tmuxSession: string;
  tmuxWindow: string;
  commands: string[];
  readinessRegex: RegExp;
  readinessTimeoutMs?: number;
  pollIntervalMs?: number;
  interCommandDelayMs?: number;
  exec?: ExecShim;
}

export async function dispatchPostLaunch(args: DispatchPostLaunchArgs): Promise<{ sent: number; readinessHit: boolean }> {
  const exec = args.exec ?? pExecFile;
  if (args.commands.length === 0) return { sent: 0, readinessHit: false };

  const target = `${args.tmuxSession}:${args.tmuxWindow}`;
  const readinessTimeoutMs = args.readinessTimeoutMs ?? 8_000;
  const pollIntervalMs = args.pollIntervalMs ?? 250;
  const interCommandDelayMs = args.interCommandDelayMs ?? 300;

  let readinessHit = false;
  const deadline = Date.now() + readinessTimeoutMs;
  while (Date.now() <= deadline) {
    try {
      const { stdout } = await exec(args.tmuxBinary, ["capture-pane", "-p", "-J", "-t", target]);
      if (args.readinessRegex.test(stdout)) {
        readinessHit = true;
        break;
      }
    } catch {
      // Pane creation races are normal right after launch; keep polling until timeout.
    }
    if (Date.now() > deadline) break;
    await sleep(pollIntervalMs);
  }

  if (!readinessHit) {
    console.warn("[op-obsidian] post-launch readiness timeout — sending commands anyway");
  }

  let sent = 0;
  for (let i = 0; i < args.commands.length; i += 1) {
    const command = args.commands[i]!;
    await exec(args.tmuxBinary, ["send-keys", "-t", target, "-l", command]);
    await exec(args.tmuxBinary, ["send-keys", "-t", target, "Enter"]);
    sent += 1;
    if (i < args.commands.length - 1 && interCommandDelayMs > 0) {
      await sleep(interCommandDelayMs);
    }
  }

  return { sent, readinessHit };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
