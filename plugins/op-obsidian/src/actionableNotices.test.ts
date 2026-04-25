import { describe, it, expect, vi } from "vitest";

vi.mock("obsidian", () => ({
  Notice: class {
    constructor(_msg: unknown, _duration?: number) {}
    hide(): void {}
  },
}));

import { durationForActions, type NoticeAction } from "./actionableNotices";

const a: NoticeAction = { label: "Open", onClick: () => {} };

describe("durationForActions", () => {
  it("returns 0 (sticky) when actions are present", () => {
    expect(durationForActions([a])).toBe(0);
    expect(durationForActions([a, a])).toBe(0);
  });

  it("returns 5000 when no actions are present", () => {
    expect(durationForActions([])).toBe(5000);
  });

  it("honours an explicit duration override", () => {
    expect(durationForActions([], 1234)).toBe(1234);
    expect(durationForActions([a], 7777)).toBe(7777);
    expect(durationForActions([a], 0)).toBe(0);
  });
});
