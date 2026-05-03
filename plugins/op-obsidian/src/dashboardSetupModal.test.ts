import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";

vi.mock("obsidian", () => ({
  App: class {},
  Modal: class {},
  Notice: class {},
  Setting: class {
    addButton(cb: (button: { setButtonText: () => unknown; setCta: () => unknown; onClick: () => unknown }) => unknown) {
      cb({
        setButtonText: () => this,
        setCta: () => this,
        onClick: () => this,
      });
      return this;
    }
  },
}));

import { existsSync } from "node:fs";

import {
  DASHBOARD_AIOHTTP_SPEC,
  dashboardClientPath,
  dashboardConfigPath,
  dashboardDependencyInstallArgs,
  installDaemon,
  listITermPythonRuntimes,
  pluginDataJsonPath,
} from "./dashboardSetupModal";

describe("dashboardClientPath", () => {
  it("installs the client next to the daemon under client/index.html", () => {
    expect(dashboardClientPath("/tmp/AutoLaunch/op-dashboard.py")).toBe(
      "/tmp/AutoLaunch/client/index.html",
    );
  });
});

describe("installDaemon", () => {
  let workDir: string;

  afterEach(() => {
    if (workDir) rmSync(workDir, { recursive: true, force: true });
  });

  it("writes the daemon and client assets into AutoLaunch layout", () => {
    workDir = mkdtempSync(path.join(tmpdir(), "op-dashboard-install-"));
    const daemonPath = path.join(workDir, "Scripts", "AutoLaunch", "op-dashboard.py");
    const result = installDaemon(
      {
        sourceLabel: "embedded",
        daemonContent: "#!/usr/bin/env python3\nprint('ok')\n",
        clientContent: "<!doctype html><title>dashboard</title>\n",
      },
      daemonPath,
    );

    expect(result).toEqual({ ok: true });
    expect(readFileSync(daemonPath, "utf8")).toContain("print('ok')");
    expect(readFileSync(dashboardClientPath(daemonPath), "utf8")).toContain("<!doctype html>");
    expect(statSync(daemonPath).mode & 0o777).toBe(0o755);
  });

  it("writes op-dashboard.config.json when a config is supplied (OP-242)", () => {
    workDir = mkdtempSync(path.join(tmpdir(), "op-dashboard-install-"));
    const daemonPath = path.join(workDir, "Scripts", "AutoLaunch", "op-dashboard.py");
    const dataJson = "/Users/whoever/Vault/.obsidian/plugins/op-obsidian/data.json";
    const result = installDaemon(
      {
        sourceLabel: "embedded",
        daemonContent: "#!/usr/bin/env python3\n",
        clientContent: "<!doctype html>",
      },
      daemonPath,
      { vaultDataPaths: [dataJson] },
    );
    expect(result).toEqual({ ok: true });
    const cfg = JSON.parse(readFileSync(dashboardConfigPath(daemonPath), "utf8"));
    expect(cfg).toEqual({ vault_data_paths: [dataJson] });
  });

  it("omits the config file when no config is supplied", () => {
    workDir = mkdtempSync(path.join(tmpdir(), "op-dashboard-install-"));
    const daemonPath = path.join(workDir, "Scripts", "AutoLaunch", "op-dashboard.py");
    installDaemon(
      {
        sourceLabel: "embedded",
        daemonContent: "#!/usr/bin/env python3\n",
        clientContent: "<!doctype html>",
      },
      daemonPath,
    );
    expect(existsSync(dashboardConfigPath(daemonPath))).toBe(false);
  });

  it("pluginDataJsonPath joins the vault adapter base path", () => {
    expect(pluginDataJsonPath("/Users/x/Vault")).toBe(
      "/Users/x/Vault/.obsidian/plugins/op-obsidian/data.json",
    );
  });

  it("fails when the embedded daemon payload is empty", () => {
    workDir = mkdtempSync(path.join(tmpdir(), "op-dashboard-install-"));
    const daemonPath = path.join(workDir, "Scripts", "AutoLaunch", "op-dashboard.py");
    expect(
      installDaemon(
        {
          sourceLabel: "embedded",
          daemonContent: " \n",
          clientContent: "<!doctype html>",
        },
        daemonPath,
      ),
    ).toEqual({ ok: false, reason: "bundled daemon payload is empty" });
  });
});

describe("listITermPythonRuntimes", () => {
  it("returns every bundled iTerm python path under versions/*/bin/python3", () => {
    const homeDir = mkdtempSync(path.join(tmpdir(), "op-dashboard-runtimes-"));
    try {
      const versionsDir = path.join(
        homeDir,
        "Library",
        "Application Support",
        "iTerm2",
        "iterm2env",
        "versions",
      );
      mkdirSync(path.join(versionsDir, "3.10.19", "bin"), { recursive: true });
      mkdirSync(path.join(versionsDir, "3.14.0", "bin"), { recursive: true });
      writeFileSync(path.join(versionsDir, "3.10.19", "bin", "python3"), "");
      writeFileSync(path.join(versionsDir, "3.14.0", "bin", "python3"), "");
      mkdirSync(path.join(versionsDir, "notes"), { recursive: true });

      expect(listITermPythonRuntimes(homeDir)).toEqual([
        path.join(versionsDir, "3.10.19", "bin", "python3"),
        path.join(versionsDir, "3.14.0", "bin", "python3"),
      ]);
    } finally {
      rmSync(homeDir, { recursive: true, force: true });
    }
  });

  it("returns an empty list when the canonical iterm2env path is absent", () => {
    const homeDir = mkdtempSync(path.join(tmpdir(), "op-dashboard-runtimes-"));
    try {
      expect(listITermPythonRuntimes(homeDir)).toEqual([]);
    } finally {
      rmSync(homeDir, { recursive: true, force: true });
    }
  });
});

describe("dashboardDependencyInstallArgs", () => {
  it("pins aiohttp to the supported range", () => {
    expect(dashboardDependencyInstallArgs()).toEqual([
      "-m",
      "pip",
      "install",
      "--disable-pip-version-check",
      DASHBOARD_AIOHTTP_SPEC,
    ]);
  });
});
