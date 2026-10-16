import type { PsfRuleId } from '../psf-rule-meta.ts';

export const PSF_SCHEMA_DIR = '.ps/psf';

export function fileNameFor(ruleId: PsfRuleId): string {
  return `${ruleId.replace(/^frontmatter-/, '')}.schema.json`;
}

export function psfSchemaPathFor(ruleId: PsfRuleId): string {
  return `${PSF_SCHEMA_DIR}/${fileNameFor(ruleId)}`;
}
