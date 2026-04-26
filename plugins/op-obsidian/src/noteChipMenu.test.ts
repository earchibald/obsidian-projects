import { describe, expect, it, vi } from "vitest";

vi.mock("obsidian", () => ({
  App: class {},
  Menu: class {
    addItem() { return this; }
    showAtMouseEvent() {}
  },
}));

import { prefixedCommandId, dispatchCommand } from "./noteChipMenu";

// Regression for OP-173: chip click sites and the `op-action` codeblock
// dispatched bare command ids (`op-attach-current`, `op-open-agent`),
// but Obsidian keys commands as `<plugin-id>:<id>` — so every chip click
// silently failed with "unavailable — open the issue note first." The
// prefix is applied centrally now via `dispatchCommand`; tests below assert
// the helper plus the dispatch shape.
describe("prefixedCommandId", () => {
  it("prepends op-obsidian: to a bare command id", () => {
    expect(prefixedCommandId("op-attach-current")).toBe(
      "op-obsidian:op-attach-current",
    );
    expect(prefixedCommandId("op-open-agent")).toBe("op-obsidian:op-open-agent");
  });

  it("leaves an already-prefixed id alone (idempotent)", () => {
    expect(prefixedCommandId("op-obsidian:op-attach-current")).toBe(
      "op-obsidian:op-attach-current",
    );
  });

  it("passes a foreign-plugin id through unchanged", () => {
    expect(prefixedCommandId("workspace:open-file")).toBe(
      "workspace:open-file",
    );
  });

  // Edge cases: all pass through or get prefixed per the contains-colon rule.
  // None crash; Obsidian's executeCommandById will return false for
  // unrecognised ids, which the !ok guard handles gracefully.
  it("empty string gets prefixed (harmless: executeCommandById returns false)", () => {
    expect(prefixedCommandId("")).toBe("op-obsidian:");
  });

  it("leading-colon id passes through unchanged (already has ':')", () => {
    expect(prefixedCommandId(":op-foo")).toBe(":op-foo");
  });

  it("multi-colon id passes through unchanged (treated as foreign-plugin id)", () => {
    expect(prefixedCommandId("op-foo:bar:baz")).toBe("op-foo:bar:baz");
  });

  it("bare colon passes through unchanged", () => {
    expect(prefixedCommandId(":")).toBe(":");
  });

  it("whitespace-only string gets prefixed (no colon present)", () => {
    expect(prefixedCommandId("  ")).toBe("op-obsidian:  ");
  });
});

// `dispatchCommand` is the single gateway to `executeCommandById`. Every
// dispatch site should call this — never the raw pattern — so a future
// fourth site that forgets the prefix is caught here.
describe("dispatchCommand applies prefix before calling executeCommandById", () => {
  it("forwards the prefixed id when given a bare command id", () => {
    const executeCommandById = vi.fn().mockReturnValue(true);
    const app = { commands: { executeCommandById } } as any;
    dispatchCommand(app, "op-attach-current");
    expect(executeCommandById).toHaveBeenCalledWith(
      "op-obsidian:op-attach-current",
    );
  });

  it("is idempotent — already-prefixed id is not double-prefixed", () => {
    const executeCommandById = vi.fn().mockReturnValue(true);
    const app = { commands: { executeCommandById } } as any;
    dispatchCommand(app, "op-obsidian:op-attach-current");
    expect(executeCommandById).toHaveBeenCalledWith(
      "op-obsidian:op-attach-current",
    );
  });

  it("returns true when executeCommandById succeeds", () => {
    const app = { commands: { executeCommandById: vi.fn().mockReturnValue(true) } } as any;
    expect(dispatchCommand(app, "op-attach-current")).toBe(true);
  });

  it("returns false when executeCommandById declines", () => {
    const app = { commands: { executeCommandById: vi.fn().mockReturnValue(false) } } as any;
    expect(dispatchCommand(app, "op-attach-current")).toBe(false);
  });
});
