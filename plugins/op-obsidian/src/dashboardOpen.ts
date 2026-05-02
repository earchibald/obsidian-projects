// Pure helpers for the OP-232 op-dashboard palette command, URI handler, and
// Setup modal. All filesystem / network access is taken as injected deps so
// the gates can be unit-tested without an iTerm install or a live daemon.
//
// Sibling consumers:
//   - dashboardSetupModal.ts  — renders the four gates returned by detectSetupGates.
//   - main.ts                 — wires the palette command + URI handlers.
//   - iterm/openBrowserTab.ts — best-effort open path for `target=iterm-browser-tab`.
//
// Design constraints called out in the OP-232 plan:
//   * Detection runs in ≤ 1 s. The /healthz probe carries a 1-second budget;
//     ECONNREFUSED / 401 / timeout are all surfaced as "daemon not alive".
//   * Token reading is opt-in to the modal (only after all gates pass).
//   * AutoLaunch path uses the macOS canonical "Application Support" form
//     (with a space) — matches OP-230's README.

export type DashboardTarget = "iterm-browser-tab" | "system-browser";

/** Default port the daemon binds on `127.0.0.1`. Mirrored in `settingsPure`
 *  as `DASHBOARD_PORT_DEFAULT`; redeclared here so this module stays cheap
 *  to import (no `settingsPure` cycle). */
export const DEFAULT_DASHBOARD_PORT = 49217;

/** macOS-only paths the daemon lives under once installed by OP-232's
 *  Setup modal. The `Scripts/AutoLaunch/` segment matches the iTerm2 docs
 *  and OP-230's `dashboard/README.md`. */
export const AUTOLAUNCH_REL_DIR = "Library/Application Support/iTerm2/Scripts/AutoLaunch";
export const DAEMON_FILENAME = "op-dashboard.py";
export const TOKEN_FILENAME = "op-dashboard.token";

/** Default macOS install location for the iTerm Browser Plugin bundle. The
 *  Setup modal probes this exact path; the bundle name is fixed by iTerm. */
export const ITERM_BROWSER_PLUGIN_BUNDLE = "/Applications/iTermBrowserPlugin.bundle";

/** /healthz probe budget. Per the OP-217 spec. */
export const HEALTHZ_TIMEOUT_MS = 1000;

export interface SetupGates {
  /** macOS only — `false` on every other platform with a one-liner reason. */
  platformSupported: boolean;
  /** iTermBrowserPlugin bundle exists at the canonical install location.
   *  Daemon doesn't need this — the SPA fallback works in any browser — but
   *  the user explicitly chose `iterm-browser-tab` (default), so we surface
   *  it as a gate. */
  browserPluginInstalled: boolean;
  /** `op-dashboard.py` exists in the AutoLaunch directory. */
  daemonInstalled: boolean;
  /** `/healthz` responded `200 {ok: true}` within `HEALTHZ_TIMEOUT_MS`. */
  daemonAlive: boolean;
  /** Resolved AutoLaunch directory (homedir-aware). Always populated even
   *  when `daemonInstalled` is false — the Install button copies the
   *  bundled asset into this exact path. */
  autoLaunchDir: string;
  /** Resolved daemon path (for the Install modal's confirm copy). */
  daemonPath: string;
  /** Resolved token path. Read by the caller only when all gates pass. */
  tokenPath: string;
  /** Numeric port the /healthz probe used. Echoed back so the modal can
   *  report which port failed. */
  port: number;
}

export interface DetectDeps {
  homedir: () => string;
  platform: () => NodeJS.Platform;
  pathExists: (p: string) => boolean;
  /** Returns `true` when `/healthz?token=…` returns `200 {ok: true}` within
   *  `HEALTHZ_TIMEOUT_MS`. Any failure (timeout, ECONNREFUSED, 401, body
   *  parse error, non-200) is surfaced as `false`. The deps inject the
   *  fetch — production wires `requestUrl` from Obsidian, tests pass a stub. */
  probeHealthz: (url: string, timeoutMs: number) => Promise<boolean>;
  port: number;
  /** Optional: if provided, the gates skip the token read and fall back to
   *  `null`. Used by the Setup modal — it never displays the token. */
  readToken?: (path: string) => string | null;
}

export interface SetupGatesWithToken extends SetupGates {
  /** Populated only when all gates pass and `readToken` was supplied. */
  token: string | null;
}

export function buildAutoLaunchPaths(homedir: string): Pick<SetupGates, "autoLaunchDir" | "daemonPath" | "tokenPath"> {
  const dir = joinPosix(homedir, AUTOLAUNCH_REL_DIR);
  return {
    autoLaunchDir: dir,
    daemonPath: joinPosix(dir, DAEMON_FILENAME),
    tokenPath: joinPosix(dir, TOKEN_FILENAME),
  };
}

export async function detectSetupGates(deps: DetectDeps): Promise<SetupGatesWithToken> {
  const platform = deps.platform();
  const platformSupported = platform === "darwin";
  const home = deps.homedir();
  const paths = buildAutoLaunchPaths(home);

  // Skip every probe on non-macOS — none of the artifacts can exist there
  // and Issuing a fetch to localhost just to flag "not supported" is waste.
  if (!platformSupported) {
    return {
      ...paths,
      platformSupported,
      browserPluginInstalled: false,
      daemonInstalled: false,
      daemonAlive: false,
      port: deps.port,
      token: null,
    };
  }

  const browserPluginInstalled = deps.pathExists(ITERM_BROWSER_PLUGIN_BUNDLE);
  const daemonInstalled = deps.pathExists(paths.daemonPath);

  // The /healthz probe needs a token to authenticate. We only have a token
  // to probe with if the daemon is installed — but the daemon may also be
  // running from a stale install we can't see, in which case the probe will
  // 401 and we surface "not alive" anyway. We try the probe whenever a
  // token file exists, even if `daemonInstalled` was false (covers the
  // edge case where the user manually installed the .py via a different
  // path that we don't probe for).
  let token: string | null = null;
  if (deps.readToken && deps.pathExists(paths.tokenPath)) {
    try {
      token = deps.readToken(paths.tokenPath);
      if (token !== null) token = token.trim();
      if (token === "") token = null;
    } catch {
      token = null;
    }
  }

  let daemonAlive = false;
  if (token) {
    const url = buildHealthzUrl(deps.port, token);
    daemonAlive = await safeProbe(() => deps.probeHealthz(url, HEALTHZ_TIMEOUT_MS));
  }

  return {
    ...paths,
    platformSupported,
    browserPluginInstalled,
    daemonInstalled,
    daemonAlive,
    port: deps.port,
    token: daemonAlive ? token : null,
  };
}

async function safeProbe(p: () => Promise<boolean>): Promise<boolean> {
  try {
    return await p();
  } catch {
    return false;
  }
}

export function buildDashboardUrl(port: number, token: string): string {
  // OP-217 spec: `http://127.0.0.1:<port>?token=<token>`. The trailing slash
  // is significant — without it some tools treat the path as relative.
  const safeToken = encodeURIComponent(token);
  return `http://127.0.0.1:${port}/?token=${safeToken}`;
}

export function buildHealthzUrl(port: number, token: string): string {
  const safeToken = encodeURIComponent(token);
  return `http://127.0.0.1:${port}/healthz?token=${safeToken}`;
}

/** All gates pass — i.e. the happy path may proceed without the Setup modal. */
export function gatesAllPassing(g: SetupGates): boolean {
  return g.platformSupported && g.browserPluginInstalled && g.daemonInstalled && g.daemonAlive;
}

/** Sufficient state to show the dashboard URL: token + alive. The browser
 *  plugin gate only matters for the `iterm-browser-tab` target — a user
 *  with `target=system-browser` can launch even without the bundle.
 *  Returns the URL on success, null otherwise. */
export function dashboardUrlFromGates(g: SetupGatesWithToken): string | null {
  if (!g.platformSupported) return null;
  if (!g.daemonInstalled || !g.daemonAlive) return null;
  if (!g.token) return null;
  return buildDashboardUrl(g.port, g.token);
}

function joinPosix(...parts: string[]): string {
  // Trim any leading/trailing slashes between parts so we don't double up.
  // The home directory is absolute; subsequent parts are relative.
  return parts
    .map((p, i) => {
      if (i === 0) return p.replace(/\/+$/, "");
      return p.replace(/^\/+/, "").replace(/\/+$/, "");
    })
    .filter(Boolean)
    .join("/");
}

// Exposed for tests so they can build paths without redoing the join logic.
export { joinPosix as _joinPosix };
