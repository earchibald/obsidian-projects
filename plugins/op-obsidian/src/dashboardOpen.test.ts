import { describe, it, expect } from "vitest";
import {
  AUTOLAUNCH_REL_DIR,
  DAEMON_FILENAME,
  DEFAULT_DASHBOARD_PORT,
  HEALTHZ_TIMEOUT_MS,
  ITERM_BROWSER_PLUGIN_BUNDLE,
  TOKEN_FILENAME,
  buildAutoLaunchPaths,
  buildDashboardUrl,
  buildHealthzUrl,
  dashboardUrlFromGates,
  detectSetupGates,
  gatesAllPassing,
  type DetectDeps,
} from "./dashboardOpen";

const HOME = "/Users/test";

function makeDeps(overrides: Partial<DetectDeps> = {}): DetectDeps {
  return {
    homedir: () => HOME,
    platform: () => "darwin",
    pathExists: () => false,
    probeHealthz: async () => false,
    port: DEFAULT_DASHBOARD_PORT,
    ...overrides,
  };
}

describe("buildAutoLaunchPaths", () => {
  it("joins under the canonical Application Support folder (with space)", () => {
    const paths = buildAutoLaunchPaths(HOME);
    expect(paths.autoLaunchDir).toBe(`${HOME}/${AUTOLAUNCH_REL_DIR}`);
    expect(paths.daemonPath).toBe(`${HOME}/${AUTOLAUNCH_REL_DIR}/${DAEMON_FILENAME}`);
    expect(paths.tokenPath).toBe(`${HOME}/${AUTOLAUNCH_REL_DIR}/${TOKEN_FILENAME}`);
  });

  it("normalizes a trailing slash on homedir", () => {
    expect(buildAutoLaunchPaths("/Users/test/").autoLaunchDir).toBe(
      `/Users/test/${AUTOLAUNCH_REL_DIR}`,
    );
  });
});

describe("buildDashboardUrl + buildHealthzUrl", () => {
  it("builds the spec's `http://127.0.0.1:<port>/?token=<token>` shape", () => {
    expect(buildDashboardUrl(49217, "abc")).toBe("http://127.0.0.1:49217/?token=abc");
  });

  it("URI-encodes the token (defense-in-depth: tokens are URL-safe by default)", () => {
    expect(buildDashboardUrl(49217, "a/b+c")).toBe(
      "http://127.0.0.1:49217/?token=a%2Fb%2Bc",
    );
    expect(buildHealthzUrl(49217, "a/b+c")).toBe(
      "http://127.0.0.1:49217/healthz?token=a%2Fb%2Bc",
    );
  });
});

describe("detectSetupGates — platform gate", () => {
  it("short-circuits on non-macOS without probing anything", async () => {
    let pathChecks = 0;
    let probes = 0;
    const deps = makeDeps({
      platform: () => "linux",
      pathExists: () => {
        pathChecks++;
        return true;
      },
      probeHealthz: async () => {
        probes++;
        return true;
      },
    });
    const gates = await detectSetupGates(deps);
    expect(gates.platformSupported).toBe(false);
    expect(gates.browserPluginInstalled).toBe(false);
    expect(gates.daemonInstalled).toBe(false);
    expect(gates.daemonAlive).toBe(false);
    expect(gates.token).toBeNull();
    expect(pathChecks).toBe(0);
    expect(probes).toBe(0);
  });

  it("populates resolved paths even on non-macOS so the modal can echo them", async () => {
    const gates = await detectSetupGates(makeDeps({ platform: () => "linux" }));
    expect(gates.autoLaunchDir).toBe(`${HOME}/${AUTOLAUNCH_REL_DIR}`);
    expect(gates.daemonPath.endsWith(DAEMON_FILENAME)).toBe(true);
  });
});

describe("detectSetupGates — gate combinations on macOS", () => {
  it("nothing installed → all gates false", async () => {
    const gates = await detectSetupGates(makeDeps());
    expect(gates.platformSupported).toBe(true);
    expect(gates.browserPluginInstalled).toBe(false);
    expect(gates.daemonInstalled).toBe(false);
    expect(gates.daemonAlive).toBe(false);
    expect(gates.token).toBeNull();
  });

  it("browser plugin only", async () => {
    const gates = await detectSetupGates(
      makeDeps({ pathExists: (p) => p === ITERM_BROWSER_PLUGIN_BUNDLE }),
    );
    expect(gates.browserPluginInstalled).toBe(true);
    expect(gates.daemonInstalled).toBe(false);
    expect(gates.daemonAlive).toBe(false);
  });

  it("daemon installed, no token file → daemonAlive=false (no probe)", async () => {
    let probes = 0;
    const gates = await detectSetupGates(
      makeDeps({
        pathExists: (p) => p.endsWith(DAEMON_FILENAME),
        probeHealthz: async () => {
          probes++;
          return true;
        },
      }),
    );
    expect(gates.daemonInstalled).toBe(true);
    expect(gates.daemonAlive).toBe(false);
    expect(probes).toBe(0); // never probed without a token
  });

  it("daemon + token + healthz=true → all gates pass and token surfaces", async () => {
    const gates = await detectSetupGates(
      makeDeps({
        pathExists: (p) =>
          p === ITERM_BROWSER_PLUGIN_BUNDLE ||
          p.endsWith(DAEMON_FILENAME) ||
          p.endsWith(TOKEN_FILENAME),
        readToken: () => "secret-token-1",
        probeHealthz: async (url, ms) => {
          expect(url).toBe(`http://127.0.0.1:49217/healthz?token=secret-token-1`);
          expect(ms).toBe(HEALTHZ_TIMEOUT_MS);
          return true;
        },
      }),
    );
    expect(gatesAllPassing(gates)).toBe(true);
    expect(gates.token).toBe("secret-token-1");
  });

  it("daemon + token but healthz=false → token is dropped (don't expose stale token)", async () => {
    const gates = await detectSetupGates(
      makeDeps({
        pathExists: (p) =>
          p === ITERM_BROWSER_PLUGIN_BUNDLE ||
          p.endsWith(DAEMON_FILENAME) ||
          p.endsWith(TOKEN_FILENAME),
        readToken: () => "stale-token",
        probeHealthz: async () => false,
      }),
    );
    expect(gates.daemonAlive).toBe(false);
    expect(gates.token).toBeNull();
  });

  it("readToken throws → treated as no token", async () => {
    const gates = await detectSetupGates(
      makeDeps({
        pathExists: (p) => p.endsWith(TOKEN_FILENAME),
        readToken: () => {
          throw new Error("EACCES");
        },
        probeHealthz: async () => true,
      }),
    );
    expect(gates.daemonAlive).toBe(false);
    expect(gates.token).toBeNull();
  });

  it("readToken returns whitespace → normalized to null", async () => {
    const gates = await detectSetupGates(
      makeDeps({
        pathExists: (p) => p.endsWith(TOKEN_FILENAME),
        readToken: () => "   \n  ",
      }),
    );
    expect(gates.token).toBeNull();
    expect(gates.daemonAlive).toBe(false);
  });

  it("probeHealthz throws → swallowed as daemonAlive=false", async () => {
    const gates = await detectSetupGates(
      makeDeps({
        pathExists: (p) => p.endsWith(TOKEN_FILENAME),
        readToken: () => "tok",
        probeHealthz: async () => {
          throw new Error("ECONNREFUSED");
        },
      }),
    );
    expect(gates.daemonAlive).toBe(false);
    expect(gates.token).toBeNull();
  });
});

describe("dashboardUrlFromGates", () => {
  const allPass = {
    autoLaunchDir: `${HOME}/${AUTOLAUNCH_REL_DIR}`,
    daemonPath: `${HOME}/${AUTOLAUNCH_REL_DIR}/${DAEMON_FILENAME}`,
    tokenPath: `${HOME}/${AUTOLAUNCH_REL_DIR}/${TOKEN_FILENAME}`,
    platformSupported: true,
    browserPluginInstalled: true,
    daemonInstalled: true,
    daemonAlive: true,
    port: 49217,
    token: "tok",
  } as const;

  it("returns the URL when all gates pass", () => {
    expect(dashboardUrlFromGates(allPass)).toBe("http://127.0.0.1:49217/?token=tok");
  });

  it("returns null without a token", () => {
    expect(dashboardUrlFromGates({ ...allPass, token: null })).toBeNull();
  });

  it("returns null without a live daemon", () => {
    expect(dashboardUrlFromGates({ ...allPass, daemonAlive: false })).toBeNull();
  });

  it("returns null when the daemon is missing", () => {
    expect(dashboardUrlFromGates({ ...allPass, daemonInstalled: false })).toBeNull();
  });

  it("returns null on non-macOS", () => {
    expect(dashboardUrlFromGates({ ...allPass, platformSupported: false })).toBeNull();
  });

  it("does NOT require browser plugin (system-browser path is valid)", () => {
    // Browser plugin is required only for `target=iterm-browser-tab`, which
    // is gated separately in the modal — the URL itself is reachable
    // without it.
    expect(
      dashboardUrlFromGates({ ...allPass, browserPluginInstalled: false }),
    ).toBe("http://127.0.0.1:49217/?token=tok");
  });
});
