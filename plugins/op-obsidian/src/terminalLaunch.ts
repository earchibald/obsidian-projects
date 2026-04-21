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
  const promptPath = path.join(dir, "prompt.txt");

  await fs.writeFile(promptPath, args.prompt, { mode: 0o600 });

  const flagsShell = args.launchFlags.map(shSingleQuote).join(" ");
  const cwdShell = shSingleQuote(args.cwd);
  const binShell = shSingleQuote(args.binary);
  const promptShell = shSingleQuote(promptPath);

  // Read the prompt from a side-file. Avoids the bash 3.2 quirk on macOS
  // where heredocs nested inside $(...) mis-parse quote characters in the
  // body and break the script with "unexpected EOF".
  const content = [
    "#!/bin/bash",
    "set -e",
    `cd ${cwdShell}`,
    `PROMPT=$(<${promptShell})`,
    `exec ${binShell} ${flagsShell} "$PROMPT"`,
    "",
  ].join("\n");

  await fs.writeFile(scriptPath, content, { mode: 0o755 });
  return scriptPath;
}

function shSingleQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}
