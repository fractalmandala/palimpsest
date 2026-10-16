import { isPsfRuleEnabled, type PsfRuleId, type PsfRuleToggles } from './psf-rule-meta.ts';
import type { PsfRule } from './psf-runner.ts';
import { indexShape } from './rules/index-shape.ts';
import { logShape } from './rules/log-shape.ts';
import { noWikiLinks } from './rules/no-wiki-links.ts';
import { reservedCasing } from './rules/reserved-casing.ts';

interface PsfRuleEntry {
  readonly id: PsfRuleId;
  readonly rule: PsfRule;
}

export const PSF_RULE_REGISTRY: readonly PsfRuleEntry[] = [
  { id: 'no-wiki-links', rule: noWikiLinks },
  { id: 'log-shape', rule: logShape },
  { id: 'index-shape', rule: indexShape },
  { id: 'reserved-casing', rule: reservedCasing },
];

const ALL_OKF_RULES: readonly PsfRule[] = PSF_RULE_REGISTRY.map((entry) => entry.rule);

export function selectEnabledPsfRules(rules: PsfRuleToggles): readonly PsfRule[] {
  if (rules === undefined) return ALL_OKF_RULES;
  return PSF_RULE_REGISTRY.filter((entry) => isPsfRuleEnabled(rules, entry.id)).map(
    (entry) => entry.rule,
  );
}
