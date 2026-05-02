import { describe, it, expect } from "vitest";
import { validateOverlay } from "./overlayValidate";

describe("validateOverlay", () => {
  it("accepts a well-formed overlay", () => {
    const r = validateOverlay({
      binary: "claude",
      launchFlags: ["--x"],
      postLaunchCommands: ["/rename {{id}}"],
      label: "X",
    });
    expect(r.ok).toBe(true);
    expect(r.overlay).toEqual({
      binary: "claude",
      launchFlags: ["--x"],
      postLaunchCommands: ["/rename {{id}}"],
      label: "X",
    });
    expect(r.warnings).toEqual([]);
  });

  it("rejects non-objects", () => {
    expect(validateOverlay(null).ok).toBe(false);
    expect(validateOverlay([]).ok).toBe(false);
    expect(validateOverlay("x").ok).toBe(false);
  });

  it("warns on unknown keys but still saves", () => {
    const r = validateOverlay({ binary: "x", bogus: 1 });
    expect(r.ok).toBe(true);
    expect(r.overlay).toEqual({ binary: "x" });
    expect(r.warnings[0]).toMatch(/unknown key "bogus"/);
  });

  it("errors on wrong-typed known keys", () => {
    const r = validateOverlay({ binary: 42 });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/binary.*string/);
  });

  it("errors when launchFlags is not string array", () => {
    expect(validateOverlay({ launchFlags: "x" }).ok).toBe(false);
    expect(validateOverlay({ launchFlags: [1, 2] }).ok).toBe(false);
  });

  it("errors when post-launch command arrays are not string arrays", () => {
    expect(validateOverlay({ postLaunchCommands: "x" }).ok).toBe(false);
    expect(validateOverlay({ reviewPostLaunchCommands: [1, 2] }).ok).toBe(false);
  });
});
