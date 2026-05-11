import { describe, expect, it, vi } from "vitest";
import {
  AgentDetector,
  refreshAgentDetection,
  type DetectionMap,
} from "./agentDetect";

function detectionMap(binary = "copilot"): DetectionMap {
  return {
    claude: { id: "claude", installed: true, path: "/tmp/claude", binary: "claude" },
    gemini: { id: "gemini", installed: false, binary: "gemini" },
    copilot: { id: "copilot", installed: true, path: `/tmp/${binary}`, binary },
  };
}

describe("refreshAgentDetection", () => {
  it("clears cached detection before re-probing", async () => {
    const detector = new AgentDetector((id) => id);
    (detector as unknown as { cache?: DetectionMap }).cache = detectionMap("stale");
    const refreshSpy = vi.spyOn(detector, "refresh").mockImplementation(async () => {
      expect(detector.get()).toBeUndefined();
      return detectionMap("fresh");
    });

    await expect(refreshAgentDetection(detector)).resolves.toEqual(detectionMap("fresh"));
    expect(refreshSpy).toHaveBeenCalledOnce();
  });

  it("returns the freshly probed detection map", async () => {
    const detector = new AgentDetector((id) => id);
    const fresh = detectionMap("fresh");
    vi.spyOn(detector, "refresh").mockResolvedValue(fresh);

    await expect(refreshAgentDetection(detector)).resolves.toBe(fresh);
  });
});
