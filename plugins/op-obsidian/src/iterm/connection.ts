import { ITermTransport, type TransportOptions, type WebSocketFactory } from "./transport";
import { CookieAndKey, readApiPort, requestCookieAndKey } from "./cookie";

// Module-level singleton ITermTransport. The cookie/key pair is fetched lazily
// from iTerm via AppleScript on first use; the result is cached in-memory for
// the life of the renderer. A persistent safeStorage cache will land in a
// later step (the prompt is mildly annoying on every plugin reload but
// acceptable for the dev-toggle smoke test in OP-101 Step 2).

const APP_NAME = "op-obsidian";

interface ConnectionState {
  transport: ITermTransport;
  cookie: CookieAndKey;
  port: number;
}

let state: ConnectionState | null = null;
let connectInflight: Promise<ConnectionState> | null = null;

export interface ConnectionOptions {
  appName?: string;
  version: string;
  wsFactory?: WebSocketFactory;
}

export async function getTransport(opts: ConnectionOptions): Promise<ITermTransport> {
  if (state) return state.transport;
  if (!connectInflight) connectInflight = openConnection(opts);
  try {
    state = await connectInflight;
    return state.transport;
  } finally {
    connectInflight = null;
  }
}

export function closeTransport(): void {
  if (state) {
    state.transport.close();
    state = null;
  }
}

// Test helper: inject pre-built state so tests don't have to stand up a real
// transport or AppleScript-prompt cycle.
export function __setStateForTests(injected: ConnectionState | null): void {
  state = injected;
}

async function openConnection(opts: ConnectionOptions): Promise<ConnectionState> {
  const appName = opts.appName ?? APP_NAME;
  const port = await readApiPort();
  const cookie = await requestCookieAndKey(appName);
  const transportOpts: TransportOptions = {
    port,
    cookie: cookie.cookie,
    key: cookie.key,
    appName,
    version: opts.version,
    wsFactory: opts.wsFactory,
  };
  const transport = new ITermTransport(transportOpts);
  await transport.connect();
  return { transport, cookie, port };
}
