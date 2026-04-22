export type IssueStatus = "open" | "in-progress" | "blocked" | "resolved" | "wontfix";
export type TaskStatus = "pending" | "in-progress" | "completed" | "blocked";
export type EntryType = "issue" | "task" | "doc" | "project-status";

export interface IssueEntry {
  path: string;
  type: "issue";
  id: string;
  project: string;
  status: IssueStatus;
  priority?: "low" | "med" | "high";
  created?: string;
  resolved?: string;
  assignee?: string;
  commits?: string[];
  pr?: string;
  githubIssue?: string;
  title: string;
  resolvedFolder: boolean;
}

export interface TaskEntry {
  path: string;
  type: "task";
  id: string;
  issueLink?: string;
  project: string;
  status: TaskStatus;
  title: string;
}

export type StoreEntry = IssueEntry | TaskEntry;

export type LifecycleEvent =
  | { kind: "issue:created"; entry: IssueEntry }
  | { kind: "issue:updated"; entry: IssueEntry; prev: IssueEntry }
  | { kind: "issue:status-changed"; entry: IssueEntry; prev: IssueStatus }
  | { kind: "issue:deleted"; path: string; prev: IssueEntry }
  | { kind: "task:created"; entry: TaskEntry }
  | { kind: "task:updated"; entry: TaskEntry; prev: TaskEntry }
  | { kind: "task:status-changed"; entry: TaskEntry; prev: TaskStatus }
  | { kind: "task:deleted"; path: string; prev: TaskEntry };

export type LifecycleEventKind = LifecycleEvent["kind"];
