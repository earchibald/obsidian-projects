import { describe, it, expect } from "vitest";

import {
  ITERM_DEFAULTS_DOMAIN,
  ITERM_TMUX_PREF_RECOMMENDATIONS,
  iTermTmuxPrefsNoticeText,
} from "./iTermPrefs";

describe("ITERM_DEFAULTS_DOMAIN", () => {
  it("is the iTerm2 bundle id", () => {
    expect(ITERM_DEFAULTS_DOMAIN).toBe("com.googlecode.iterm2");
  });
});

describe("ITERM_TMUX_PREF_RECOMMENDATIONS", () => {
  it("calls out the four prefs the spec names", () => {
    expect(ITERM_TMUX_PREF_RECOMMENDATIONS).toHaveLength(4);
    const joined = ITERM_TMUX_PREF_RECOMMENDATIONS.join("\n");
    expect(joined).toContain("After a session ends");
    expect(joined).toContain("Close tmux windows after detaching");
    expect(joined).toContain("New tmux windows not created by iTerm2");
    expect(joined).toContain("Disable window position restoration");
  });
});

describe("iTermTmuxPrefsNoticeText", () => {
  it("is plain text (no newlines) so the Notice renderer doesn't choke", () => {
    expect(iTermTmuxPrefsNoticeText()).not.toContain("\n");
  });

  it("numbers each recommendation in order", () => {
    const t = iTermTmuxPrefsNoticeText();
    expect(t).toMatch(/\(1\)/);
    expect(t).toMatch(/\(2\)/);
    expect(t).toMatch(/\(3\)/);
    expect(t).toMatch(/\(4\)/);
  });

  it("starts with the op tip prefix", () => {
    expect(iTermTmuxPrefsNoticeText()).toMatch(/^op: iTerm tmux integration tip/);
  });
});
