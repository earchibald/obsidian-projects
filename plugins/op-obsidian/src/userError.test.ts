import { describe, it, expect, vi } from "vitest";

vi.mock("obsidian", () => ({ Notice: vi.fn() }));

import { formatUserError, userError } from "./userError";
import { Notice } from "obsidian";

describe("formatUserError", () => {
  it("returns message alone when no hint", () => {
    expect(formatUserError("boom")).toBe("boom");
  });

  it("joins message and hint with arrow prefix", () => {
    expect(formatUserError("boom", "fix it")).toBe("boom\n→ fix it");
  });

  it("trims whitespace", () => {
    expect(formatUserError("  boom  ", "  fix  ")).toBe("boom\n→ fix");
  });

  it("treats empty hint as absent", () => {
    expect(formatUserError("boom", "   ")).toBe("boom");
  });
});

describe("userError", () => {
  it("fires an Obsidian Notice with the composed text", () => {
    vi.mocked(Notice).mockClear();
    const text = userError("boom", "fix it");
    expect(text).toBe("boom\n→ fix it");
    expect(Notice).toHaveBeenCalledWith("boom\n→ fix it", 12000);
  });

  it("uses a shorter timeout when no hint is given", () => {
    vi.mocked(Notice).mockClear();
    userError("boom");
    expect(Notice).toHaveBeenCalledWith("boom", 8000);
  });
});
