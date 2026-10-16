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

export type OkfRuleId = (typeof PSF_RULE_IDS)[number];

export type OkfRuleToggles = Partial<Record<OkfRuleId, boolean>> | undefined;

export function isOkfRuleEnabled(rules: OkfRuleToggles, id: OkfRuleId): boolean {
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
] as const satisfies readonly { id: string; ids: readonly OkfRuleId[] }[];

export type OkfRuleGroupId = (typeof PSF_RULE_GROUPS)[number]['id'];

export function assertNeverOkfRuleId(value: never): never {
  throw new Error(`Unhandled OkfRuleId variant: ${JSON.stringify(value as unknown)}`);
}

export function assertNeverOkfRuleGroupId(value: never): never {
  throw new Error(`Unhandled OkfRuleGroupId variant: ${JSON.stringify(value as unknown)}`);
}
