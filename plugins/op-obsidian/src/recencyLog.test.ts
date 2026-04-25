import { describe, it, expect } from "vitest";
import {
  RECENCY_CAP,
  appendRecency,
  mostRecent,
  relativeTime,
  sanitizeRecency,
} from "./recencyLog";

describe("sanitizeRecency", () => {
  it("returns [] for non-array inputs", () => {
    expect(sanitizeRecency(null)).toEqual([]);
    expect(sanitizeRecency(undefined)).toEqual([]);
    expect(sanitizeRecency({})).toEqual([]);
    expect(sanitizeRecency("garbage")).toEqual([]);
    expect(sanitizeRecency(42)).toEqual([]);
  });

  it("drops malformed entries silently", () => {
    expect(sanitizeRecency([1, 2, 3])).toEqual([]);
    expect(sanitizeRecency([{ id: "OP-1" }])).toEqual([]);
    expect(sanitizeRecency([{ at: "2026-04-25T00:00:00Z" }])).toEqual([]);
    expect(sanitizeRecency([{ id: "", at: "2026-04-25T00:00:00Z" }])).toEqual([]);
  });

  it("keeps shape-valid entries in input order", () => {
    const log = [
      { id: "OP-1", at: "2026-04-25T10:00:00Z" },
      { id: "OP-2", at: "2026-04-25T09:00:00Z" },
    ];
    expect(sanitizeRecency(log)).toEqual(log);
  });

  it("dedupes by id, keeping the first occurrence", () => {
    const log = [
      { id: "OP-1", at: "2026-04-25T10:00:00Z" },
      { id: "OP-1", at: "2026-04-25T08:00:00Z" },
    ];
    expect(sanitizeRecency(log)).toEqual([log[0]]);
  });

  it("caps reads to RECENCY_CAP entries", () => {
    const log = Array.from({ length: RECENCY_CAP + 5 }, (_, i) => ({
      id: `OP-${i}`,
      at: "2026-04-25T00:00:00Z",
    }));
    expect(sanitizeRecency(log)).toHaveLength(RECENCY_CAP);
  });
});

describe("appendRecency", () => {
  it("prepends a fresh id", () => {
    const log = [{ id: "OP-2", at: "old" }];
    expect(appendRecency(log, "OP-1", "new")).toEqual([
      { id: "OP-1", at: "new" },
      { id: "OP-2", at: "old" },
    ]);
  });

  it("moves an existing id to the head with the new timestamp", () => {
    const log = [
      { id: "OP-1", at: "old1" },
      { id: "OP-2", at: "old2" },
      { id: "OP-3", at: "old3" },
    ];
    expect(appendRecency(log, "OP-2", "new2")).toEqual([
      { id: "OP-2", at: "new2" },
      { id: "OP-1", at: "old1" },
      { id: "OP-3", at: "old3" },
    ]);
  });

  it("caps the result at RECENCY_CAP", () => {
    const log = Array.from({ length: RECENCY_CAP }, (_, i) => ({
      id: `OP-${i}`,
      at: "old",
    }));
    const next = appendRecency(log, "OP-NEW", "new");
    expect(next).toHaveLength(RECENCY_CAP);
    expect(next[0]).toEqual({ id: "OP-NEW", at: "new" });
    expect(next[next.length - 1].id).toBe(`OP-${RECENCY_CAP - 2}`);
  });

  it("respects a custom cap", () => {
    const log = [
      { id: "A", at: "1" },
      { id: "B", at: "2" },
    ];
    expect(appendRecency(log, "C", "3", 2)).toEqual([
      { id: "C", at: "3" },
      { id: "A", at: "1" },
    ]);
  });

  it("ignores empty id (defensive)", () => {
    const log = [{ id: "OP-1", at: "x" }];
    expect(appendRecency(log, "", "y")).toEqual(log);
  });
});

describe("mostRecent", () => {
  it("returns the head of a non-empty log", () => {
    const log = [{ id: "OP-1", at: "x" }, { id: "OP-2", at: "y" }];
    expect(mostRecent(log)).toEqual({ id: "OP-1", at: "x" });
  });
  it("returns undefined for an empty log", () => {
    expect(mostRecent([])).toBeUndefined();
  });
});

describe("relativeTime", () => {
  const now = new Date("2026-04-25T12:00:00Z");
  it("renders just-now / minutes / hours / days", () => {
    expect(relativeTime("2026-04-25T11:59:30Z", now)).toBe("just now");
    expect(relativeTime("2026-04-25T11:55:00Z", now)).toBe("5m ago");
    expect(relativeTime("2026-04-25T09:00:00Z", now)).toBe("3h ago");
    expect(relativeTime("2026-04-22T12:00:00Z", now)).toBe("3d ago");
  });
  it("falls back to a date stamp for older entries", () => {
    expect(relativeTime("2026-01-01T00:00:00Z", now)).toBe("2026-01-01");
  });
  it("returns empty string for unparseable input", () => {
    expect(relativeTime("garbage", now)).toBe("");
  });
});
