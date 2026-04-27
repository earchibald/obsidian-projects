// OP-235: helpers used exclusively by the Dashboard Settings subsection.
// OP-232 already ships the canonical install path, AutoLaunch paths, and
// dashboard URL builder in `dashboardOpen.ts` / `dashboardSetupModal.ts`;
// this module only carries the bits OP-235 adds on top:
//
//   - log-path resolution (OP-232 doesn't open the daemon's stderr log).
//   - bundled-daemon source resolution (parallel to main.ts's private
//     `resolveBundledDashboardDaemonPath`, kept here so the Settings tab
//     doesn't have to reach into a private method on OpPlugin).
//   - a richer `probeDaemonStatus` than OP-232's boolean `probeHealthz` so
//     the Settings badge can render uptime + version + iTerm-API state.
//   - `formatUptime` and `revealDashboardLog` — UI-only utilities.
//
// macOS-only paths (Library/Logs, Application Support/iTerm2). The plugin
// itself targets macOS for the launcher; non-Darwin gracefully degrades to
// "daemon not running" via probeDaemonStatus's catch path.

import { existsSync, readFileSync } from "node:fs";
import { execFile } from "node:child_process";
import * as path from "node:path";

/** Pure: where the daemon writes its stderr log per the OP-217 spec. */
export function getDashboardLogPath(homeDir: string): string {
  return path.join(homeDir, "Library", "Logs", "op-dashboard.log");
}

export interface PluginPaths {
  /** Plugin directory relative to vault root (e.g. `.obsidian/plugins/op-obsidian`). */
  pluginDir: string;
  /** Vault adapter's filesystem base path. */
  vaultBasePath: string;
}

/** Pure: resolve where the bundled daemon script lives at runtime. The
 * plugin's `manifest.dir` + adapter base path point at the installed plugin
 * folder; the daemon source ships under `dashboard/op-dashboard.py` next
 * to `main.js`. (`dev-sync.mjs` and the BRAT release artifacts must include
 * the `dashboard/` folder for this path to resolve to a real file.) */
export function bundledDaemonSource(paths: PluginPaths): string {
  return path.join(
    paths.vaultBasePath,
    paths.pluginDir,
    "dashboard",
    "op-dashboard.py",
  );
}

/** Pure: format an uptime in seconds as "1h 23m 04s" / "23m 04s" / "04s".
 * Used by the daemon-status badge. */
export function formatUptime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (h > 0) return `${h}h ${pad(m)}m ${pad(sec)}s`;
  if (m > 0) return `${m}m ${pad(sec)}s`;
  return `${sec}s`;
}

/** Read the daemon's 0600 token file. Returns `null` when missing — that's
 * "daemon not yet started", the expected first-run case, not an error. */
export function readDashboardToken(tokenPath: string): string | null {
  if (!existsSync(tokenPath)) return null;
  try {
    const raw = readFileSync(tokenPath, "utf8").trim();
    return raw || null;
  } catch {
    return null;
  }
}

/** Reveal the daemon log in Finder via `open -R`. Best-effort: failures are
 * surfaced via the returned promise rejection so callers can `notify()`. */
export function revealDashboardLog(logPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile("open", ["-R", logPath], (err) => (err ? reject(err) : resolve()));
  });
}

export interface DaemonStatus {
  running: boolean;
  uptimeSec?: number;
  version?: string;
  iterm?: boolean;
  /** Populated when the probe returned a non-success status (e.g. token
   * mismatch). Lets the UI surface "● running but auth failed" rather than
   * the generic offline state. */
  authError?: boolean;
}

export interface ProbeOptions {
  timeoutMs?: number;
  /** Optional external AbortSignal; when it fires, the in-flight fetch is
   * cancelled and the probe resolves to `{ running: false }`. The Settings
   * tab uses this to drop callbacks belonging to a closed/re-rendered
   * Dashboard subsection (OP-235 review fix #1). */
  signal?: AbortSignal;
}

/** Probe `GET /healthz` and parse the full body so the Settings badge can
 * render uptime + version. Returns `{ running: false }` when the daemon is
 * unreachable, the probe times out, or the caller's external `signal`
 * aborts. OP-232's `probeHealthz` is intentionally bool-only; this helper
 * adds the body parse OP-235 needs without changing OP-232's surface. */
export async function probeDaemonStatus(
  port: number,
  token: string | null,
  options: ProbeOptions = {},
): Promise<DaemonStatus> {
  const { timeoutMs = 1000, signal: external } = options;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  // Chain external aborts so the fetch is cancelled when the caller closes
  // its scope (e.g. the Settings tab's hide() handler).
  const onExternalAbort = () => ctrl.abort();
  if (external) {
    if (external.aborted) ctrl.abort();
    else external.addEventListener("abort", onExternalAbort);
  }
  try {
    const url = `http://127.0.0.1:${port}/healthz${
      token ? `?token=${encodeURIComponent(token)}` : ""
    }`;
    const res = await fetch(url, { signal: ctrl.signal });
    if (res.status === 401) {
      return { running: true, authError: true };
    }
    if (!res.ok) {
      return { running: false };
    }
    const body = (await res.json()) as {
      ok?: boolean;
      version?: string;
      uptime_s?: number;
      iterm?: boolean;
    };
    return {
      running: body.ok === true,
      uptimeSec: typeof body.uptime_s === "number" ? body.uptime_s : undefined,
      version: typeof body.version === "string" ? body.version : undefined,
      iterm: typeof body.iterm === "boolean" ? body.iterm : undefined,
    };
  } catch {
    return { running: false };
  } finally {
    clearTimeout(t);
    if (external) external.removeEventListener("abort", onExternalAbort);
  }
}
