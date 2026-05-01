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
  it("returns 10_000 when actions are present", () => {
    expect(durationForActions([a])).toBe(10_000);
    expect(durationForActions([a, a])).toBe(10_000);
  });

  it("returns 10_000 when no actions are present", () => {
    expect(durationForActions([])).toBe(10_000);
  });

  it("honours an explicit duration override", () => {
    expect(durationForActions([], 1234)).toBe(1234);
    expect(durationForActions([a], 7777)).toBe(7777);
    expect(durationForActions([a], 0)).toBe(0);
  });
});
