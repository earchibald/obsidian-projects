import { describe, it, expect } from "vitest";
import {
  DASHBOARD_PORT_DEFAULT,
  DASHBOARD_PORT_MAX,
  DASHBOARD_PORT_MIN,
  DEFAULT_SETTINGS,
  mergeSettings,
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
