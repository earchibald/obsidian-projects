import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import {
  formatUptime,
  getDashboardLogPath,
  probeDaemonStatus,
  readDashboardToken,
} from "./dashboardInstall";

describe("getDashboardLogPath", () => {
  it("derives the macOS Library/Logs path from a home dir", () => {
    expect(getDashboardLogPath("/home/me")).toBe(
      "/home/me/Library/Logs/op-dashboard.log",
    );
  });
});

describe("formatUptime", () => {
  it("renders sub-minute uptimes as just seconds", () => {
    expect(formatUptime(0)).toBe("0s");
    expect(formatUptime(7)).toBe("7s");
    expect(formatUptime(59)).toBe("59s");
  });

  it("renders sub-hour uptimes as m + s", () => {
    expect(formatUptime(60)).toBe("1m 00s");
    expect(formatUptime(125)).toBe("2m 05s");
  });

  it("renders multi-hour uptimes as h + m + s", () => {
    expect(formatUptime(3600)).toBe("1h 00m 00s");
    expect(formatUptime(3661)).toBe("1h 01m 01s");
  });

  it("returns the em-dash sentinel for invalid input", () => {
    expect(formatUptime(NaN)).toBe("—");
    expect(formatUptime(-1)).toBe("—");
  });
});

describe("readDashboardToken", () => {
  let workDir: string;

  beforeEach(() => {
    workDir = mkdtempSync(path.join(tmpdir(), "op-235-token-"));
  });

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it("returns null when the token file does not exist", () => {
    expect(readDashboardToken(path.join(workDir, "absent.token"))).toBeNull();
  });

  it("returns null when the file exists but is empty/whitespace", () => {
    const tokenPath = path.join(workDir, "empty.token");
    writeFileSync(tokenPath, "   \n");
    expect(readDashboardToken(tokenPath)).toBeNull();
  });

  it("returns the trimmed token contents", () => {
    const tokenPath = path.join(workDir, "ok.token");
    writeFileSync(tokenPath, "secret-abc-123\n");
    expect(readDashboardToken(tokenPath)).toBe("secret-abc-123");
  });
});

describe("probeDaemonStatus", () => {
  const realFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("reports running:false when fetch rejects (daemon offline)", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED")) as unknown as typeof fetch;
    const status = await probeDaemonStatus(49217, "tok");
    expect(status.running).toBe(false);
  });

  it("flags authError when the daemon returns 401", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as unknown as Response) as unknown as typeof fetch;
    const status = await probeDaemonStatus(49217, "stale-token");
    expect(status).toEqual({ running: true, authError: true });
  });

  it("parses the running daemon's healthz payload", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, version: "0.84.0", uptime_s: 42, iterm: true }),
    } as unknown as Response) as unknown as typeof fetch;
    const status = await probeDaemonStatus(49217, "good");
    expect(status).toEqual({
      running: true,
      uptimeSec: 42,
      version: "0.84.0",
      iterm: true,
    });
  });

  // OP-235 review fix #1: an external AbortSignal must cancel the in-flight
  // fetch so callbacks attached after the Settings tab closes don't paint a
  // stale badge. Verify by holding the fetch mock open until the test fires
  // `ext.abort()`, then assert the helper resolved to running:false (the
  // catch path) and that the inner signal saw the abort.
  it("aborts the in-flight fetch when the external signal fires", async () => {
    let capturedAborted = false;
    globalThis.fetch = vi.fn((_url, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        const sig = init?.signal;
        sig?.addEventListener("abort", () => {
          capturedAborted = sig.aborted;
          reject(new DOMException("aborted", "AbortError"));
        });
      }),
    ) as unknown as typeof fetch;
    const ext = new AbortController();
    const probe = probeDaemonStatus(49217, "tok", { signal: ext.signal });
    await new Promise((r) => setTimeout(r, 0));
    ext.abort();
    const status = await probe;
    expect(status).toEqual({ running: false });
    expect(capturedAborted).toBe(true);
  });

  it("aborts immediately when the external signal is already aborted", async () => {
    const ext = new AbortController();
    ext.abort();
    let captured: AbortSignal | undefined;
    globalThis.fetch = vi.fn(async (_url, init?: RequestInit) => {
      captured = init?.signal;
      throw new DOMException("aborted", "AbortError");
    }) as unknown as typeof fetch;
    const status = await probeDaemonStatus(49217, "tok", { signal: ext.signal });
    expect(status).toEqual({ running: false });
    expect(captured?.aborted).toBe(true);
  });
});
