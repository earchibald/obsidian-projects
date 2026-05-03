import { describe, it, expect } from "vitest";
import {
  DASHBOARD_PORT_DEFAULT,
  DASHBOARD_PORT_MAX,
  DASHBOARD_PORT_MIN,
  DEFAULT_SETTINGS,
  mergeSettings,
  validateDashboardPortInput,
} from "./settingsPure";

// OP-232 added the `dashboard` namespace + merge guards; OP-235 lands the
// Settings UI on top. These tests defend against regressions in the merge
// shape that the UI depends on (port range guard, target enum coercion,
// independence from other namespaces).
describe("mergeSettings — dashboard namespace (OP-232 + OP-235)", () => {
  it("seeds the dashboard defaults on an empty load", () => {
    const merged = mergeSettings({});
    expect(merged.dashboard.port).toBe(DASHBOARD_PORT_DEFAULT);
    expect(merged.dashboard.target).toBe("iterm-browser-tab");
  });

  it("preserves the canonical default port and target on DEFAULT_SETTINGS", () => {
    expect(DEFAULT_SETTINGS.dashboard.port).toBe(49217);
    expect(DEFAULT_SETTINGS.dashboard.target).toBe("iterm-browser-tab");
  });

  it("accepts a valid in-range port", () => {
    const merged = mergeSettings({ dashboard: { port: 50000 } });
    expect(merged.dashboard.port).toBe(50000);
  });

  it("floors a fractional port", () => {
    const merged = mergeSettings({ dashboard: { port: 50000.7 } });
    expect(merged.dashboard.port).toBe(50000);
  });

  it("rejects a port below the floor and falls back to the default", () => {
    const merged = mergeSettings({ dashboard: { port: 80 } });
    expect(merged.dashboard.port).toBe(DASHBOARD_PORT_DEFAULT);
  });

  it("rejects a port above 65535 and falls back to the default", () => {
    const merged = mergeSettings({ dashboard: { port: 70000 } });
    expect(merged.dashboard.port).toBe(DASHBOARD_PORT_DEFAULT);
  });

  it("rejects a non-numeric port", () => {
    const merged = mergeSettings({
      dashboard: { port: "49218" as unknown as number },
    });
    expect(merged.dashboard.port).toBe(DASHBOARD_PORT_DEFAULT);
  });

  it("accepts the 'system-browser' target value", () => {
    const merged = mergeSettings({ dashboard: { target: "system-browser" } });
    expect(merged.dashboard.target).toBe("system-browser");
  });

  it("rejects an unknown target enum and falls back to the default", () => {
    const merged = mergeSettings({
      dashboard: {
        target: "safari" as unknown as "system-browser" | "iterm-browser-tab",
      },
    });
    expect(merged.dashboard.target).toBe("iterm-browser-tab");
  });

  it("merges dashboard partials independently of other namespaces", () => {
    const merged = mergeSettings({
      dashboard: { port: 49500 },
      flow: { autoAdvance: true },
    });
    expect(merged.dashboard.port).toBe(49500);
    expect(merged.dashboard.target).toBe("iterm-browser-tab");
    expect(merged.flow.autoAdvance).toBe(true);
  });

  it("clamps port at the documented MIN/MAX boundaries", () => {
    expect(
      mergeSettings({ dashboard: { port: DASHBOARD_PORT_MIN } }).dashboard.port,
    ).toBe(DASHBOARD_PORT_MIN);
    expect(
      mergeSettings({ dashboard: { port: DASHBOARD_PORT_MAX } }).dashboard.port,
    ).toBe(DASHBOARD_PORT_MAX);
  });
});

// OP-241: predicate that drives the inline error feedback in the Dashboard
// settings row. Treat empty distinctly from invalid so a user mid-edit
// (cleared the field) doesn't get a red error badge — only typed values
// that can't possibly become a port should trip the badge.
describe("validateDashboardPortInput (OP-241)", () => {
  it("returns kind='empty' for an empty / whitespace-only input", () => {
    expect(validateDashboardPortInput("").kind).toBe("empty");
    expect(validateDashboardPortInput("   ").kind).toBe("empty");
  });

  it("accepts valid in-range integers", () => {
    expect(validateDashboardPortInput("49217")).toEqual({
      kind: "valid",
      value: 49217,
    });
    expect(validateDashboardPortInput(String(DASHBOARD_PORT_MIN))).toEqual({
      kind: "valid",
      value: DASHBOARD_PORT_MIN,
    });
    expect(validateDashboardPortInput(String(DASHBOARD_PORT_MAX))).toEqual({
      kind: "valid",
      value: DASHBOARD_PORT_MAX,
    });
  });

  it("flags out-of-range integers as invalid with a range hint", () => {
    const lo = validateDashboardPortInput(String(DASHBOARD_PORT_MIN - 1));
    const hi = validateDashboardPortInput(String(DASHBOARD_PORT_MAX + 1));
    expect(lo.kind).toBe("invalid");
    expect(hi.kind).toBe("invalid");
    if (lo.kind === "invalid") {
      expect(lo.message).toContain(String(DASHBOARD_PORT_MIN));
      expect(lo.message).toContain(String(DASHBOARD_PORT_MAX));
    }
  });

  it("flags non-integer / signed / decimal inputs as invalid", () => {
    expect(validateDashboardPortInput("abc").kind).toBe("invalid");
    expect(validateDashboardPortInput("-1").kind).toBe("invalid");
    expect(validateDashboardPortInput("49217.5").kind).toBe("invalid");
    expect(validateDashboardPortInput("0x1234").kind).toBe("invalid");
    expect(validateDashboardPortInput("49217abc").kind).toBe("invalid");
  });
});
