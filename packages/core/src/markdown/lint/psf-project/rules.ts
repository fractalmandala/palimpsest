import { SUPPORTED_DOC_EXTENSIONS } from '../../../constants/doc-extensions.ts';
import { isPsfRuleEnabled, type PsfRuleId, type PsfRuleToggles } from '../psf-rule-meta.ts';

export interface PsfProjectFinding {
  readonly file: string;
  readonly code: PsfRuleId;
  readonly message: string;
}

function splitName(path: string): { stem: string; ext: string } {
  const base = path.slice(path.lastIndexOf('/') + 1);
  const dot = base.lastIndexOf('.');
  if (dot <= 0) return { stem: base, ext: '' };
  return { stem: base.slice(0, dot), ext: base.slice(dot) };
}

function noMdx(paths: readonly string[]): PsfProjectFinding[] {
  const mdStems = new Set(
    paths
      .filter((path) => splitName(path).ext.toLowerCase() === '.md')
      .map((path) => path.slice(0, path.lastIndexOf('.'))),
  );
  const findings: PsfProjectFinding[] = [];
  for (const path of paths) {
    if (splitName(path).ext.toLowerCase() !== '.mdx') continue;
    const stem = path.slice(0, path.lastIndexOf('.'));
    const lead = `"${path}" won't be picked up by an OpenKnowledge Format consumer — the format is .md-only, and nothing scanning for .md files will open an .mdx.`;
    findings.push({
      file: path,
      code: 'project-no-mdx',
      message: mdStems.has(stem)
        ? `${lead} It is also shadowed by "${stem}.md", so a consumer reads that file instead and gets different content than this project shows you.`
        : lead,
    });
  }
  return findings;
}

export interface PsfProjectRule {
  readonly id: PsfRuleId;
  readonly run: (paths: readonly string[]) => PsfProjectFinding[];
}

export const PSF_PROJECT_REGISTRY: readonly PsfProjectRule[] = [
  { id: 'project-no-mdx', run: noMdx },
];

export function runPsfProjectRules(
  paths: readonly string[],
  rules: PsfRuleToggles,
): PsfProjectFinding[] {
  const docs = paths.filter((path) =>
    SUPPORTED_DOC_EXTENSIONS.some((ext) => path.toLowerCase().endsWith(ext)),
  );
  if (docs.length === 0) return [];
  return PSF_PROJECT_REGISTRY.filter((rule) => isPsfRuleEnabled(rules, rule.id)).flatMap((rule) =>
    rule.run(docs),
  );
}
