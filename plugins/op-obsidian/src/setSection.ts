import { App, TFile } from "obsidian";
import type { IssueEntry } from "./types";
import {
  isSetSectionName,
  normalizeSectionPayload,
  rewriteSection,
  SET_SECTION_NAMES,
  type SetSectionName,
} from "./setSectionPure";

export interface SetSectionOptions {
  append?: boolean;
}

export interface SetSectionResult {
  issueId: string;
  path: string;
  section: SetSectionName;
  content: string;
  replaced: boolean;
  appended: boolean;
}

// Replace (or, when append=true, extend) the issue body's `## <name>` section.
// Restricted to the body sections without a dedicated verb today: Plan, Notes,
// Summary. Frontmatter, the optional `# Title`, and any other H2 sections are
// preserved. Payload must not contain an H2 — that would terminate the section.
export async function setSection(
  app: App,
  entry: IssueEntry,
  name: string,
  content: string,
  options: SetSectionOptions = {},
): Promise<SetSectionResult> {
  if (!isSetSectionName(name)) {
    throw new Error(
      `op-set-section: name must be one of ${SET_SECTION_NAMES.join("|")} (got ${JSON.stringify(name)})`,
    );
  }
  const payload = normalizeSectionPayload(content, name);
  const file = requireFile(app, entry.path);
  const text = await app.vault.read(file);
  const { next, replaced, appended } = rewriteSection(text, name, payload, {
    append: options.append === true,
  });
  if (next !== text) {
    await app.vault.modify(file, next);
  }
  return {
    issueId: entry.id,
    path: entry.path,
    section: name,
    content: payload,
    replaced,
    appended,
  };
}

function requireFile(app: App, path: string): TFile {
  const f = app.vault.getAbstractFileByPath(path);
  if (!(f instanceof TFile)) throw new Error(`Issue file not found on disk: ${path}`);
  return f;
}
