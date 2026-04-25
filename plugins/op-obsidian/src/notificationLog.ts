import { App, Notice, TFile, normalizePath } from "obsidian";
import { showActionableNotice, type ActionableNoticeOptions } from "./actionableNotices";

export const NOTIFICATION_LOG_PATH = "Projects/_scratch/op-notifications.md";
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
  // Each entry is a single bullet line; collapse internal whitespace so
  // multi-line Notice text doesn't fragment the log shape.
  const safe = entry.text.replace(/\s+/g, " ").trim();
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
  const path = normalizePath(NOTIFICATION_LOG_PATH);
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
// `new Notice(text, durationMs)`.
export function notify(text: string, durationMs?: number): Notice {
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
  const path = normalizePath(NOTIFICATION_LOG_PATH);
  const existing = app.vault.getAbstractFileByPath(path);
  if (existing instanceof TFile) {
    await app.workspace.getLeaf(false).openFile(existing);
    return;
  }
  // No log yet — create an empty one so the palette command always has
  // something to open. Beats a silent no-op when the user goes hunting.
  const folder = path.split("/").slice(0, -1).join("/");
  if (folder && !(await app.vault.adapter.exists(folder))) {
    await app.vault.createFolder(folder).catch(() => {});
  }
  const placeholder = `${HEADER}\n_No notifications recorded yet._\n`;
  const created = await app.vault.create(path, placeholder);
  await app.workspace.getLeaf(false).openFile(created);
}
