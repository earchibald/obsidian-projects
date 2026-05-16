// OP-192: pure helpers for emitting `lazy: true` workflow modules as Claude
// Code skills. No I/O — `emitLazySkills.ts` owns filesystem writes.

/**
 * Derive a Claude-Code-valid skill name from a module id. Claude Code skill
 * names: lowercase letters, digits, hyphens only; max 64 chars. The
 * `op-module-` prefix namespaces emitted skills away from the canonical `op`
 * skill so the agent's skill list is unambiguous.
 */
export function slugifySkillName(id: string): string {
  const slug = `op-module-${id}`
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.slice(0, 64).replace(/-+$/g, "");
}

export interface RenderSkillMdArgs {
  name: string;
  description: string;
  body: string;
}

/**
 * Render a SKILL.md document. `description` is emitted as a YAML double-quoted
 * scalar with `\`, `"`, and newlines escaped so an arbitrary one-liner can
 * never corrupt the frontmatter. Body is appended verbatim with a single
 * trailing newline.
 */
export function renderSkillMd(args: RenderSkillMdArgs): string {
  const desc = args.description
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n");
  const body = args.body.replace(/\n+$/, "");
  return `---\nname: ${args.name}\ndescription: "${desc}"\n---\n\n${body}\n`;
}
