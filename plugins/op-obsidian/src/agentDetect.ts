import { execFile } from "child_process";
import { promisify } from "util";
import { AGENT_IDS, type AgentId } from "./agentProfiles";

const pExecFile = promisify(execFile);

export interface AgentDetection {
  id: AgentId;
  installed: boolean;
  path?: string;
  binary: string;
}

export type DetectionMap = Record<AgentId, AgentDetection>;

export class AgentDetector {
  private cache: DetectionMap | undefined;
  private inflight: Promise<DetectionMap> | undefined;

  constructor(private binaryFor: (id: AgentId) => string) {}

  get(): DetectionMap | undefined {
    return this.cache;
  }

  async refresh(): Promise<DetectionMap> {
    if (this.inflight) return this.inflight;
    this.inflight = this.probe();
    try {
      const result = await this.inflight;
      this.cache = result;
      return result;
    } finally {
      this.inflight = undefined;
    }
  }

  invalidate(): void {
    this.cache = undefined;
  }

  private async probe(): Promise<DetectionMap> {
    const out = {} as DetectionMap;
    await Promise.all(
      AGENT_IDS.map(async (id) => {
        const binary = this.binaryFor(id);
        out[id] = await probeBinary(id, binary);
      }),
    );
    return out;
  }
}

async function probeBinary(id: AgentId, binary: string): Promise<AgentDetection> {
  // If the configured binary is an absolute path, stat via `command -v` equivalent; else use `which`.
  const env = augmentedPathEnv();
  try {
    const { stdout } = await pExecFile("/bin/sh", ["-c", `command -v ${shellEscape(binary)}`], { env });
    const resolved = stdout.trim();
    if (resolved) return { id, installed: true, path: resolved, binary };
  } catch {
    // fall through
  }
  return { id, installed: false, binary };
}

function shellEscape(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

function augmentedPathEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  const extras = [
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    `${process.env.HOME ?? ""}/.local/bin`,
    `${process.env.HOME ?? ""}/.bun/bin`,
    `${process.env.HOME ?? ""}/.cargo/bin`,
    `${process.env.HOME ?? ""}/bin`,
  ].filter(Boolean);
  const existing = (env.PATH ?? "").split(":").filter(Boolean);
  const merged = Array.from(new Set([...existing, ...extras])).join(":");
  env.PATH = merged;
  return env;
}
