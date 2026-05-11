import { App, Notice, TFile, normalizePath } from "obsidian";
import { showActionableNotice, type ActionableNoticeOptions } from "./actionableNotices";
import { currentProjectsRoot, scratchFilePath } from "./projectPaths";

export const NOTIFICATION_LOG_PATH = scratchFilePath("op-notifications.md");
export const MAX_LOG_ENTRIES = 500;

const HEADER =
  "# op notifications\n\n" +
  "Most recent first. Capped at the latest " +
  MAX_LOG_ENTRIES +
  " entries.\n";

export interface NotificationEntry {
  timestamp: Date;
  text: string;
  category?: string;
}

// Pure formatting — exported so tests don't need a vault.
export function formatLine(entry: NotificationEntry): string {
  const iso = entry.timestamp.toISOString();
  const cat = entry.category ? ` [${entry.category}]` : "";
  // Each entry is a single bullet line.
  // 1. Strip null bytes — they corrupt vault files.
  // 2. Strip ANSI CSI sequences (e.g. colour codes: ESC [ … m).
  // 3. Strip other single-char ESC sequences (e.g. ESC M, ESC =).
  // 4. Collapse internal whitespace so multi-line Notice text (newlines, tabs,
  //    embedded "- bullets") doesn't fragment the log structure.
  const safe = entry.text
    .replace(/\0/g, "")
    .replace(/\x1b\[[0-9;]*[A-Za-z]/g, "")
    .replace(/\x1b[^[]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return `- ${iso}${cat} · ${safe}`;
}

// Pure: produce the next file body given the prior body and a new entry.
// Newest entries first. Caps at `max` total bullet lines.
export function buildLog(
  existing: string,
  entry: NotificationEntry,
  max = MAX_LOG_ENTRIES,
): string {
  const newLine = formatLine(entry);
  const priorLines = existing.split("\n").filter((l) => l.startsWith("- "));
  const all = [newLine, ...priorLines].slice(0, max);
  return `${HEADER}\n${all.join("\n")}\n`;
}

// Module-level app + write queue so `notify(text)` stays a one-liner at
// call sites. The app is registered once in main.ts onload; callers in
// non-Obsidian contexts (or before onload) get a no-op log write.
let registeredApp: App | undefined;
let writeQueue: Promise<void> = Promise.resolve();

export function registerApp(app: App): void {
  registeredApp = app;
}

export function unregisterApp(): void {
  registeredApp = undefined;
}

// Test helper — mirrors `errorLog.ts`'s implicit "single source of truth"
// shape. Resets module state between tests.
export function _resetForTests(): void {
  registeredApp = undefined;
  writeQueue = Promise.resolve();
}

export function appendNotification(
  app: App,
  text: string,
  opts?: { category?: string; timestamp?: Date },
): Promise<void> {
  const entry: NotificationEntry = {
    timestamp: opts?.timestamp ?? new Date(),
    text,
    category: opts?.category,
  };
  // Serialize writes — Notices fire close together at session start
  // (settings load, vault scan); concurrent read-modify-write would race.
  writeQueue = writeQueue.catch(() => {}).then(() => writeOnce(app, entry));
  return writeQueue;
}

async function writeOnce(app: App, entry: NotificationEntry): Promise<void> {
  const path = normalizePath(
    scratchFilePath("op-notifications.md", currentProjectsRoot(app)),
  );
  const folder = path.split("/").slice(0, -1).join("/");
  if (folder && !(await app.vault.adapter.exists(folder))) {
    await app.vault.createFolder(folder).catch(() => {});
  }
  const existing = app.vault.getAbstractFileByPath(path);
  let body = "";
  if (existing instanceof TFile) {
    body = await app.vault.read(existing);
  }
  const next = buildLog(body, entry);
  if (existing instanceof TFile) {
    await app.vault.modify(existing, next);
  } else {
    await app.vault.create(path, next);
  }
}

// Show a Notice and persist it to the log. Drop-in replacement for
// `new Notice(text, durationMs)`. Defaults to 10 s so notices don't linger
// indefinitely; pass 0 for a persistent (sticky) notice.
export function notify(text: string, durationMs = 10_000): Notice {
  const n = new Notice(text, durationMs);
  if (registeredApp) void appendNotification(registeredApp, text);
  return n;
}

// Show an actionable Notice and persist text + action labels.
export function notifyAction(opts: ActionableNoticeOptions): Notice {
  const n = showActionableNotice(opts);
  if (registeredApp) {
    const labels = (opts.actions ?? []).map((a) => `[${a.label}]`).join(" ");
    const logged = labels ? `${opts.text} · ${labels}` : opts.text;
    void appendNotification(registeredApp, logged);
  }
  return n;
}

export async function openNotificationLog(app: App): Promise<void> {
  const path = normalizePath(
    scratchFilePath("op-notifications.md", currentProjectsRoot(app)),
  );
  const existing = app.vault.getAbstractFileByPath(path);
  if (existing instanceof TFile) {
    await app.workspace.getLeaf(false).openFile(existing);
    return;
  }
  // No log yet — create an empty one so the palette command always has
  // something to open. Beats a silent no-op when the user goes hunting.
  // If a concurrent `writeOnce` wins the race and creates the file first,
  // `vault.create` will throw; catch that and fall back to the now-existing file.
  const folder = path.split("/").slice(0, -1).join("/");
  if (folder && !(await app.vault.adapter.exists(folder))) {
    await app.vault.createFolder(folder).catch(() => {});
  }
  const placeholder = `${HEADER}\n_No notifications recorded yet._\n`;
  let target: TFile;
  try {
    target = await app.vault.create(path, placeholder);
  } catch {
    // Concurrent write already created the file.
    const raced = app.vault.getAbstractFileByPath(path);
    if (!(raced instanceof TFile)) return; // nothing to open
    target = raced;
  }
  await app.workspace.getLeaf(false).openFile(target);
}
