export const PSF_RULE_IDS = [
  'no-wiki-links',
  'log-shape',
  'index-shape',
  'reserved-casing',
  'frontmatter-required',
  'frontmatter-recommended',
  'frontmatter-provenance',
  'frontmatter-computation',
  'frontmatter-reserved-index',
  'frontmatter-root-index',
  'project-no-mdx',
] as const;

export type PsfRuleId = (typeof PSF_RULE_IDS)[number];

export type PsfRuleToggles = Partial<Record<PsfRuleId, boolean>> | undefined;

export function isPsfRuleEnabled(rules: PsfRuleToggles, id: PsfRuleId): boolean {
  return rules?.[id] !== false;
}

export const PSF_RULE_GROUPS = [
  { id: 'structure', ids: ['no-wiki-links', 'log-shape', 'index-shape', 'reserved-casing'] },
  {
    id: 'frontmatter',
    ids: [
      'frontmatter-required',
      'frontmatter-recommended',
      'frontmatter-provenance',
      'frontmatter-computation',
      'frontmatter-reserved-index',
      'frontmatter-root-index',
    ],
  },
  {
    id: 'project',
    ids: ['project-no-mdx'],
  },
] as const satisfies readonly { id: string; ids: readonly PsfRuleId[] }[];

export type PsfRuleGroupId = (typeof PSF_RULE_GROUPS)[number]['id'];

export function assertNeverPsfRuleId(value: never): never {
  throw new Error(`Unhandled PsfRuleId variant: ${JSON.stringify(value as unknown)}`);
}

export function assertNeverPsfRuleGroupId(value: never): never {
  throw new Error(`Unhandled PsfRuleGroupId variant: ${JSON.stringify(value as unknown)}`);
}
