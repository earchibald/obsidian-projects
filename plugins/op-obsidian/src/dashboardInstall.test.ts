import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { EventEmitter } from "node:events";
import type { ClientRequest, IncomingMessage } from "node:http";
import { tmpdir } from "node:os";
import * as path from "node:path";
import * as http from "node:http";
import {
  formatUptime,
  getDashboardLogPath,
  probeDaemonStatus,
  readDashboardToken,
} from "./dashboardInstall";

vi.mock("node:http", () => ({
  get: vi.fn(),
}));

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
  const httpGetMock = vi.mocked(http.get);

  afterEach(() => {
    httpGetMock.mockReset();
  });

  it("reports running:false when the request errors (daemon offline)", async () => {
    httpGetMock.mockImplementation(() => {
      const req = makeRequest();
      queueMicrotask(() => req.emit("error", new Error("ECONNREFUSED")));
      return req as ClientRequest;
    });
    const status = await probeDaemonStatus(49217, "tok");
    expect(status.running).toBe(false);
  });

  it("flags authError when the daemon returns 401", async () => {
    httpGetMock.mockImplementation((_url, cb) => {
      const req = makeRequest();
      queueMicrotask(() => emitResponse(cb, 401, "{}"));
      return req as ClientRequest;
    });
    const status = await probeDaemonStatus(49217, "stale-token");
    expect(status).toEqual({ running: true, authError: true });
  });

  it("parses the running daemon's healthz payload", async () => {
    httpGetMock.mockImplementation((_url, cb) => {
      const req = makeRequest();
      queueMicrotask(() =>
        emitResponse(cb, 200, JSON.stringify({ ok: true, version: "0.84.0", uptime_s: 42, iterm: true })),
      );
      return req as ClientRequest;
    });
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
  it("aborts the in-flight probe when the external signal fires", async () => {
    let destroyed = false;
    httpGetMock.mockImplementation(() => {
      const req = makeRequest();
      req.destroy = vi.fn(() => {
        destroyed = true;
        return req as ClientRequest;
      }) as ClientRequest["destroy"];
      return req as ClientRequest;
    });
    const ext = new AbortController();
    const probe = probeDaemonStatus(49217, "tok", { signal: ext.signal });
    await new Promise((r) => setTimeout(r, 0));
    ext.abort();
    const status = await probe;
    expect(status).toEqual({ running: false });
    expect(destroyed).toBe(true);
  });

  it("aborts immediately when the external signal is already aborted", async () => {
    const ext = new AbortController();
    ext.abort();
    const status = await probeDaemonStatus(49217, "tok", { signal: ext.signal });
    expect(status).toEqual({ running: false });
    expect(httpGetMock).not.toHaveBeenCalled();
  });
});

function makeRequest(): EventEmitter & Pick<ClientRequest, "on" | "setTimeout" | "destroy" | "removeListener"> {
  const req = new EventEmitter() as EventEmitter &
    Pick<ClientRequest, "on" | "setTimeout" | "destroy" | "removeListener">;
  req.setTimeout = vi.fn();
  req.destroy = vi.fn(() => req as ClientRequest);
  return req;
}

function emitResponse(
  callback: ((res: IncomingMessage) => void) | undefined,
  status: number,
  body: string,
): void {
  const res = new EventEmitter() as IncomingMessage;
  res.statusCode = status;
  callback?.(res);
  res.emit("data", Buffer.from(body));
  res.emit("end");
}
