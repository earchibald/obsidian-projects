import { execFile } from "child_process";
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import { promisify } from "util";

const pExecFile = promisify(execFile);

export interface LaunchArgs {
  cwd: string;
  binary: string;
  launchFlags: string[];
  prompt: string;
  terminalApp: "Terminal" | "iTerm";
}

export async function launchInTerminal(args: LaunchArgs): Promise<{ scriptPath: string }> {
  if (process.platform !== "darwin") {
    throw new Error(`op: terminal launch currently supports macOS only (platform=${process.platform})`);
  }
  const scriptPath = await writeLaunchScript(args);
  await pExecFile("/usr/bin/open", ["-a", args.terminalApp, scriptPath]);
  return { scriptPath };
}

async function writeLaunchScript(args: LaunchArgs): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "op-agent-"));
  const scriptPath = path.join(dir, "launch.command");

  const marker = `OP_PROMPT_END_${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
  const flagsShell = args.launchFlags.map(shSingleQuote).join(" ");
  const cwdShell = shSingleQuote(args.cwd);
  const binShell = shSingleQuote(args.binary);

  const content = [
    "#!/bin/bash",
    "set -e",
    `cd ${cwdShell}`,
    `PROMPT=$(cat <<'${marker}'`,
    args.prompt,
    marker,
    ")",
    `exec ${binShell} ${flagsShell} "$PROMPT"`,
    "",
  ].join("\n");

  await fs.writeFile(scriptPath, content, { mode: 0o755 });
  return scriptPath;
}

function shSingleQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}
