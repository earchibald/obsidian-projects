import { describe, it, expect } from "vitest";
import {
  nextTaskNumber,
  renderTaskNote,
  validateExplicitTaskId,
} from "./taskCreatePure";

describe("nextTaskNumber", () => {
  it("returns 1 when none exist", () => {
    expect(nextTaskNumber("OP-255", [])).toBe(1);
  });
  it("fills the lowest gap", () => {
    expect(nextTaskNumber("OP-255", ["OP-255.1", "OP-255.3"])).toBe(2);
  });
  it("skips ids for other issues", () => {
    expect(nextTaskNumber("OP-255", ["OP-1.1", "OP-1.2", "OP-255.1"])).toBe(2);
  });
  it("ignores malformed ids", () => {
    expect(nextTaskNumber("OP-255", ["OP-255.abc", "OP-255.01", "OP-255.2"])).toBe(1);
  });
});

describe("validateExplicitTaskId", () => {
  it("accepts well-formed unused id", () => {
    expect(validateExplicitTaskId("OP-255", "OP-255.5", ["OP-255.1"])).toEqual({
      ok: true,
      taskId: "OP-255.5",
    });
  });
  it("rejects shape mismatch", () => {
    const r = validateExplicitTaskId("OP-255", "OP-255-5", []);
    expect(r.ok).toBe(false);
  });
  it("rejects prefix mismatch", () => {
    const r = validateExplicitTaskId("OP-255", "OP-1.1", []);
    expect(r.ok).toBe(false);
  });
  it("rejects collisions", () => {
    const r = validateExplicitTaskId("OP-255", "OP-255.1", ["OP-255.1"]);
    expect(r.ok).toBe(false);
  });
});

describe("renderTaskNote", () => {
  it("emits op_managed and issueLink", () => {
    const out = renderTaskNote({
      taskId: "OP-255.2",
      issueId: "OP-255",
      issueBasename: "OP-255 thing",
      project: "obsidian-projects",
      title: "Implement audit log",
    });
    expect(out).toContain("op_managed: true");
    expect(out).toContain('issue: "[[OP-255 thing]]"');
    expect(out).toContain("status: pending");
    expect(out).toContain("# Implement audit log");
  });
  it("renders body when provided", () => {
    const out = renderTaskNote(
      {
        taskId: "OP-255.2",
        issueId: "OP-255",
        issueBasename: "x",
        project: "p",
        title: "T",
      },
      "extra context",
    );
    expect(out).toContain("# T\n\nextra context\n");
  });
  it("honors caller status override", () => {
    const out = renderTaskNote({
      taskId: "OP-255.2",
      issueId: "OP-255",
      issueBasename: "x",
      project: "p",
      title: "T",
      status: "in-progress",
    });
    expect(out).toContain("status: in-progress");
  });
});
