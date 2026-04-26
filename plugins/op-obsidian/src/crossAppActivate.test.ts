import { describe, it, expect, vi, beforeEach } from "vitest";

const execFileMock = vi.fn();

vi.mock("child_process", () => ({
  execFile: (file: string, args: string[], cb: (err: Error | null) => void) => {
    execFileMock(file, args);
    cb(null);
  },
}));

import { activateApp } from "./crossAppActivate";

describe("activateApp", () => {
  beforeEach(() => {
    execFileMock.mockClear();
  });

  it("invokes /usr/bin/open -a <name>", async () => {
    await activateApp("Obsidian");
    expect(execFileMock).toHaveBeenCalledWith("/usr/bin/open", ["-a", "Obsidian"]);
  });

  it("works for iTerm and Terminal targets", async () => {
    await activateApp("iTerm");
    await activateApp("Terminal");
    expect(execFileMock).toHaveBeenNthCalledWith(1, "/usr/bin/open", ["-a", "iTerm"]);
    expect(execFileMock).toHaveBeenNthCalledWith(2, "/usr/bin/open", ["-a", "Terminal"]);
  });

  it("never adds new osascript callsites", async () => {
    await activateApp("Obsidian");
    const calls = execFileMock.mock.calls;
    for (const [bin] of calls) {
      expect(bin).not.toContain("osascript");
    }
  });
});

describe("activateApp swallows failures", () => {
  it("does not throw when execFile errors", async () => {
    vi.resetModules();
    vi.doMock("child_process", () => ({
      execFile: (
        _file: string,
        _args: string[],
        cb: (err: Error | null) => void,
      ) => {
        cb(new Error("boom"));
      },
    }));
    const { activateApp: activateAppErroring } = await import("./crossAppActivate");
    await expect(activateAppErroring("Obsidian")).resolves.toBeUndefined();
    vi.doUnmock("child_process");
  });
});
