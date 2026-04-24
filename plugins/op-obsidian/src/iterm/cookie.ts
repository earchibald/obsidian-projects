import { execFile } from "child_process";
import { promisify } from "util";
import { promises as fs } from "fs";
import * as path from "path";
import * as os from "os";

const pExecFile = promisify(execFile);

// iTerm2's Python API is actually a local WebSocket on a port iTerm writes to
// ~/Library/Application Support/iTerm2/private/.iterm2_api_port. Authentication
// requires a (cookie, key) pair obtained via AppleScript the first time a given
// app-name connects.
//
// This module owns the one-shot AppleScript call, the read of the port file,
// and the persistent `safeStorage`-encrypted cache that keeps the prompt
// one-shot across plugin reloads. It is the only remaining osascript site.

export interface CookieAndKey {
  cookie: string;
  key: string;
}

// A narrow view of Electron's `safeStorage`. Declaring our own interface keeps
// the module free of an Electron import (Obsidian bundles the renderer runtime
// already, and a direct `require("electron")` is only reachable via feature
// detection — see `getSafeStorage`).
export interface SafeStorageLike {
  isEncryptionAvailable(): boolean;
  encryptString(plain: string): Buffer;
  decryptString(ciphertext: Buffer): string;
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
// iTerm run return the cached pair. `connection.ts` persists the result via
// safeStorage so the prompt is truly one-shot across plugin reloads.
export async function requestCookieAndKey(appName: string): Promise<CookieAndKey> {
  const script = [
    'tell application "iTerm2"',
    `  return (request cookie and key for app named ${osaQuote(appName)})`,
    "end tell",
  ].join("\n");
  const { stdout } = await pExecFile("/usr/bin/osascript", ["-e", script]);
  return parseCookieAndKey(stdout);
}

// Resolve Electron's `safeStorage` from the Obsidian renderer. Obsidian
// re-exports Electron via `window.require("electron")`; `safeStorage` lives at
// the top level on modern builds. Feature-detect and return `null` if the API
// isn't reachable — callers degrade to re-prompting each reload.
export function getSafeStorage(): SafeStorageLike | null {
  try {
    const g = globalThis as { require?: (id: string) => unknown };
    const req = g.require;
    if (typeof req !== "function") return null;
    const elec = req("electron") as {
      safeStorage?: SafeStorageLike;
      remote?: { safeStorage?: SafeStorageLike };
    };
    const ss = elec?.safeStorage ?? elec?.remote?.safeStorage;
    if (ss && typeof ss.isEncryptionAvailable === "function") return ss;
    return null;
  } catch {
    return null;
  }
}

export async function loadCachedCookie(
  cachePath: string,
  safeStorage: SafeStorageLike | null = getSafeStorage(),
): Promise<CookieAndKey | null> {
  if (!safeStorage || !safeStorage.isEncryptionAvailable()) return null;
  try {
    const buf = await fs.readFile(cachePath);
    const raw = safeStorage.decryptString(buf);
    return parseCookieAndKey(raw);
  } catch {
    return null;
  }
}

export async function saveCachedCookie(
  cachePath: string,
  cookie: CookieAndKey,
  safeStorage: SafeStorageLike | null = getSafeStorage(),
): Promise<void> {
  if (!safeStorage || !safeStorage.isEncryptionAvailable()) return;
  try {
    const encoded = `${cookie.cookie}\t${cookie.key}`;
    const enc = safeStorage.encryptString(encoded);
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.writeFile(cachePath, enc);
  } catch {
    // best-effort — the cache is a latency optimisation, not a correctness
    // requirement. Failure just means we re-prompt next reload.
  }
}

export async function clearCachedCookie(cachePath: string): Promise<void> {
  try {
    await fs.unlink(cachePath);
  } catch {
    // ok if missing
  }
}

function osaQuote(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
