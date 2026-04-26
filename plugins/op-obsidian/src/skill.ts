import manual from "./skill/manual.md";

export const SKILL_NAMES = ["skill"] as const;
export type SkillName = (typeof SKILL_NAMES)[number];

const CONTENT: Record<SkillName, string> = {
  skill: manual,
};

export interface GetSkillResult {
  name: SkillName;
  content: string;
  size: number;
}

export function getSkill(name: string): GetSkillResult {
  const trimmed = name.trim();
  const target = trimmed === "" ? "skill" : trimmed;
  if (!isSkillName(target)) {
    throw new Error(
      `op-get-skill: unknown name ${JSON.stringify(target)} (expected one of ${SKILL_NAMES.join("|")})`,
    );
  }
  const content = CONTENT[target];
  return { name: target, content, size: content.length };
}

function isSkillName(v: string): v is SkillName {
  return (SKILL_NAMES as readonly string[]).includes(v);
}
