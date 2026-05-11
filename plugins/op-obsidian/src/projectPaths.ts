import type { App } from "obsidian";

export const DEFAULT_PROJECTS_ROOT = "Projects";

export interface ProjectsRootSettingsLike {
  projectsRoot?: string;
}

export type ProjectsRootValidation =
  | { ok: true; value: string }
  | { ok: false; error: string };

export function normalizeProjectsRoot(raw: string | null | undefined): string {
  const normalized = normalizeVaultRelativePath(raw ?? "");
  return normalized || DEFAULT_PROJECTS_ROOT;
}

export function validateProjectsRootInput(raw: string): ProjectsRootValidation {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "Projects path is required" };
  }
  if (trimmed.startsWith("/")) {
    return { ok: false, error: "Projects path must be vault-relative, not absolute" };
  }
  const parts = trimmed.replace(/\\/g, "/").split("/").map((part) => part.trim()).filter(Boolean);
  if (parts.some((part) => part === "..")) {
    return { ok: false, error: "Projects path must stay inside the vault" };
  }
  const normalized = normalizeVaultRelativePath(trimmed);
  if (!normalized) {
    return { ok: false, error: "Projects path must stay inside the vault" };
  }
  return { ok: true, value: normalized };
}

export function projectsRootFromApp(app: App | null | undefined): string {
  const raw = app && typeof app === "object"
    ? (app as App & {
        plugins?: { plugins?: Record<string, { settings?: ProjectsRootSettingsLike }> };
      }).plugins?.plugins?.["op-obsidian"]?.settings?.projectsRoot
    : undefined;
  return normalizeProjectsRoot(raw);
}

export function currentProjectsRoot(
  app?: App | null,
  settings?: ProjectsRootSettingsLike | null,
): string {
  return settings?.projectsRoot !== undefined
    ? normalizeProjectsRoot(settings.projectsRoot)
    : projectsRootFromApp(app);
}

export function isWithinProjectsRoot(path: string, root = DEFAULT_PROJECTS_ROOT): boolean {
  const normalizedPath = normalizeVaultRelativePath(path);
  const normalizedRoot = normalizeProjectsRoot(root);
  return normalizedPath === normalizedRoot || normalizedPath.startsWith(`${normalizedRoot}/`);
}

export function projectFolderPath(slug: string, root = DEFAULT_PROJECTS_ROOT): string {
  return joinVaultPath(normalizeProjectsRoot(root), slug.trim());
}

export function statusPathFor(slug: string, root = DEFAULT_PROJECTS_ROOT): string {
  return joinVaultPath(projectFolderPath(slug, root), "STATUS.md");
}

export function workflowPathForProject(slug: string, root = DEFAULT_PROJECTS_ROOT): string {
  return joinVaultPath(projectFolderPath(slug, root), "WORKFLOW.md");
}

export function issuesFolderPath(slug: string, root = DEFAULT_PROJECTS_ROOT): string {
  return joinVaultPath(projectFolderPath(slug, root), "ISSUES");
}

export function resolvedIssuesFolderPath(slug: string, root = DEFAULT_PROJECTS_ROOT): string {
  return joinVaultPath(projectFolderPath(slug, root), "RESOLVED ISSUES");
}

export function tasksFolderPath(slug: string, root = DEFAULT_PROJECTS_ROOT): string {
  return joinVaultPath(projectFolderPath(slug, root), "TASKS");
}

export function docsFolderPath(slug: string, root = DEFAULT_PROJECTS_ROOT): string {
  return joinVaultPath(projectFolderPath(slug, root), "DOCS");
}

export function modulesFolderPath(slug: string, root = DEFAULT_PROJECTS_ROOT): string {
  return joinVaultPath(projectFolderPath(slug, root), "MODULES");
}

export function globalModulesDirPath(root = DEFAULT_PROJECTS_ROOT): string {
  return joinVaultPath(normalizeProjectsRoot(root), "_op-modules");
}

export function globalModulePath(moduleId: string, root = DEFAULT_PROJECTS_ROOT): string {
  return joinVaultPath(globalModulesDirPath(root), `${moduleId.trim()}.md`);
}

export function exportDirPath(root = DEFAULT_PROJECTS_ROOT): string {
  return joinVaultPath(normalizeProjectsRoot(root), "_op-export");
}

export function importHistoryDirPath(root = DEFAULT_PROJECTS_ROOT): string {
  return joinVaultPath(normalizeProjectsRoot(root), "_op-import-history");
}

export function scratchDirPath(root = DEFAULT_PROJECTS_ROOT): string {
  return joinVaultPath(normalizeProjectsRoot(root), "_scratch");
}

export function scratchFilePath(filename: string, root = DEFAULT_PROJECTS_ROOT): string {
  return joinVaultPath(scratchDirPath(root), filename);
}

export function onboardingReadmePath(root = DEFAULT_PROJECTS_ROOT): string {
  return joinVaultPath(normalizeProjectsRoot(root), "_op-readme.md");
}

export function demoProjectFolderPath(root = DEFAULT_PROJECTS_ROOT): string {
  return projectFolderPath("op-demo", root);
}

export function projectFolderFromStatusPath(path: string): string | undefined {
  const normalized = normalizeVaultRelativePath(path);
  const suffix = "/STATUS.md";
  return normalized.endsWith(suffix) ? normalized.slice(0, -suffix.length) : undefined;
}

export function projectFolderFromManagedNotePath(path: string): string | undefined {
  const normalized = normalizeVaultRelativePath(path);
  for (const marker of ["/ISSUES/", "/RESOLVED ISSUES/", "/TASKS/", "/DOCS/", "/MODULES/"]) {
    const index = normalized.indexOf(marker);
    if (index !== -1) {
      return normalized.slice(0, index);
    }
  }
  return projectFolderFromStatusPath(normalized);
}

export function projectSlugFromFolder(path: string): string | undefined {
  const normalized = normalizeVaultRelativePath(path);
  if (!normalized) return undefined;
  const parts = normalized.split("/");
  const slug = parts[parts.length - 1];
  return slug || undefined;
}

export function joinVaultPath(...segments: Array<string | null | undefined>): string {
  const out: string[] = [];
  for (const segment of segments) {
    if (!segment) continue;
    const normalized = normalizeVaultRelativePath(segment);
    if (!normalized) continue;
    out.push(...normalized.split("/"));
  }
  return out.join("/");
}

function normalizeVaultRelativePath(raw: string): string {
  const parts = raw
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const part of parts) {
    if (part === ".") continue;
    if (part === "..") {
      if (out.length === 0) return "";
      out.pop();
      continue;
    }
    out.push(part);
  }
  return out.join("/");
}
