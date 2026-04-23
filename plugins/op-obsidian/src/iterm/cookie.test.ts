import { describe, expect, it } from "vitest";
import { parseCookieAndKey, parsePort } from "./cookie";

describe("iterm cookie", () => {
  it("parses a port file with trailing newline", () => {
    expect(parsePort("51234\n")).toBe(51234);
  });

  it("parses a port file without trailing newline", () => {
    expect(parsePort("51234")).toBe(51234);
  });

  it("rejects a non-numeric port file", () => {
    expect(() => parsePort("not-a-number")).toThrowError(/iTerm api port file/);
  });

  it("rejects an out-of-range port", () => {
    expect(() => parsePort("99999")).toThrowError(/iTerm api port file/);
    expect(() => parsePort("0")).toThrowError(/iTerm api port file/);
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
