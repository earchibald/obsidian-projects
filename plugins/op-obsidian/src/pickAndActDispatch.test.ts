import { describe, it, expect } from "vitest";
import {
  decidePickAndActAction,
  matchesPickAndActQuery,
  shouldIncludeResolved,
  sortPickAndActResults,
  numericIdSuffix,
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

describe("numericIdSuffix", () => {
  it("extracts the trailing number from a hyphenated ID", () => {
    expect(numericIdSuffix("OP-72")).toBe(72);
    expect(numericIdSuffix("PROJ-1")).toBe(1);
  });

  it("returns 0 for IDs with no numeric suffix", () => {
    expect(numericIdSuffix("NOID")).toBe(0);
    expect(numericIdSuffix("")).toBe(0);
  });
});

describe("sortPickAndActResults", () => {
  type Entry = { id: string; resolvedFolder?: boolean };

  const open = (id: string): Entry => ({ id, resolvedFolder: false });
  const resolved = (id: string): Entry => ({ id, resolvedFolder: true });

  it("open issues sort before resolved issues", () => {
    const result = sortPickAndActResults([resolved("OP-1"), open("OP-2")], "");
    expect(result.map((e) => e.id)).toEqual(["OP-2", "OP-1"]);
  });

  it("within each bucket, higher numeric ID sorts first (most recent first)", () => {
    const result = sortPickAndActResults([open("OP-1"), open("OP-3"), open("OP-2")], "");
    expect(result.map((e) => e.id)).toEqual(["OP-3", "OP-2", "OP-1"]);
  });

  it("exact-ID match floats to top above open partial matches", () => {
    // OP-7 is resolved but typed exactly; OP-72 is open (partial match)
    const result = sortPickAndActResults(
      [open("OP-72"), resolved("OP-7")],
      "OP-7",
    );
    expect(result[0].id).toBe("OP-7");
    expect(result[1].id).toBe("OP-72");
  });

  it("exact-ID match (case-insensitive) floats to top", () => {
    const result = sortPickAndActResults(
      [open("OP-72"), resolved("OP-7")],
      "op-7",
    );
    expect(result[0].id).toBe("OP-7");
  });

  it("open exact-ID match still sorts first over other open issues", () => {
    const result = sortPickAndActResults(
      [open("OP-72"), open("OP-7"), open("OP-70")],
      "OP-7",
    );
    expect(result[0].id).toBe("OP-7");
  });

  it("no mutation of the input array (returns a fresh copy)", () => {
    const input = [open("OP-2"), open("OP-1")];
    sortPickAndActResults(input, "");
    expect(input[0].id).toBe("OP-2"); // original order preserved
  });

  it("empty query — open before resolved, descending numeric", () => {
    const result = sortPickAndActResults(
      [resolved("OP-5"), open("OP-3"), open("OP-10")],
      "",
    );
    expect(result.map((e) => e.id)).toEqual(["OP-10", "OP-3", "OP-5"]);
  });
});
