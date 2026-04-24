import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import {
  API_SOCKET_PATH,
  loadCachedCookie,
  parseCookieAndKey,
  saveCachedCookie,
  type SafeStorageLike,
} from "./cookie";

describe("iterm cookie", () => {
  it("points at iTerm2's unix API socket", () => {
    expect(API_SOCKET_PATH).toMatch(/iTerm2\/private\/socket$/);
  });

  it("parses a cookie/key pair separated by tab", () => {
    const pair = parseCookieAndKey("abc123\txyz789\n");
    expect(pair).toEqual({ cookie: "abc123", key: "xyz789" });
  });

  it("rejects a cookie response missing the key", () => {
    expect(() => parseCookieAndKey("only-cookie\n")).toThrowError(/iTerm cookie request/);
  });

  it("rejects an empty cookie response", () => {
    expect(() => parseCookieAndKey("")).toThrowError(/iTerm cookie request/);
  });
});

// Identity stub for Electron's safeStorage. The real implementation encrypts
// with an OS-backed keychain; our cache logic only needs round-trip fidelity,
// so a base64-wrapping fake is sufficient for unit tests.
function fakeSafeStorage(available = true): SafeStorageLike {
  return {
    isEncryptionAvailable: () => available,
    encryptString: (s: string) => Buffer.from(`enc:${s}`),
    decryptString: (buf: Buffer) => {
      const s = buf.toString("utf8");
      if (!s.startsWith("enc:")) throw new Error("bad ciphertext");
      return s.slice(4);
    },
  };
}

describe("iterm cookie cache", () => {
  let dir: string;
  let cachePath: string;
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "op-cookie-cache-"));
    cachePath = path.join(dir, "nested", ".iterm-cookie");
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("returns null when the cache file is missing", async () => {
    expect(await loadCachedCookie(cachePath, fakeSafeStorage())).toBeNull();
  });

  it("round-trips a cookie through save → load", async () => {
    const pair = { cookie: "c-abc", key: "k-xyz" };
    await saveCachedCookie(cachePath, pair, fakeSafeStorage());
    const loaded = await loadCachedCookie(cachePath, fakeSafeStorage());
    expect(loaded).toEqual(pair);
  });

  it("skips write when encryption is not available", async () => {
    await saveCachedCookie(cachePath, { cookie: "c", key: "k" }, fakeSafeStorage(false));
    await expect(fs.readFile(cachePath)).rejects.toThrow();
  });

  it("returns null when encryption is not available on load", async () => {
    await saveCachedCookie(cachePath, { cookie: "c", key: "k" }, fakeSafeStorage());
    expect(await loadCachedCookie(cachePath, fakeSafeStorage(false))).toBeNull();
  });

  it("returns null on a corrupt ciphertext", async () => {
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.writeFile(cachePath, Buffer.from("not-the-right-prefix"));
    expect(await loadCachedCookie(cachePath, fakeSafeStorage())).toBeNull();
  });
});
