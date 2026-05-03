// OP-232: Setup modal for the agent dashboard. Runs the four gates from
// `dashboardOpen.detectSetupGates`, surfaces each one with actionable copy,
// and exposes the "Install daemon" button that writes the bundled
// `op-dashboard.py` plus `client/index.html` (shipped by OP-230 / OP-231)
// into the user's iTerm AutoLaunch directory.
//
// Never silently writes — Install always opens a confirm sub-modal listing
// the source path, the destination path, and whether a copy already exists.
//
// The modal is a thin shell around the pure detection in `dashboardOpen.ts`.
// All filesystem writes go through `fs.copyFileSync` / `fs.mkdirSync`; we
// don't reach through Obsidian's vault adapter because the AutoLaunch
// directory lives outside the vault.

import { execFile } from "node:child_process";
import * as fs from "fs";
import { App, Modal, Setting } from "obsidian";
import { notify } from "./notificationLog";
import {
  AUTOLAUNCH_REL_DIR,
  DAEMON_FILENAME,
  ITERM_BROWSER_PLUGIN_BUNDLE,
  buildAutoLaunchPaths,
  detectSetupGates,
  type SetupGatesWithToken,
} from "./dashboardOpen";
import * as os from "os";
import * as path from "path";
import { promisify } from "util";
import type { BundledDashboardAssets } from "./dashboardBundledAssets";

export interface DashboardSetupDeps {
  /** Probe used by `detectSetupGates`. Production passes a `requestUrl`-backed
   *  probe with a 1-second AbortController; the modal injects it so the
   *  confirm/cancel UX can be exercised without a real daemon. */
  probeHealthz: (url: string, timeoutMs: number) => Promise<boolean>;
  /** Bundled daemon + client payload embedded in the plugin's main bundle so
   *  BRAT installs still have the dashboard runtime assets available. */
  bundledAssets: BundledDashboardAssets;
  /** Optional clipboard writer (`navigator.clipboard.writeText`). Used for
   *  the "Copy" button next to the Homebrew install instruction. */
  copyToClipboard?: (text: string) => Promise<void>;
  /** Port the daemon listens on. Default 49217 (DASHBOARD_PORT_DEFAULT). */
  port: number;
}

/** Resolves whatever the user typed/pasted/dropped. Used only by the modal. */
const HOMEBREW_INSTALL_CMD = "brew install --cask itermbrowserplugin";
export const DASHBOARD_AIOHTTP_SPEC = "aiohttp>=3.9,<4";
const pExecFile = promisify(execFile);

export class DashboardSetupModal extends Modal {
  private gates: SetupGatesWithToken | null = null;
  private rerunPending = false;

  constructor(
    app: App,
    private deps: DashboardSetupDeps,
    /** Called when all four gates pass and the user clicks "Open dashboard".
     *  The caller (typically `op-dashboard` command in main.ts) reads the
     *  token from the file and routes to the configured target. */
    private onAllGatesPass: () => void,
  ) {
    super(app);
  }

  async onOpen(): Promise<void> {
    this.titleEl.setText("Set up the op-dashboard");
    this.contentEl.addClass("op-dashboard-setup");
    await this.renderGates();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  /** Re-run detection and re-render. Idempotent; bounce-protected. */
  private async refresh(): Promise<void> {
    if (this.rerunPending) return;
    this.rerunPending = true;
    try {
      await this.renderGates();
    } finally {
      this.rerunPending = false;
    }
  }

  private async renderGates(): Promise<void> {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl("p", {
      text: "The agent dashboard runs as a Python daemon that iTerm2 launches at startup. Three things need to be in place before it can run.",
    });

    this.gates = await detectSetupGates({
      homedir: () => os.homedir(),
      platform: () => process.platform,
      pathExists: (p) => fs.existsSync(p),
      probeHealthz: this.deps.probeHealthz,
      port: this.deps.port,
      readToken: (p) => {
        try {
          return fs.readFileSync(p, "utf8");
        } catch {
          return null;
        }
      },
    });

    if (!this.gates.platformSupported) {
      this.renderUnsupportedPlatform();
      return;
    }

    this.renderGate("iTerm2 browser plugin", this.gates.browserPluginInstalled, (gate) => {
      gate.createEl("p", {
        text: "Install the iTermBrowserPlugin so the dashboard can open inside an iTerm tab. (Skip this if you’re happy opening the dashboard in your system browser.)",
      });
      const cmdRow = gate.createEl("p");
      const code = cmdRow.createEl("code", { text: HOMEBREW_INSTALL_CMD });
      code.style.userSelect = "all";
      cmdRow.createSpan({ text: "  " });
      const copyBtn = cmdRow.createEl("button", { text: "Copy" });
      copyBtn.addEventListener("click", async () => {
        const writer = this.deps.copyToClipboard ?? defaultClipboardWriter;
        try {
          await writer(HOMEBREW_INSTALL_CMD);
          notify("Copied install command");
        } catch (err) {
          notify(`Copy failed: ${describeErr(err)}`);
        }
      });
      gate.createEl("p", {
        cls: "op-dashboard-setup__path",
        text: `Probed: ${ITERM_BROWSER_PLUGIN_BUNDLE}`,
      });
    });

    this.renderGate("Daemon installed", this.gates.daemonInstalled, (gate) => {
      const paths = buildAutoLaunchPaths(os.homedir());
      if (this.gates?.daemonInstalled) {
        gate.createEl("p", {
          text: "The daemon is already installed at the expected path. Use Reinstall to overwrite it after a plugin upgrade.",
        });
      } else {
        gate.createEl("p", {
          text: "Click Install daemon to install op-dashboard.py and its client/index.html sibling into your iTerm AutoLaunch folder. You’ll always be asked to confirm before the files are written.",
        });
      }
      gate.createEl("p", {
        cls: "op-dashboard-setup__path",
        text: `Source: ${this.deps.bundledAssets.sourceLabel}`,
      });
      gate.createEl("p", {
        cls: "op-dashboard-setup__path",
        text: `Target: ${paths.daemonPath}`,
      });
      gate.createEl("p", {
        cls: "op-dashboard-setup__path",
        text: `Also installs: ${dashboardClientPath(paths.daemonPath)}`,
      });
      new Setting(gate).addButton((b) =>
        b
          .setButtonText(this.gates?.daemonInstalled ? "Reinstall daemon" : "Install daemon")
          .setCta()
          .onClick(() => this.openInstallConfirm(paths.daemonPath)),
      );
    });

    this.renderGate("Daemon running", this.gates.daemonAlive, (gate) => {
      if (this.gates?.daemonAlive) {
        gate.createEl("p", {
          text: `op-dashboard.py is responding on port ${this.gates.port}.`,
        });
      } else if (this.gates?.daemonInstalled) {
        gate.createEl("p", {
          text: "The daemon is installed but not responding. Restart iTerm2 (or rerun Scripts → AutoLaunch → op-dashboard.py) to launch it. If it still fails, open ~/Library/Logs/op-dashboard.log and look for missing bundled-Python dependencies.",
        });
      } else {
        gate.createEl("p", {
          text: "Install the daemon first, then restart iTerm2 to bring it up.",
        });
      }
    });

    new Setting(contentEl)
      .addButton((b) =>
        b
          .setButtonText("Refresh")
          .onClick(() => void this.refresh()),
      )
      .addButton((b) => {
        const allPass =
          this.gates?.platformSupported &&
          this.gates?.daemonInstalled &&
          this.gates?.daemonAlive;
        b
          .setButtonText("Open dashboard")
          .setDisabled(!allPass)
          .setCta()
          .onClick(() => {
            if (!allPass) return;
            this.close();
            this.onAllGatesPass();
          });
      })
      .addButton((b) => b.setButtonText("Close").onClick(() => this.close()));
  }

  private renderGate(
    title: string,
    pass: boolean,
    body: (container: HTMLElement) => void,
  ): void {
    const wrapper = this.contentEl.createDiv({
      cls: ["op-dashboard-setup__gate", pass ? "is-pass" : "is-fail"],
    });
    const heading = wrapper.createEl("h3");
    heading.createSpan({
      cls: "op-dashboard-setup__badge",
      text: pass ? "✓" : "•",
    });
    heading.createSpan({ text: ` ${title}` });
    body(wrapper);
  }

  private renderUnsupportedPlatform(): void {
    const wrapper = this.contentEl.createDiv({
      cls: "op-dashboard-setup__gate is-fail",
    });
    wrapper.createEl("h3", { text: "Not supported on this platform" });
    wrapper.createEl("p", {
      text: "The agent dashboard depends on iTerm2 and macOS-only services. Linux/Windows support is out of scope for v1.",
    });
    new Setting(this.contentEl).addButton((b) =>
      b.setButtonText("Close").onClick(() => this.close()),
    );
  }

  private openInstallConfirm(targetPath: string): void {
    new InstallDaemonConfirmModal(
      this.app,
      this.deps.bundledAssets,
      targetPath,
      vaultBasePathFromApp(this.app),
      () => void this.refresh(),
    ).open();
  }
}

class InstallDaemonConfirmModal extends Modal {
  constructor(
    app: App,
    private assets: BundledDashboardAssets,
    private targetPath: string,
    /** OP-242: vault base path so we can write the daemon's config sidecar.
     *  May be empty in unusual adapters; we just skip the config file then. */
    private vaultBasePath: string,
    private onInstalled: () => void,
  ) {
    super(app);
  }

  onOpen(): void {
    this.titleEl.setText("Install op-dashboard daemon");
    this.contentEl.empty();

    const exists = (() => {
      try {
        return fs.existsSync(this.targetPath);
      } catch {
        return false;
      }
    })();

    this.contentEl.createEl("p", {
      text: exists
        ? "An op-dashboard.py already exists at the target path. Confirming will overwrite it."
        : "Confirming will install the bundled op-dashboard.py and client/index.html into your iTerm AutoLaunch folder.",
    });
    this.contentEl.createEl("p", {
      cls: "op-dashboard-setup__path",
      text: `Source: ${this.assets.sourceLabel}`,
    });
    this.contentEl.createEl("p", {
      cls: "op-dashboard-setup__path",
      text: `Target: ${this.targetPath}`,
    });
    this.contentEl.createEl("p", {
      cls: "op-dashboard-setup__path",
      text: `Also installs: ${dashboardClientPath(this.targetPath)}`,
    });

    new Setting(this.contentEl)
      .addButton((b) =>
        b
          .setButtonText(exists ? "Reinstall" : "Install")
          .setCta()
          .onClick(async () => {
            const result = installDaemon(
              this.assets,
              this.targetPath,
              this.vaultBasePath
                ? { vaultDataPaths: [pluginDataJsonPath(this.vaultBasePath)] }
                : undefined,
            );
            if (!result.ok) {
              notify(`Install failed: ${result.reason}`, 8000);
              return;
            }
            const deps = await installDashboardDependencies(os.homedir());
            if (deps.ok) {
              notify(
                `op-dashboard.py, client/index.html, and aiohttp installed for ${deps.runtimesInstalled} iTerm runtime${deps.runtimesInstalled === 1 ? "" : "s"}. Restart iTerm2 to start the daemon.`,
                /* timeout */ 6000,
              );
              this.close();
              this.onInstalled();
            } else {
              notify(
                `Installed daemon assets, but couldn't install aiohttp into iTerm's bundled Python runtime: ${deps.reason}`,
                8000,
              );
            }
          }),
      )
      .addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()));
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export interface InstallDaemonResult {
  ok: boolean;
  reason?: string;
}

/** OP-242: optional config payload written next to the daemon as
 *  `op-dashboard.config.json`. The daemon reads this on startup to discover
 *  the plugin's `data.json` and enrich each agent surface with its
 *  `model` / `workdir` / `started_at`. Without this, the daemon falls back
 *  to the `OP_DASHBOARD_DATA_JSON` env var (set by no one in the install
 *  flow) and the enrichment is silently empty. */
export interface InstallDaemonConfig {
  vaultDataPaths: string[];
}

export interface DashboardDependencyInstallResult {
  ok: boolean;
  runtimesInstalled: number;
  runtimePath?: string;
  alreadySatisfied?: boolean;
  reason?: string;
}

/** Pure-ish helper exported for testing. Synchronous because the dest write
 *  is a small local write and we want the post-write Notice to fire only
 *  after the bytes hit disk. */
export function installDaemon(
  assets: BundledDashboardAssets,
  targetPath: string,
  config?: InstallDaemonConfig,
): InstallDaemonResult {
  try {
    if (!assets.daemonContent.trim()) {
      return { ok: false, reason: "bundled daemon payload is empty" };
    }
    if (!assets.clientContent.trim()) {
      return { ok: false, reason: "bundled client payload is empty" };
    }
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, assets.daemonContent, "utf8");
    fs.mkdirSync(path.dirname(dashboardClientPath(targetPath)), { recursive: true });
    fs.writeFileSync(dashboardClientPath(targetPath), assets.clientContent, "utf8");
    // OP-242: persist the config sidecar so the daemon can locate the
    // plugin's data.json and enrich surfaces with model/workdir/started_at.
    // Only written when a config is supplied — keeps tests / non-vault
    // callers backwards-compatible.
    if (config) {
      fs.writeFileSync(
        dashboardConfigPath(targetPath),
        JSON.stringify({ vault_data_paths: config.vaultDataPaths }, null, 2) + "\n",
        "utf8",
      );
    }
    // Daemon expects executable permission. `iterm2` AutoLaunch runs `python3
    // <script>` so technically the bit isn't required, but setting it
    // matches what users get if they install via `cp` and means manual
    // `./op-dashboard.py` invocations Just Work.
    try {
      fs.chmodSync(targetPath, 0o755);
    } catch {
      // Non-fatal; the daemon still works without the bit.
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: describeErr(err) };
  }
}

export function listITermPythonRuntimes(homeDir: string): string[] {
  const versionsDir = path.join(
    homeDir,
    "Library",
    "Application Support",
    "iTerm2",
    "iterm2env",
    "versions",
  );
  try {
    return fs
      .readdirSync(versionsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(versionsDir, entry.name, "bin", "python3"))
      .filter((pythonPath) => fs.existsSync(pythonPath))
      .sort();
  } catch {
    return [];
  }
}

export function preferredITermPythonRuntime(homeDir: string): string | null {
  const runtimes = listITermPythonRuntimes(homeDir);
  if (runtimes.length === 0) return null;
  return [...runtimes].sort(comparePythonRuntimePaths).at(-1) ?? null;
}

export function dashboardDependencyInstallArgs(): string[] {
  return ["-m", "pip", "install", "--disable-pip-version-check", DASHBOARD_AIOHTTP_SPEC];
}

export async function installDashboardDependencies(
  homeDir: string,
): Promise<DashboardDependencyInstallResult> {
  const runtime = preferredITermPythonRuntime(homeDir);
  if (!runtime) {
    return {
      ok: false,
      runtimesInstalled: 0,
      reason: "no iTerm bundled Python runtimes were found under ~/Library/Application Support/iTerm2/iterm2env/versions",
    };
  }
  try {
    await pExecFile(runtime, ["-c", "import aiohttp"], { timeout: 5_000 });
    return {
      ok: true,
      runtimesInstalled: 0,
      runtimePath: runtime,
      alreadySatisfied: true,
    };
  } catch {
    // Missing aiohttp is the expected bootstrap case — fall through to install.
  }
  try {
    await pExecFile(runtime, dashboardDependencyInstallArgs(), { timeout: 60_000 });
    return {
      ok: true,
      runtimesInstalled: 1,
      runtimePath: runtime,
      alreadySatisfied: false,
    };
  } catch (err) {
    return {
      ok: false,
      runtimesInstalled: 0,
      runtimePath: runtime,
      reason: `${runtime}: ${describeErr(err)}`,
    };
  }
}
export function dashboardClientPath(targetPath: string): string {
  return path.join(path.dirname(targetPath), "client", "index.html");
}

/** OP-242: sidecar config path next to the daemon. The daemon hardcodes
 *  the basename `op-dashboard.config.json` in the same directory; keep the
 *  two in sync. */
export function dashboardConfigPath(targetPath: string): string {
  return path.join(path.dirname(targetPath), "op-dashboard.config.json");
}

/** OP-242: build the absolute path to the plugin's `data.json` for a vault.
 *  The plugin id is hardcoded — `app.vault.adapter.basePath` + the plugin's
 *  install-relative path. Used by both install paths (Setup modal + Settings). */
export function pluginDataJsonPath(vaultBasePath: string): string {
  return path.join(vaultBasePath, ".obsidian", "plugins", "op-obsidian", "data.json");
}

/** OP-242: probe the vault adapter for a filesystem base path. Obsidian's
 *  desktop FileSystemAdapter sets `basePath`; mobile / unusual adapters may
 *  not. Returns "" when unavailable so callers can skip the config-write. */
export function vaultBasePathFromApp(app: App): string {
  const adapter = app.vault.adapter as unknown as { basePath?: string };
  return typeof adapter.basePath === "string" ? adapter.basePath : "";
}

async function defaultClipboardWriter(text: string): Promise<void> {
  // Obsidian's renderer process exposes `navigator.clipboard.writeText`.
  // Wrap so callers don't have to feature-test.
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
  } else {
    throw new Error("clipboard API unavailable");
  }
}

function describeErr(err: unknown): string {
  if (err instanceof Error) return err.message.split("\n")[0];
  return String(err);
}

function comparePythonRuntimePaths(a: string, b: string): number {
  const aVersion = versionTuple(path.basename(path.dirname(path.dirname(a))));
  const bVersion = versionTuple(path.basename(path.dirname(path.dirname(b))));
  const len = Math.max(aVersion.length, bVersion.length);
  for (let i = 0; i < len; i++) {
    const delta = (aVersion[i] ?? 0) - (bVersion[i] ?? 0);
    if (delta !== 0) return delta;
  }
  return a.localeCompare(b);
}

function versionTuple(raw: string): number[] {
  return raw
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => Number.isFinite(part));
}

// Re-export for callers that only want the AutoLaunch-relative path string.
export { AUTOLAUNCH_REL_DIR, DAEMON_FILENAME };
