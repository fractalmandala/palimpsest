import type { LintPluginId } from '@palimpsest/core/markdown/lint';

export interface LintPluginMeta {
  id: LintPluginId;
  label: string;
  docUrl: string;
  beta?: boolean;
  recommendedSkills?: readonly { packId: string; name: string }[];
}

const DOCS_BASE = 'https://github.com/fractalmandala/palimpsest/tree/main/docs/content';

export const LINT_PLUGIN_META: LintPluginMeta[] = [
  { id: 'markdownlint', label: 'markdownlint', docUrl: `${DOCS_BASE}/markdownlint` },
  {
    id: 'frontmatter',
    // oxlint-disable-next-line ok/no-unwrapped-user-facing-string -- names the frontmatter plugin, and `frontmatter` is a GLOSSARY never-translate term — this label is the plugin's name beside `markdownlint`, not copy.
    label: 'Frontmatter schemas',
    docUrl: `${DOCS_BASE}/frontmatter`,
  },
  {
    id: 'psf',
    label: 'OKF',
    docUrl: 'https://github.com/fractalmandala/palimpsest/blob/main/docs/content/plugins/psf.mdx',
    beta: true,
    recommendedSkills: [{ packId: 'psf', name: 'psf-knowledge-base' }],
  },
];
