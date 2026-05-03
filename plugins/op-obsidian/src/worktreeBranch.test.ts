import { describe, expect, it } from "vitest";
import { worktreeBranchName } from "./worktreeBranch";

describe("worktreeBranchName", () => {
  it("appends a kebab-cased slug derived from the title", () => {
    expect(worktreeBranchName("OP-220", "Add slug plugin var and extract shared slugify util")).toBe(
      "worktree-OP-220-add-slug-plugin-var-and-extract-shared",
    );
  });

  it("strips a leading `NN[a-z]?:` task prefix from the title (matches {{slug}} preset)", () => {
    expect(
      worktreeBranchName("OP-194", "10b: Authoring tutorials with checked-in examples"),
    ).toBe("worktree-OP-194-authoring-tutorials-with-checked-in");
  });

  it("falls back to bare `worktree-<id>` (no trailing dash) when title is all punctuation", () => {
    expect(worktreeBranchName("OP-1", "???")).toBe("worktree-OP-1");
  });

  it("falls back to bare `worktree-<id>` for whitespace-only titles", () => {
    expect(worktreeBranchName("OP-1", "   ")).toBe("worktree-OP-1");
  });

  it("falls back to bare `worktree-<id>` for empty-string titles", () => {
    expect(worktreeBranchName("OP-1", "")).toBe("worktree-OP-1");
  });

  it("falls back to bare `worktree-<id>` when title is undefined", () => {
    expect(worktreeBranchName("OP-1", undefined)).toBe("worktree-OP-1");
  });

  it("caps the slug tail at 40 chars on a `-` boundary (inherits from {{slug}} preset)", () => {
    expect(
      worktreeBranchName("OP-9", "Add slug plugin var and extract shared slugify util and other goodies"),
    ).toBe("worktree-OP-9-add-slug-plugin-var-and-extract-shared");
  });

  it("flat-truncates when the first `-` boundary would land beyond the 40-char cap", () => {
    expect(worktreeBranchName("OP-9", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")).toBe(
      "worktree-OP-9-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
  });
});
