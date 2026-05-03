import { describe, it, expect } from "vitest";
import { appendTaskBody } from "./taskAppendNotePure";

const FM = `---
id: OP-255.1
type: task
status: pending
op_managed: true
---
`;

describe("appendTaskBody", () => {
  it("appends to existing body with blank-line separator", () => {
    const text = `${FM}\n# Task\n\nFirst step done.\n`;
    const { next, appended } = appendTaskBody(text, "Second step in progress.");
    expect(appended).toBe(true);
    expect(next).toContain("First step done.\n\nSecond step in progress.\n");
  });
  it("creates body when empty", () => {
    const text = FM;
    const { next, appended } = appendTaskBody(text, "first note");
    expect(appended).toBe(false);
    expect(next).toBe(`${FM}first note\n`);
  });
  it("normalizes CRLF and trailing whitespace", () => {
    const text = `${FM}\n# T\n`;
    const { next } = appendTaskBody(text, "a\r\nb\n  ");
    expect(next.endsWith("a\nb\n")).toBe(true);
  });
  it("rejects empty payload", () => {
    expect(() => appendTaskBody(FM, "   \n  ")).toThrow(/payload is empty/);
  });
});
