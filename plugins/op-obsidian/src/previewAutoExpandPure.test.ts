import { describe, expect, it } from "vitest";
import { shouldAutoExpand } from "./previewAutoExpandPure";

describe("shouldAutoExpand", () => {
  it("returns true for the first three launches when not dismissed", () => {
    expect(shouldAutoExpand({ sessionLaunchCount: 1, dismissed: false })).toBe(true);
    expect(shouldAutoExpand({ sessionLaunchCount: 2, dismissed: false })).toBe(true);
    expect(shouldAutoExpand({ sessionLaunchCount: 3, dismissed: false })).toBe(true);
  });

  it("returns false from the fourth launch onward when not dismissed", () => {
    expect(shouldAutoExpand({ sessionLaunchCount: 4, dismissed: false })).toBe(false);
    expect(shouldAutoExpand({ sessionLaunchCount: 99, dismissed: false })).toBe(false);
  });

  it("returns false at every counter when dismissed", () => {
    for (const counter of [1, 2, 3, 4, 99]) {
      expect(shouldAutoExpand({ sessionLaunchCount: counter, dismissed: true })).toBe(false);
    }
  });

  it("returns false for non-positive or non-finite counters", () => {
    expect(shouldAutoExpand({ sessionLaunchCount: 0, dismissed: false })).toBe(false);
    expect(shouldAutoExpand({ sessionLaunchCount: -1, dismissed: false })).toBe(false);
    expect(shouldAutoExpand({ sessionLaunchCount: NaN, dismissed: false })).toBe(false);
    expect(shouldAutoExpand({ sessionLaunchCount: Infinity, dismissed: false })).toBe(false);
  });
});
