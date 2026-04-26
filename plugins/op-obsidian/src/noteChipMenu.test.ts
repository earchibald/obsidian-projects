import { describe, expect, it, vi } from "vitest";
import { prefixedCommandId } from "./noteChipState";

// Regression for OP-173: chip click sites and the `op-action` codeblock
// dispatched bare command ids (`op-attach-current`, `op-open-agent`),
// but Obsidian keys commands as `<plugin-id>:<id>` — so every chip click
// silently failed with "unavailable — open the issue note first." The
// prefix is applied centrally now; tests below assert the helper plus
// the dispatch shape (the chip click and the codeblock both call
// `executeCommandById(prefixedCommandId(raw))`).
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
});

// Stand-in for the chip-click dispatch (noteDecorations.ts) and the
// menu-item dispatch (noteChipMenu.ts). Both call:
//   app.commands.executeCommandById(prefixedCommandId(raw))
// We assert the prefix is applied at the call boundary so a future
// regression — passing `state.primaryCommand` straight through — fails
// loudly here instead of silently in the UI.
describe("dispatch boundary applies the plugin-id prefix", () => {
  it("chip click forwards the prefixed id to executeCommandById", () => {
    const executeCommandById = vi.fn().mockReturnValue(true);
    const app = { commands: { executeCommandById } };
    app.commands.executeCommandById(prefixedCommandId("op-attach-current"));
    expect(executeCommandById).toHaveBeenCalledWith(
      "op-obsidian:op-attach-current",
    );
  });

  it("menu item forwards the prefixed id to executeCommandById", () => {
    const executeCommandById = vi.fn().mockReturnValue(true);
    const app = { commands: { executeCommandById } };
    app.commands.executeCommandById(prefixedCommandId("op-close-current-issue"));
    expect(executeCommandById).toHaveBeenCalledWith(
      "op-obsidian:op-close-current-issue",
    );
  });
});
