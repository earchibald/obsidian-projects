import { describe, it, expect } from "vitest";
import {
  AUDIT_LOG_PATH,
  AUDIT_ROTATE_BYTES,
  encodeAuditLine,
  rotationPlan,
  shouldRotate,
} from "./auditLogPure";

describe("encodeAuditLine", () => {
  it("emits a single trailing newline", () => {
    const line = encodeAuditLine({ ts: "2026-05-02T00:00:00.000Z", cmd: "op-work" });
    expect(line.endsWith("\n")).toBe(true);
    expect(line.split("\n").filter((s) => s.length > 0)).toHaveLength(1);
  });

  it("orders keys alphabetically for greppable diffs", () => {
    const line = encodeAuditLine({
      ts: "2026-05-02T00:00:00.000Z",
      cmd: "op-set-section",
      issue: "OP-1",
      paths: ["a"],
      section: "Plan",
    });
    expect(line).toBe(
      `{"cmd":"op-set-section","issue":"OP-1","paths":["a"],"section":"Plan","ts":"2026-05-02T00:00:00.000Z"}\n`,
    );
  });

  it("drops undefined values", () => {
    const line = encodeAuditLine({
      ts: "2026-05-02T00:00:00.000Z",
      cmd: "op-work",
      issue: undefined,
    });
    expect(line).toBe(`{"cmd":"op-work","ts":"2026-05-02T00:00:00.000Z"}\n`);
  });

  it("encodes bypass lines", () => {
    const line = encodeAuditLine({
      ts: "2026-05-02T00:00:00.000Z",
      cmd: "bypass",
      paths: ["Projects/foo/ISSUES/X-1.md"],
      bypass: true,
    });
    expect(line).toContain(`"bypass":true`);
  });
});

describe("shouldRotate", () => {
  it("rotates when current+line exceeds threshold", () => {
    expect(shouldRotate(AUDIT_ROTATE_BYTES, 1)).toBe(true);
    expect(shouldRotate(AUDIT_ROTATE_BYTES - 5, 10)).toBe(true);
  });
  it("does not rotate when sum stays at or under threshold", () => {
    expect(shouldRotate(AUDIT_ROTATE_BYTES - 100, 99)).toBe(false);
    expect(shouldRotate(AUDIT_ROTATE_BYTES - 100, 100)).toBe(false);
  });
});

describe("rotationPlan", () => {
  it("returns ordered rename pairs (oldest-first cascade up)", () => {
    const plan = rotationPlan(AUDIT_LOG_PATH, 5);
    expect(plan).toEqual([
      ["Projects/_scratch/op-audit-4.jsonl", "Projects/_scratch/op-audit-5.jsonl"],
      ["Projects/_scratch/op-audit-3.jsonl", "Projects/_scratch/op-audit-4.jsonl"],
      ["Projects/_scratch/op-audit-2.jsonl", "Projects/_scratch/op-audit-3.jsonl"],
      ["Projects/_scratch/op-audit-1.jsonl", "Projects/_scratch/op-audit-2.jsonl"],
      ["Projects/_scratch/op-audit.jsonl", "Projects/_scratch/op-audit-1.jsonl"],
    ]);
  });

  it("respects maxBackups", () => {
    const plan = rotationPlan(AUDIT_LOG_PATH, 2);
    expect(plan).toEqual([
      ["Projects/_scratch/op-audit-1.jsonl", "Projects/_scratch/op-audit-2.jsonl"],
      ["Projects/_scratch/op-audit.jsonl", "Projects/_scratch/op-audit-1.jsonl"],
    ]);
  });
});
