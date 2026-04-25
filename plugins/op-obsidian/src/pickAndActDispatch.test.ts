import { describe, it, expect } from "vitest";
import {
  decidePickAndActAction,
  matchesPickAndActQuery,
  shouldIncludeResolved,
} from "./pickAndActDispatch";

describe("decidePickAndActAction (macOS)", () => {
  const mac = (evt: Parameters<typeof decidePickAndActAction>[0]) =>
    decidePickAndActAction(evt, true);

  it("no modifiers → open", () => {
    expect(mac({})).toBe("open");
  });

  it("metaKey → launch", () => {
    expect(mac({ metaKey: true })).toBe("launch");
  });

  it("altKey → plan", () => {
    expect(mac({ altKey: true })).toBe("plan");
  });

  it("shiftKey → resolve", () => {
    expect(mac({ shiftKey: true })).toBe("resolve");
  });

  it("ctrlKey alone → commit (raw Ctrl on macOS)", () => {
    expect(mac({ ctrlKey: true })).toBe("commit");
  });

  it("metaKey + shiftKey → launch (Cmd wins over Shift)", () => {
    expect(mac({ metaKey: true, shiftKey: true })).toBe("launch");
  });
});

describe("decidePickAndActAction (non-macOS)", () => {
  const lin = (evt: Parameters<typeof decidePickAndActAction>[0]) =>
    decidePickAndActAction(evt, false);

  it("no modifiers → open", () => {
    expect(lin({})).toBe("open");
  });

  it("ctrlKey → launch (Ctrl plays the Cmd role)", () => {
    expect(lin({ ctrlKey: true })).toBe("launch");
  });

  it("altKey → plan", () => {
    expect(lin({ altKey: true })).toBe("plan");
  });

  it("shiftKey → resolve", () => {
    expect(lin({ shiftKey: true })).toBe("resolve");
  });

  it("ctrlKey + altKey → commit (deliberate two-modifier combo)", () => {
    expect(lin({ ctrlKey: true, altKey: true })).toBe("commit");
  });
});

describe("matchesPickAndActQuery", () => {
  const hay = "OP-72 fix link escaping in markdown render obsidian-projects";

  it("matches an empty query", () => {
    expect(matchesPickAndActQuery(hay, "")).toBe(true);
    expect(matchesPickAndActQuery(hay, "   ")).toBe(true);
  });

  it("matches a single token case-insensitively", () => {
    expect(matchesPickAndActQuery(hay, "LINK")).toBe(true);
    expect(matchesPickAndActQuery(hay, "OP-72")).toBe(true);
  });

  it("requires every whitespace-separated token to appear", () => {
    expect(matchesPickAndActQuery(hay, "link escaping")).toBe(true);
    expect(matchesPickAndActQuery(hay, "link banana")).toBe(false);
  });

  it("returns false when no tokens hit", () => {
    expect(matchesPickAndActQuery(hay, "graphql")).toBe(false);
  });
});

describe("shouldIncludeResolved", () => {
  it("includes when query exactly matches the issue id (case-insensitive)", () => {
    expect(shouldIncludeResolved("OP-72", "OP-72")).toBe(true);
    expect(shouldIncludeResolved("op-72", "OP-72")).toBe(true);
    expect(shouldIncludeResolved("  OP-72  ", "OP-72")).toBe(true);
  });

  it("does not include on partial id matches", () => {
    expect(shouldIncludeResolved("OP-7", "OP-72")).toBe(false);
    expect(shouldIncludeResolved("link", "OP-72")).toBe(false);
  });
});
