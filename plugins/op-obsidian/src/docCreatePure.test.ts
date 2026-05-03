import { describe, it, expect } from "vitest";
import { isDocType, renderDocNote } from "./docCreatePure";

describe("isDocType", () => {
  it("accepts plan/spec/adr/runbook", () => {
    expect(isDocType("plan")).toBe(true);
    expect(isDocType("spec")).toBe(true);
    expect(isDocType("adr")).toBe(true);
    expect(isDocType("runbook")).toBe(true);
  });
  it("rejects others", () => {
    expect(isDocType("note")).toBe(false);
    expect(isDocType("")).toBe(false);
  });
});

describe("renderDocNote", () => {
  it("emits op_managed and doc_type", () => {
    const out = renderDocNote({
      project: "obsidian-projects",
      docType: "plan",
      title: "Phase 1 plan",
    });
    expect(out).toContain("op_managed: true");
    expect(out).toContain("doc_type: plan");
    expect(out).toContain('title: "Phase 1 plan"');
    expect(out).toContain("# Phase 1 plan");
    expect(out).toContain("- doc/plan");
  });
  it("renders body when provided", () => {
    const out = renderDocNote({
      project: "p",
      docType: "spec",
      title: "T",
      body: "intro paragraph",
    });
    expect(out).toContain("# T\n\nintro paragraph\n");
  });
});
