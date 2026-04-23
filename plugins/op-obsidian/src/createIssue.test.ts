import { describe, it, expect } from "vitest";
import {
  renderIssueNote,
  PLAN_PLACEHOLDER,
  NOTES_PLACEHOLDER,
  SUMMARY_PLACEHOLDER,
} from "./issueTemplate";

function render(overrides: Partial<Parameters<typeof renderIssueNote>[0]> = {}) {
  return renderIssueNote({
    id: "OP-1",
    project: "demo",
    title: "Test",
    priority: "med",
    scope: [],
    assignee: "me",
    ...overrides,
  });
}

describe("renderIssueNote", () => {
  it("emits all sections with placeholders (no scope bullets — Scope header still present)", () => {
    const out = render();
    expect(out).toContain("\n## Scope\n");
    expect(out).toContain("\n## Plan\n");
    expect(out).toContain("\n## Tasks\n");
    expect(out).toContain("\n## Notes\n");
    expect(out).toContain("\n## Summary\n");
    expect(out).toContain(PLAN_PLACEHOLDER);
    expect(out).toContain(NOTES_PLACEHOLDER);
    expect(out).toContain(SUMMARY_PLACEHOLDER);
    expect(out).not.toContain("- [ ]");
  });

  it("includes Scope when bullets supplied", () => {
    const out = render({ scope: ["one", "two"] });
    expect(out).toContain("\n## Scope\n");
    expect(out).toContain("- [ ] one");
    expect(out).toContain("- [ ] two");
  });

  it("heading order is Scope → Plan → Tasks → Notes → Summary", () => {
    const out = render({ scope: ["a"] });
    const body = out.slice(out.indexOf("# Test"));
    const order = ["## Scope", "## Plan", "## Tasks", "## Notes", "## Summary"].map((h) =>
      body.indexOf(h),
    );
    expect(order.every((i) => i >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("exact placeholder strings match the module constants", () => {
    expect(PLAN_PLACEHOLDER).toBe(
      "_To be written at /op:issue time — approach, key decisions, files to touch._",
    );
    expect(NOTES_PLACEHOLDER).toBe(
      "_Filled as work progresses; one ### <ID>.<N> block per task._",
    );
    expect(SUMMARY_PLACEHOLDER).toBe(
      "_Written at /op:resolve time — what shipped, key commits, follow-ups._",
    );
  });

  it("Plan/Notes/Summary appear even when no scope is supplied", () => {
    const out = render({ scope: [] });
    const planIdx = out.indexOf("## Plan");
    const tasksIdx = out.indexOf("## Tasks");
    const notesIdx = out.indexOf("## Notes");
    const summaryIdx = out.indexOf("## Summary");
    expect(planIdx).toBeGreaterThan(0);
    expect(tasksIdx).toBeGreaterThan(planIdx);
    expect(notesIdx).toBeGreaterThan(tasksIdx);
    expect(summaryIdx).toBeGreaterThan(notesIdx);
  });
});
