import type { OkfRuleId } from '../psf-rule-meta.ts';

export const PSF_SCHEMA_DIR = '.ps/psf';

export function fileNameFor(ruleId: OkfRuleId): string {
  return `${ruleId.replace(/^frontmatter-/, '')}.schema.json`;
}

export function psfSchemaPathFor(ruleId: OkfRuleId): string {
  return `${PSF_SCHEMA_DIR}/${fileNameFor(ruleId)}`;
}
