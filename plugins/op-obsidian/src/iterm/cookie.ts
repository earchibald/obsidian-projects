import { execFile } from "child_process";
import { promisify } from "util";
import { promises as fs } from "fs";
import * as path from "path";
import * as os from "os";

const pExecFile = promisify(execFile);

// iTerm2's Python API is actually a local WebSocket on a port iTerm writes to
// ~/Library/Application Support/iTerm2/private/.iterm2_api_port. Authentication
// requires a (cookie, key) pair obtained via AppleScript the first time a given
// app-name connects; after that the pair is cached (in practice via
// safeStorage) and reused until iTerm invalidates it.
//
// This module owns the one-shot AppleScript call and the read of the port
// file. It is the *only* remaining osascript site once the migration is done.

export interface CookieAndKey {
  cookie: string;
  key: string;
}

export const API_PORT_PATH = path.join(
  os.homedir(),
  "Library",
  "Application Support",
  "iTerm2",
  "private",
  ".iterm2_api_port",
);

export async function readApiPort(): Promise<number> {
  const raw = await fs.readFile(API_PORT_PATH, "utf8");
  return parsePort(raw);
}

// Exported for unit tests. iTerm writes the port as an ASCII integer, usually
// with a trailing newline.
export function parsePort(raw: string): number {
  const trimmed = raw.trim();
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n <= 0 || n > 65535) {
    throw new Error(`op: iTerm api port file has unexpected contents: ${JSON.stringify(raw)}`);
  }
  return n;
}

// Parse the raw AppleScript response, which iTerm2 returns as a tab-separated
// "cookie<TAB>key" pair. Exported for tests.
export function parseCookieAndKey(raw: string): CookieAndKey {
  const [cookie, key] = raw.trim().split("\t");
  if (!cookie || !key) {
    throw new Error(
      `op: iTerm cookie request returned unexpected output: ${JSON.stringify(raw)}`,
    );
  }
  return { cookie, key };
}

// Request a (cookie, key) pair from iTerm2 via AppleScript. This prompts the
// user the first time an `appName` is seen; subsequent calls within the same
// iTerm run return the cached pair. Callers are expected to persist the result
// through safeStorage so the prompt is truly one-shot across plugin reloads.
export async function requestCookieAndKey(appName: string): Promise<CookieAndKey> {
  const script = [
    'tell application "iTerm2"',
    `  return (request cookie and key for app named ${osaQuote(appName)})`,
    "end tell",
  ].join("\n");
  const { stdout } = await pExecFile("/usr/bin/osascript", ["-e", script]);
  return parseCookieAndKey(stdout);
}

function osaQuote(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
