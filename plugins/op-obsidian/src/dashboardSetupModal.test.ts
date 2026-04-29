import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
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

import { dashboardClientPath, installDaemon } from "./dashboardSetupModal";

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
