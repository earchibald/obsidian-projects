import { describe, it, expect } from "vitest";
import {
  RELATIONS,
  RELATION_NAMES,
  computeApply,
  computeRemove,
  computeMigrate,
  scanDrift,
  validateLinkArgs,
  isRelationName,
} from "./relations";

describe("RELATIONS registry", () => {
  it("declares an inverse for every relation that itself resolves", () => {
    for (const name of RELATION_NAMES) {
      const def = RELATIONS[name];
      expect(RELATIONS[def.inverse]).toBeDefined();
    }
  });

  it("inverse-of-inverse returns to the original (or self for symmetric)", () => {
    for (const name of RELATION_NAMES) {
      const def = RELATIONS[name];
      const inverseDef = RELATIONS[def.inverse];
      expect(inverseDef.inverse).toBe(name);
    }
  });

  it("isList/inverseIsList shapes match between the pair", () => {
    for (const name of RELATION_NAMES) {
      const def = RELATIONS[name];
      const inv = RELATIONS[def.inverse];
      expect(def.inverseIsList).toBe(inv.isList);
      expect(def.isList).toBe(inv.inverseIsList);
    }
  });

  it("isRelationName is a strict guard", () => {
    expect(isRelationName("parent")).toBe(true);
    expect(isRelationName("not_a_relation")).toBe(false);
    expect(isRelationName(undefined)).toBe(false);
    expect(isRelationName(42)).toBe(false);
  });
});

describe("validateLinkArgs", () => {
  it("rejects self-links", () => {
    expect(() =>
      validateLinkArgs({ srcId: "OP-1", dstId: "OP-1", relation: "parent" }),
    ).toThrow(/itself/);
  });

  it("rejects unknown relations", () => {
    expect(() =>
      validateLinkArgs({ srcId: "OP-1", dstId: "OP-2", relation: "blocks" }),
    ).toThrow(/Unknown relation/);
  });

  it("requires non-empty src and dst", () => {
    expect(() =>
      validateLinkArgs({ srcId: "", dstId: "OP-2", relation: "parent" }),
    ).toThrow(/srcId/);
    expect(() =>
      validateLinkArgs({ srcId: "OP-1", dstId: "", relation: "parent" }),
    ).toThrow(/dstId/);
  });
});

describe("computeApply — many-to-one (parent ↔ children)", () => {
  it("sets parent on src and appends to children on dst", () => {
    const res = computeApply({
      srcFm: {},
      dstFm: {},
      srcId: "OP-10",
      dstId: "OP-2",
      relation: "parent",
    });
    expect(res.changed).toBe(true);
    expect(res.srcFmNext.parent).toBe("OP-2");
    expect(res.dstFmNext.children).toEqual(["OP-10"]);
    expect(res.cleanups).toEqual([]);
  });

  it("relation=children mirrors relation=parent (just from the other side)", () => {
    const res = computeApply({
      srcFm: {},
      dstFm: {},
      srcId: "OP-2",
      dstId: "OP-10",
      relation: "children",
    });
    expect(res.changed).toBe(true);
    expect(res.srcFmNext.children).toEqual(["OP-10"]);
    expect(res.dstFmNext.parent).toBe("OP-2");
    expect(res.cleanups).toEqual([]);
  });

  it("idempotent: re-applying an existing parent link is a no-op", () => {
    const res = computeApply({
      srcFm: { parent: "OP-2" },
      dstFm: { children: ["OP-10"] },
      srcId: "OP-10",
      dstId: "OP-2",
      relation: "parent",
    });
    expect(res.changed).toBe(false);
    expect(res.cleanups).toEqual([]);
  });

  it("appends to existing children list without duplicating", () => {
    const res = computeApply({
      srcFm: {},
      dstFm: { children: ["OP-9"] },
      srcId: "OP-10",
      dstId: "OP-2",
      relation: "parent",
    });
    expect(res.dstFmNext.children).toEqual(["OP-9", "OP-10"]);
  });

  it("reparenting emits a cleanup directive for the old parent", () => {
    const res = computeApply({
      srcFm: { parent: "OP-A" },
      dstFm: {},
      srcId: "OP-10",
      dstId: "OP-B",
      relation: "parent",
    });
    expect(res.changed).toBe(true);
    expect(res.srcFmNext.parent).toBe("OP-B");
    expect(res.dstFmNext.children).toEqual(["OP-10"]);
    expect(res.cleanups).toEqual([
      { holderId: "OP-A", field: "children", remove: "OP-10" },
    ]);
  });

  it("reparenting via relation=children emits cleanup for the dst's old parent", () => {
    // op-set-link issue=OP-X relation=children target=OP-Y where OP-Y already
    // had parent=OP-Z. Cleanup: drop OP-Y from OP-Z.children.
    const res = computeApply({
      srcFm: {},
      dstFm: { parent: "OP-Z" },
      srcId: "OP-X",
      dstId: "OP-Y",
      relation: "children",
    });
    expect(res.changed).toBe(true);
    expect(res.dstFmNext.parent).toBe("OP-X");
    expect(res.cleanups).toEqual([
      { holderId: "OP-Z", field: "children", remove: "OP-Y" },
    ]);
  });
});

describe("computeApply — many-to-many (depends_on ↔ depended_on_by)", () => {
  it("appends to both sides", () => {
    const res = computeApply({
      srcFm: {},
      dstFm: {},
      srcId: "OP-1",
      dstId: "OP-2",
      relation: "depends_on",
    });
    expect(res.srcFmNext.depends_on).toEqual(["OP-2"]);
    expect(res.dstFmNext.depended_on_by).toEqual(["OP-1"]);
  });

  it("idempotent for already-linked", () => {
    const res = computeApply({
      srcFm: { depends_on: ["OP-2"] },
      dstFm: { depended_on_by: ["OP-1"] },
      srcId: "OP-1",
      dstId: "OP-2",
      relation: "depends_on",
    });
    expect(res.changed).toBe(false);
  });
});

describe("computeApply — symmetric (related_to ↔ related_to)", () => {
  it("appends to both sides without double-write", () => {
    const res = computeApply({
      srcFm: {},
      dstFm: {},
      srcId: "OP-1",
      dstId: "OP-2",
      relation: "related_to",
    });
    expect(res.srcFmNext.related_to).toEqual(["OP-2"]);
    expect(res.dstFmNext.related_to).toEqual(["OP-1"]);
    expect(res.changed).toBe(true);
  });

  it("idempotent when both sides already list the partner", () => {
    const res = computeApply({
      srcFm: { related_to: ["OP-2"] },
      dstFm: { related_to: ["OP-1"] },
      srcId: "OP-1",
      dstId: "OP-2",
      relation: "related_to",
    });
    expect(res.changed).toBe(false);
  });

  it("repairs a one-sided related_to without oscillating: adding the missing side and re-running is a no-op", () => {
    // X.related_to=[Y] but Y.related_to=[]. Apply src=X dst=Y rel=related_to.
    // Should add X to Y.related_to without removing Y from X.related_to.
    const first = computeApply({
      srcFm: { related_to: ["OP-Y"] },
      dstFm: {},
      srcId: "OP-X",
      dstId: "OP-Y",
      relation: "related_to",
    });
    expect(first.srcFmNext.related_to).toEqual(["OP-Y"]);
    expect(first.dstFmNext.related_to).toEqual(["OP-X"]);

    // Re-running should report no change.
    const second = computeApply({
      srcFm: first.srcFmNext,
      dstFm: first.dstFmNext,
      srcId: "OP-X",
      dstId: "OP-Y",
      relation: "related_to",
    });
    expect(second.changed).toBe(false);
  });
});

describe("computeRemove", () => {
  it("removes the scalar parent and the entry from children, idempotently", () => {
    const res = computeRemove({
      srcFm: { parent: "OP-2" },
      dstFm: { children: ["OP-10", "OP-11"] },
      srcId: "OP-10",
      dstId: "OP-2",
      relation: "parent",
    });
    expect(res.changed).toBe(true);
    expect(res.srcFmNext.parent).toBeUndefined();
    expect(res.dstFmNext.children).toEqual(["OP-11"]);
  });

  it("deletes the children key when emptied", () => {
    const res = computeRemove({
      srcFm: { parent: "OP-2" },
      dstFm: { children: ["OP-10"] },
      srcId: "OP-10",
      dstId: "OP-2",
      relation: "parent",
    });
    expect("children" in res.dstFmNext).toBe(false);
  });

  it("no-op when the link wasn't present", () => {
    const res = computeRemove({
      srcFm: {},
      dstFm: {},
      srcId: "OP-1",
      dstId: "OP-2",
      relation: "depends_on",
    });
    expect(res.changed).toBe(false);
  });

  it("removes both sides for symmetric related_to", () => {
    const res = computeRemove({
      srcFm: { related_to: ["OP-2", "OP-3"] },
      dstFm: { related_to: ["OP-1"] },
      srcId: "OP-1",
      dstId: "OP-2",
      relation: "related_to",
    });
    expect(res.srcFmNext.related_to).toEqual(["OP-3"]);
    expect("related_to" in res.dstFmNext).toBe(false);
  });

  it("rejects self-links", () => {
    expect(() =>
      computeRemove({
        srcFm: {},
        dstFm: {},
        srcId: "OP-1",
        dstId: "OP-1",
        relation: "parent",
      }),
    ).toThrow(/itself/);
  });
});

describe("scanDrift", () => {
  it("returns no drift for fully-mirrored data", () => {
    const issues = new Map<string, Record<string, unknown>>([
      ["OP-1", { parent: "OP-2" }],
      ["OP-2", { children: ["OP-1"] }],
      ["OP-3", { related_to: ["OP-4"] }],
      ["OP-4", { related_to: ["OP-3"] }],
    ]);
    expect(scanDrift(issues)).toEqual([]);
  });

  it("flags missing-inverse on parent → children", () => {
    const issues = new Map<string, Record<string, unknown>>([
      ["OP-1", { parent: "OP-2" }],
      ["OP-2", {}],
    ]);
    expect(scanDrift(issues)).toEqual([
      {
        issueId: "OP-1",
        relation: "parent",
        target: "OP-2",
        problem: "missing-inverse",
      },
    ]);
  });

  it("flags missing-inverse on children → parent", () => {
    const issues = new Map<string, Record<string, unknown>>([
      ["OP-1", {}],
      ["OP-2", { children: ["OP-1"] }],
    ]);
    expect(scanDrift(issues)).toEqual([
      {
        issueId: "OP-2",
        relation: "children",
        target: "OP-1",
        problem: "missing-inverse",
      },
    ]);
  });

  it("flags missing-inverse on symmetric related_to (one-sided)", () => {
    const issues = new Map<string, Record<string, unknown>>([
      ["OP-1", { related_to: ["OP-2"] }],
      ["OP-2", {}],
    ]);
    expect(scanDrift(issues)).toEqual([
      {
        issueId: "OP-1",
        relation: "related_to",
        target: "OP-2",
        problem: "missing-inverse",
      },
    ]);
  });

  it("flags dangling-target when the referenced issue isn't in the snapshot", () => {
    const issues = new Map<string, Record<string, unknown>>([
      ["OP-1", { depends_on: ["OP-99"] }],
    ]);
    expect(scanDrift(issues)).toEqual([
      {
        issueId: "OP-1",
        relation: "depends_on",
        target: "OP-99",
        problem: "dangling-target",
      },
    ]);
  });

  it("includes resolved-folder issues — a parent→child link must remain valid after the child resolves", () => {
    // Caller is expected to populate the snapshot with both folders. scanDrift
    // doesn't care about location — only about id presence — so resolved
    // issues round-trip naturally.
    const issues = new Map<string, Record<string, unknown>>([
      ["OP-1", { parent: "OP-92" }],
      ["OP-92", { children: ["OP-1"] }],
    ]);
    expect(scanDrift(issues)).toEqual([]);
  });
});

describe("computeMigrate", () => {
  it("rewrites parent_issue → parent and removes the old key", () => {
    const res = computeMigrate({ parent_issue: "OP-92" });
    expect(res.changed).toBe(true);
    expect(res.fmNext).toEqual({ parent: "OP-92" });
    expect(res.diff).toContain("parent_issue → parent (OP-92)");
  });

  it("rewrites subissues → children and removes the old key", () => {
    const res = computeMigrate({ subissues: ["OP-95", "OP-97"] });
    expect(res.changed).toBe(true);
    expect(res.fmNext).toEqual({ children: ["OP-95", "OP-97"] });
  });

  it("handles both keys at once", () => {
    const res = computeMigrate({
      parent_issue: "OP-92",
      subissues: ["OP-95"],
      other: "untouched",
    });
    expect(res.fmNext).toEqual({
      parent: "OP-92",
      children: ["OP-95"],
      other: "untouched",
    });
  });

  it("idempotent: a fm without interim keys returns changed: false", () => {
    const res = computeMigrate({ parent: "OP-92", children: ["OP-95"] });
    expect(res.changed).toBe(false);
    expect(res.diff).toEqual([]);
  });

  it("re-running on already-migrated fm is a no-op", () => {
    const first = computeMigrate({
      parent_issue: "OP-92",
      subissues: ["OP-95"],
    });
    const second = computeMigrate(first.fmNext);
    expect(second.changed).toBe(false);
    expect(second.fmNext).toEqual(first.fmNext);
  });

  it("conflict: keeps canonical parent when both keys are set", () => {
    const res = computeMigrate({
      parent_issue: "OP-OLD",
      parent: "OP-NEW",
    });
    expect(res.fmNext.parent).toBe("OP-NEW");
    expect("parent_issue" in res.fmNext).toBe(false);
    expect(res.diff[0]).toMatch(/parent already set/);
  });

  it("conflict: union-merges children when both keys overlap", () => {
    const res = computeMigrate({
      subissues: ["OP-95", "OP-97"],
      children: ["OP-95", "OP-99"],
    });
    expect(res.fmNext.children).toEqual(["OP-95", "OP-99", "OP-97"]);
    expect("subissues" in res.fmNext).toBe(false);
  });

  it("does not mutate the input fm", () => {
    const input = { parent_issue: "OP-92", subissues: ["OP-95"] };
    const snapshot = JSON.parse(JSON.stringify(input));
    computeMigrate(input);
    expect(input).toEqual(snapshot);
  });
});

describe("computeApply round-trip", () => {
  it("apply then remove returns to the original state", () => {
    const srcFm = {};
    const dstFm = {};
    const applied = computeApply({
      srcFm,
      dstFm,
      srcId: "OP-1",
      dstId: "OP-2",
      relation: "depends_on",
    });
    const removed = computeRemove({
      srcFm: applied.srcFmNext,
      dstFm: applied.dstFmNext,
      srcId: "OP-1",
      dstId: "OP-2",
      relation: "depends_on",
    });
    expect(removed.srcFmNext).toEqual({});
    expect(removed.dstFmNext).toEqual({});
  });

  it("does not mutate input frontmatter records", () => {
    const srcFm = { other: "x" };
    const dstFm = { other: "y", children: ["OP-9"] };
    const srcSnapshot = JSON.parse(JSON.stringify(srcFm));
    const dstSnapshot = JSON.parse(JSON.stringify(dstFm));
    computeApply({
      srcFm,
      dstFm,
      srcId: "OP-10",
      dstId: "OP-2",
      relation: "parent",
    });
    expect(srcFm).toEqual(srcSnapshot);
    expect(dstFm).toEqual(dstSnapshot);
  });
});
