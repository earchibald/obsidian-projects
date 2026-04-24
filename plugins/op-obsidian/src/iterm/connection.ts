import { ITermTransport, type TransportOptions, type WebSocketFactory } from "./transport";
import {
  API_SOCKET_PATH,
  CookieAndKey,
  clearCachedCookie,
  loadCachedCookie,
  requestCookieAndKey,
  saveCachedCookie,
  type SafeStorageLike,
} from "./cookie";

// Module-level singleton ITermTransport. The cookie/key pair is loaded from a
// `safeStorage`-encrypted cache on the filesystem when available; on cache
// miss (or on a transport auth-reject) we fall back to the one-shot
// AppleScript prompt and re-populate the cache.

const APP_NAME = "op-obsidian";

interface ConnectionState {
  transport: ITermTransport;
  cookie: CookieAndKey;
  socketPath: string;
}

let state: ConnectionState | null = null;
let connectInflight: Promise<ConnectionState> | null = null;

export interface ConnectionOptions {
  appName?: string;
  version: string;
  cachePath?: string;
  wsFactory?: WebSocketFactory;
  safeStorage?: SafeStorageLike | null;
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
  const socketPath = API_SOCKET_PATH;

  let cookie: CookieAndKey | null = null;
  let fromCache = false;
  if (opts.cachePath) {
    cookie = await loadCachedCookie(opts.cachePath, opts.safeStorage);
    fromCache = cookie !== null;
  }
  if (!cookie) {
    cookie = await requestCookieAndKey(appName);
  }

  try {
    const transport = await buildTransport({ socketPath, cookie, appName, opts });
    if (opts.cachePath && !fromCache) {
      await saveCachedCookie(opts.cachePath, cookie, opts.safeStorage);
    }
    return { transport, cookie, socketPath };
  } catch (err) {
    // Cached cookie could be decrypt-valid but iTerm-invalid (Library wipe,
    // iTerm reinstall, user cleared API authorization). Retry once with a
    // fresh AppleScript prompt.
    if (fromCache) {
      if (opts.cachePath) await clearCachedCookie(opts.cachePath);
      const fresh = await requestCookieAndKey(appName);
      const transport = await buildTransport({ socketPath, cookie: fresh, appName, opts });
      if (opts.cachePath) {
        await saveCachedCookie(opts.cachePath, fresh, opts.safeStorage);
      }
      return { transport, cookie: fresh, socketPath };
    }
    throw err;
  }
}

async function buildTransport(args: {
  socketPath: string;
  cookie: CookieAndKey;
  appName: string;
  opts: ConnectionOptions;
}): Promise<ITermTransport> {
  const transportOpts: TransportOptions = {
    socketPath: args.socketPath,
    cookie: args.cookie.cookie,
    key: args.cookie.key,
    appName: args.appName,
    version: args.opts.version,
    wsFactory: args.opts.wsFactory,
  };
  const transport = new ITermTransport(transportOpts);
  await transport.connect();
  return transport;
}
